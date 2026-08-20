import pool from "../db";

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
 * Update hazard status (GovOps lifecycle: active -> in_progress -> resolved)
 */
export async function updateHazardStatus(
  id: number,
  status: "active" | "in_progress" | "resolved",
  userId: number
): Promise<HazardRecord | null> {
  const isResolving = status === "resolved";

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
