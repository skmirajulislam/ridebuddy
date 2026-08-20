import pool from "../db";
import { generateUniqueHandle } from "../utils/handle";
import { deleteUploadThingFile } from "./uploadthing.service";

export interface UserDashboardData {
  user_id: number;
  name: string;
  email: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  hobbies: string[];
  total_reports: number;
  achievement: {
    current: number | null;
    next: number | null;
    reached: number[];
    title: string | null;
  };
}

export interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  role: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  hobbies: string[];
  total_reports: number;
  achievement: {
    current: number | null;
    next: number | null;
    reached: number[];
    title: string | null;
  };
  created_at: string;
}

export interface PublicUserProfile {
  id: number;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  hobbies: string[];
  total_reports: number;
  achievement: {
    current: number | null;
    next: number | null;
    reached: number[];
    title: string | null;
  };
  created_at: string;
}

const ACHIEVEMENT_MILESTONES = [10, 25, 50, 100, 200, 500, 1000];

export function getAchievement(totalReports: number) {
  const reached = ACHIEVEMENT_MILESTONES.filter((m) => totalReports >= m);
  const current = reached.length ? reached[reached.length - 1] : null;
  const next = ACHIEVEMENT_MILESTONES.find((m) => m > totalReports) ?? null;

  let title = null;
  if (current) {
    if (current >= 500) title = "Legendary Road Guardian";
    else if (current >= 200) title = "Master Navigator";
    else if (current >= 100) title = "Veteran Scout";
    else if (current >= 50) title = "50+ Hazard Sentinel";
    else if (current >= 25) title = "Active Pathfinder";
    else title = "Community Contributor";
  }

  return {
    current,
    next,
    reached,
    title,
  };
}

/**
 * Get private user dashboard data
 */
export async function getUserDashboard(userId: number): Promise<UserDashboardData | null> {
  const result = await pool.query(
    `SELECT u.id AS user_id, u.name, u.email, u.handle, u.avatar_url, u.bio,
            COALESCE(u.hobbies, '{}') AS hobbies,
            COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
     FROM users u
     LEFT JOIN hazards h ON h.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.name, u.email, u.handle, u.avatar_url, u.bio, u.hobbies, u.hazard_reports_count`,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  const totalReports = Number(row.total_reports || 0);

  return {
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    handle: row.handle,
    avatar_url: row.avatar_url,
    bio: row.bio,
    hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
    total_reports: totalReports,
    achievement: getAchievement(totalReports),
  };
}

/**
 * Get full user profile
 */
export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.handle, u.avatar_url, u.bio,
            COALESCE(u.hobbies, '{}') AS hobbies, u.created_at,
            COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
     FROM users u
     LEFT JOIN hazards h ON h.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.name, u.email, u.role, u.handle, u.avatar_url, u.bio, u.hobbies, u.created_at, u.hazard_reports_count`,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  let handle = row.handle;

  // Auto-generate if legacy user without handle
  if (!handle) {
    handle = await generateUniqueHandle(row.name || row.email || "user");
    await pool.query("UPDATE users SET handle = $1 WHERE id = $2", [handle, userId]);
  }

  const totalReports = Number(row.total_reports || 0);

  return {
    id: row.id,
    name: row.name || "RideBuddy Contributor",
    email: row.email,
    role: row.role || "user",
    handle,
    avatar_url: row.avatar_url,
    bio: row.bio,
    hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
    total_reports: totalReports,
    achievement: getAchievement(totalReports),
    created_at: row.created_at,
  };
}

/**
 * Get public profile by handle or user id
 */
export async function getPublicUserProfile(handleOrId: string | number): Promise<PublicUserProfile | null> {
  const isNumeric = typeof handleOrId === "number" || /^\d+$/.test(String(handleOrId));

  const result = await pool.query(
    `SELECT u.id, u.name, u.handle, u.avatar_url, u.bio,
            COALESCE(u.hobbies, '{}') AS hobbies, u.created_at,
            COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
     FROM users u
     LEFT JOIN hazards h ON h.user_id = u.id
     WHERE ${isNumeric ? "u.id = $1" : "LOWER(u.handle) = LOWER($1)"}
     GROUP BY u.id, u.name, u.handle, u.avatar_url, u.bio, u.hobbies, u.created_at, u.hazard_reports_count`,
    [isNumeric ? Number(handleOrId) : String(handleOrId).replace(/^@/, "")]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  const totalReports = Number(row.total_reports || 0);

  return {
    id: row.id,
    name: row.name || "RideBuddy Contributor",
    handle: row.handle || `rider_${row.id}`,
    avatar_url: row.avatar_url,
    bio: row.bio,
    hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
    total_reports: totalReports,
    achievement: getAchievement(totalReports),
    created_at: row.created_at,
  };
}

/**
 * Update user profile details
 */
export async function updateUserProfile(
  userId: number,
  updates: {
    name?: string;
    avatar_url?: string | null;
    bio?: string | null;
    hobbies?: string[];
  }
): Promise<UserProfile | null> {
  const current = await getUserProfile(userId);
  if (!current) return null;

  const newName = updates.name !== undefined ? updates.name.trim() : current.name;
  const newAvatar = updates.avatar_url !== undefined ? updates.avatar_url : current.avatar_url;
  const newBio = updates.bio !== undefined ? updates.bio : current.bio;
  const newHobbies = updates.hobbies !== undefined ? updates.hobbies : current.hobbies;

  // If avatar is being replaced or removed, safely delete the previous image from UploadThing storage
  if (
    updates.avatar_url !== undefined &&
    updates.avatar_url !== current.avatar_url &&
    current.avatar_url
  ) {
    console.log(`[User] Replacing avatar for user ${userId}. Deleting old avatar from UploadThing...`);
    await deleteUploadThingFile(current.avatar_url);
  }

  await pool.query(
    `UPDATE users
     SET name = $1,
         avatar_url = $2,
         bio = $3,
         hobbies = $4
     WHERE id = $5`,
    [newName, newAvatar, newBio, newHobbies, userId]
  );

  return getUserProfile(userId);
}
