import pool from "../db";
import { deleteUploadThingFile } from "./uploadthing.service";

export interface HazardRecord {
  id: number;
  type: string;
  lat: number;
  lng: number;
  severity: number;
  status: "active" | "in_progress" | "resolved";
  confidence: number | null;
  verified: boolean;
  user_id: number | null;
  image_url?: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by_user_id: number | null;
  distance_meters?: number;
  reporter_name?: string | null;
  reporter_handle?: string | null;
  reporter_avatar?: string | null;
  reporter_bio?: string | null;
  reporter_hobbies?: string[];
}

export interface CreateHazardParams {
  type: string;
  lat: number;
  lng: number;
  severity?: number;
  user_id?: number | null;
  confidence?: number | null;
  image_url?: string | null;
}

export interface GetHazardsFilter {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface GovStats {
  total: string;
  active: string;
  in_progress: string;
  resolved: string;
}

/**
 * Insert a new hazard and increment user hazard report count
 */
export async function createHazard(params: CreateHazardParams): Promise<HazardRecord> {
  const { type, lat, lng, severity = 1, user_id = null, confidence = null, image_url = null } = params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<HazardRecord>(
      `INSERT INTO hazards (type, lat, lng, severity, user_id, confidence, verified, status, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'active', $7)
       RETURNING *`,
      [type, lat, lng, severity, user_id, confidence, image_url]
    );

    const created = result.rows[0];

    // Increment user report counter if user_id is provided
    if (user_id != null) {
      try {
        await client.query(
          `UPDATE users
           SET hazard_reports_count = COALESCE(hazard_reports_count, 0) + 1
           WHERE id = $1`,
          [user_id]
        );
      } catch (err: unknown) {
        // If column doesn't exist in legacy schema, ignore gracefully
        const dbErr = err as { code?: string };
        if (dbErr.code !== "42703") {
          throw err;
        }
      }
    }

    await client.query("COMMIT");

    // Retrieve full hazard with reporter profile
    const fullHazard = await pool.query<HazardRecord>(
      `SELECT h.*,
              u.name AS reporter_name,
              u.handle AS reporter_handle,
              u.avatar_url AS reporter_avatar,
              u.bio AS reporter_bio,
              COALESCE(u.hobbies, '{}') AS reporter_hobbies
       FROM hazards h
       LEFT JOIN users u ON h.user_id = u.id
       WHERE h.id = $1`,
      [created.id]
    );

    return fullHazard.rows[0] || created;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check for a duplicate hazard of the SAME TYPE within radiusMeters using Haversine formula
 */
export async function checkDuplicate(
  lat: number,
  lng: number,
  type: string,
  radiusMeters = 30
): Promise<HazardRecord | null> {
  const result = await pool.query<HazardRecord>(
    `SELECT h.*,
      (2 * 6371000 * asin(
        sqrt(
          sin(radians((h.lat - $1) / 2)) ^ 2
          + cos(radians($1)) * cos(radians(h.lat))
          * sin(radians((h.lng - $2) / 2)) ^ 2
        )
      )) AS distance_meters,
      u.name AS reporter_name,
      u.handle AS reporter_handle,
      u.avatar_url AS reporter_avatar
     FROM hazards h
     LEFT JOIN users u ON h.user_id = u.id
     WHERE h.type = $3
       AND h.status != 'resolved'
       AND (2 * 6371000 * asin(
             sqrt(
               sin(radians((h.lat - $1) / 2)) ^ 2
               + cos(radians($1)) * cos(radians(h.lat))
               * sin(radians((h.lng - $2) / 2)) ^ 2
             )
           )) < $4
     ORDER BY distance_meters ASC
     LIMIT 1`,
    [lat, lng, type, radiusMeters]
  );

  return result.rows[0] ?? null;
}

/**
 * Get all hazards or filter by bounding box (includes reporter profiles)
 */
export async function getHazards(filter?: GetHazardsFilter): Promise<HazardRecord[]> {
  if (
    filter?.minLat != null &&
    filter?.maxLat != null &&
    filter?.minLng != null &&
    filter?.maxLng != null
  ) {
    const result = await pool.query<HazardRecord>(
      `SELECT h.*,
              u.name AS reporter_name,
              u.handle AS reporter_handle,
              u.avatar_url AS reporter_avatar,
              u.bio AS reporter_bio,
              COALESCE(u.hobbies, '{}') AS reporter_hobbies
       FROM hazards h
       LEFT JOIN users u ON h.user_id = u.id
       WHERE h.lat BETWEEN $1 AND $2
         AND h.lng BETWEEN $3 AND $4
       ORDER BY h.id DESC`,
      [filter.minLat, filter.maxLat, filter.minLng, filter.maxLng]
    );
    return result.rows;
  }

  const result = await pool.query<HazardRecord>(
    `SELECT h.*,
            u.name AS reporter_name,
            u.handle AS reporter_handle,
            u.avatar_url AS reporter_avatar,
            u.bio AS reporter_bio,
            COALESCE(u.hobbies, '{}') AS reporter_hobbies
     FROM hazards h
     LEFT JOIN users u ON h.user_id = u.id
     ORDER BY h.id DESC`
  );
  return result.rows;
}

/**
 * Get hazards within radiusMeters of a coordinate (includes reporter profiles)
 */
export async function getNearbyHazards(
  lat: number,
  lng: number,
  radiusMeters = 500
): Promise<HazardRecord[]> {
  const result = await pool.query<HazardRecord>(
    `SELECT h.*,
      (2 * 6371000 * asin(
        sqrt(
          sin(radians((h.lat - $1) / 2)) ^ 2
          + cos(radians($1)) * cos(radians(h.lat))
          * sin(radians((h.lng - $2) / 2)) ^ 2
        )
      )) AS distance_meters,
      u.name AS reporter_name,
      u.handle AS reporter_handle,
      u.avatar_url AS reporter_avatar,
      u.bio AS reporter_bio,
      COALESCE(u.hobbies, '{}') AS reporter_hobbies
     FROM hazards h
     LEFT JOIN users u ON h.user_id = u.id
     WHERE (2 * 6371000 * asin(
              sqrt(
                sin(radians((h.lat - $1) / 2)) ^ 2
                + cos(radians($1)) * cos(radians(h.lat))
                * sin(radians((h.lng - $2) / 2)) ^ 2
              )
            )) < $3
     ORDER BY distance_meters ASC`,
    [lat, lng, radiusMeters]
  );
  return result.rows;
}

/**
 * Check if any hazard exists nearby
 */
export async function checkHazardExists(lat: number, lng: number, radiusMeters = 30): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM hazards
     WHERE status != 'resolved'
       AND (2 * 6371000 * asin(
             sqrt(
               sin(radians((lat - $1) / 2)) ^ 2
               + cos(radians($1)) * cos(radians(lat))
               * sin(radians((lng - $2) / 2)) ^ 2
             )
           )) < $3
     LIMIT 1`,
    [lat, lng, radiusMeters]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get all hazards submitted by a specific user (contributions)
 */
export async function getUserHazards(userId: number): Promise<HazardRecord[]> {
  const result = await pool.query<HazardRecord>(
    `SELECT h.*,
            u.name AS reporter_name,
            u.handle AS reporter_handle,
            u.avatar_url AS reporter_avatar,
            u.bio AS reporter_bio,
            COALESCE(u.hobbies, '{}') AS reporter_hobbies
     FROM hazards h
     LEFT JOIN users u ON h.user_id = u.id
     WHERE h.user_id = $1
     ORDER BY h.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Delete a hazard report and remove its image from UploadThing storage
 */
export async function deleteHazard(
  hazardId: number,
  userId: number,
  isOfficial = false
): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch hazard to verify ownership and retrieve image_url
  const hazardRes = await pool.query<HazardRecord>(
    `SELECT * FROM hazards WHERE id = $1`,
    [hazardId]
  );

  if (hazardRes.rowCount === 0) {
    return { success: false, error: "Hazard not found" };
  }

  const hazard = hazardRes.rows[0];

  // 2. Enforce permission: only owner or official/admin can delete
  if (!isOfficial && hazard.user_id !== userId) {
    return { success: false, error: "You can only delete your own reported hazards" };
  }

  // 3. Delete associated image from UploadThing storage if present
  if (hazard.image_url) {
    console.log(`[Hazard] Deleting hazard #${hazardId} image from UploadThing:`, hazard.image_url);
    await deleteUploadThingFile(hazard.image_url);
  }

  // 4. Delete record from database and decrement user report count in a transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM hazards WHERE id = $1`, [hazardId]);

    if (hazard.user_id) {
      await client.query(
        `UPDATE users
         SET hazard_reports_count = GREATEST(0, COALESCE(hazard_reports_count, 1) - 1)
         WHERE id = $1`,
        [hazard.user_id]
      );
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("[Hazard] Deletion error:", (err as Error).message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update hazard status (GovOps lifecycle: active -> in_progress -> resolved)
 */
export async function updateHazardStatus(
  id: number,
  status: "active" | "in_progress" | "resolved",
  userId: number
): Promise<HazardRecord | null> {
  const isResolving = status === "resolved";

  // If resolving, check if there's an image on UploadThing to clean up as requested
  if (isResolving) {
    const existing = await pool.query<HazardRecord>(
      `SELECT image_url FROM hazards WHERE id = $1`,
      [id]
    );
    const imageUrl = existing.rows[0]?.image_url;
    if (imageUrl) {
      console.log(`[Hazard] Hazard #${id} marked resolved. Removing resolved image from UploadThing...`);
      await deleteUploadThingFile(imageUrl);
    }
  }

  const result = await pool.query<HazardRecord>(
    `UPDATE hazards
     SET status              = $1,
         resolved_at         = $2,
         resolved_by_user_id = $3
     WHERE id = $4
     RETURNING *`,
    [status, isResolving ? new Date() : null, isResolving ? userId : null, id]
  );

  return result.rows[0] ?? null;
}

/**
 * Community verification for hazard ("still_there" or "fixed")
 */
export async function verifyHazard(
  hazardId: number,
  userId: number,
  voteType: "still_there" | "fixed"
): Promise<{
  success: boolean;
  upvotes: number;
  fixedVotes: number;
  isResolved: boolean;
  message: string;
}> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check existing verification
    const existing = await client.query(
      `SELECT id, vote_type FROM hazard_verifications WHERE hazard_id = $1 AND user_id = $2`,
      [hazardId, userId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        upvotes: 0,
        fixedVotes: 0,
        isResolved: false,
        message: "You have already verified this hazard report.",
      };
    }

    // Insert verification
    await client.query(
      `INSERT INTO hazard_verifications (hazard_id, user_id, vote_type, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [hazardId, userId, voteType]
    );

    // Update counts on hazard
    let updateQuery = "";
    if (voteType === "still_there") {
      updateQuery = `UPDATE hazards SET upvotes_count = COALESCE(upvotes_count, 0) + 1 WHERE id = $1 RETURNING upvotes_count, fixed_votes_count, user_id, image_url`;
    } else {
      updateQuery = `UPDATE hazards SET fixed_votes_count = COALESCE(fixed_votes_count, 0) + 1 WHERE id = $1 RETURNING upvotes_count, fixed_votes_count, user_id, image_url`;
    }

    const updatedHazard = await client.query(updateQuery, [hazardId]);
    const row = updatedHazard.rows[0];
    const upvotes = Number(row?.upvotes_count || 0);
    const fixedVotes = Number(row?.fixed_votes_count || 0);
    const originalReporterId = row?.user_id;
    const imageUrl = row?.image_url;

    let isResolved = false;

    // Auto-resolve if 3 or more community members vote 'fixed'
    if (voteType === "fixed" && fixedVotes >= 3) {
      await client.query(
        `UPDATE hazards SET status = 'resolved', resolved_at = NOW(), resolved_by_user_id = $1 WHERE id = $2`,
        [userId, hazardId]
      );
      isResolved = true;

      // Clean up cloud storage image
      if (imageUrl) {
        deleteUploadThingFile(imageUrl).catch((e) =>
          console.warn("[Hazard] Auto-prune image failed:", e)
        );
      }
    }

    // Award Karma to verifier (+10) and reporter (+5 if still active)
    await client.query(`UPDATE users SET karma = COALESCE(karma, 50) + 10 WHERE id = $1`, [userId]);
    if (originalReporterId && voteType === "still_there") {
      await client.query(`UPDATE users SET karma = COALESCE(karma, 50) + 5 WHERE id = $1`, [originalReporterId]);
    }

    await client.query("COMMIT");

    return {
      success: true,
      upvotes,
      fixedVotes,
      isResolved,
      message: isResolved
        ? "Community verified! Hazard marked resolved & removed."
        : voteType === "still_there"
        ? "Thank you! Hazard confirmed active on radar (+10 Karma)."
        : "Thank you! Resolution vote recorded (+10 Karma).",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Hazard] Verification error:", err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get aggregate hazard statistics for Government operations
 */
export async function getGovStats(): Promise<GovStats> {
  const result = await pool.query<GovStats>(`
    SELECT
      COUNT(*)::text                                    AS total,
      COUNT(*) FILTER (WHERE status = 'active')::text     AS active,
      COUNT(*) FILTER (WHERE status = 'in_progress')::text AS in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved')::text   AS resolved
    FROM hazards
  `);
  return result.rows[0] ?? { total: "0", active: "0", in_progress: "0", resolved: "0" };
}

