import pool from "../db";
import { generateUniqueHandle } from "../utils/handle";
import { deleteUploadThingFile } from "./uploadthing.service";

export interface UserDashboardData {
  user_id: number;
  name: string;
  email: string | null;
  handle: string | null;
  city: string;
  karma: number;
  badges: string[];
  avatar_url: string | null;
  bio: string | null;
  hobbies: string[];
  emergency_contact: string | null;
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
  city: string;
  karma: number;
  badges: string[];
  avatar_url: string | null;
  bio: string | null;
  hobbies: string[];
  emergency_contact: string | null;
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
  city: string;
  karma: number;
  badges: string[];
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
  const current = reached.length > 0 ? reached[reached.length - 1] : null;
  const next = ACHIEVEMENT_MILESTONES.find((m) => totalReports < m) ?? null;

  let title: string | null = null;
  if (totalReports >= 1000) title = "Legendary Highway Guardian";
  else if (totalReports >= 500) title = "Grand Master Scout";
  else if (totalReports >= 200) title = "Master Route Captain";
  else if (totalReports >= 100) title = "Elite Safety Sentinel";
  else if (totalReports >= 50) title = "Expert Highway Scout";
  else if (totalReports >= 25) title = "Veteran Road Explorer";
  else if (totalReports >= 10) title = "Active Community Sentinel";
  else if (totalReports > 0) title = "Rising Safety Scout";
  else title = "Community Explorer";

  return { current, next, reached, title };
}

/**
 * Get private user dashboard data
 */
export async function getUserDashboard(userId: number): Promise<UserDashboardData | null> {
  const result = await pool.query(
    `SELECT u.id AS user_id, u.name, u.email, u.handle, u.city,
            COALESCE(u.karma, 50) AS karma,
            COALESCE(u.badges, '{"Community Pioneer"}') AS badges,
            u.avatar_url, u.bio, u.emergency_contact,
            COALESCE(u.hobbies, '{}') AS hobbies,
            COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
     FROM users u
     LEFT JOIN hazards h ON h.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.name, u.email, u.handle, u.city, u.karma, u.badges, u.avatar_url, u.bio, u.emergency_contact, u.hobbies, u.hazard_reports_count`,
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
    city: row.city || "Kolkata",
    karma: Number(row.karma || 50),
    badges: Array.isArray(row.badges) ? row.badges : ["Community Pioneer"],
    avatar_url: row.avatar_url,
    bio: row.bio,
    hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
    emergency_contact: row.emergency_contact,
    total_reports: totalReports,
    achievement: getAchievement(totalReports),
  };
}

/**
 * Get full user profile
 */
export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.handle, u.city,
            COALESCE(u.karma, 50) AS karma,
            COALESCE(u.badges, '{"Community Pioneer"}') AS badges,
            u.avatar_url, u.bio, u.emergency_contact,
            COALESCE(u.hobbies, '{}') AS hobbies, u.created_at,
            COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
     FROM users u
     LEFT JOIN hazards h ON h.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.name, u.email, u.role, u.handle, u.city, u.karma, u.badges, u.avatar_url, u.bio, u.emergency_contact, u.hobbies, u.created_at, u.hazard_reports_count`,
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
    city: row.city || "Kolkata",
    karma: Number(row.karma || 50),
    badges: Array.isArray(row.badges) ? row.badges : ["Community Pioneer"],
    avatar_url: row.avatar_url,
    bio: row.bio,
    hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
    emergency_contact: row.emergency_contact,
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
    `SELECT u.id, u.name, u.handle, u.city,
            COALESCE(u.karma, 50) AS karma,
            COALESCE(u.badges, '{"Community Pioneer"}') AS badges,
            u.avatar_url, u.bio,
            COALESCE(u.hobbies, '{}') AS hobbies, u.created_at,
            COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
     FROM users u
     LEFT JOIN hazards h ON h.user_id = u.id
     WHERE ${isNumeric ? "u.id = $1" : "LOWER(u.handle) = LOWER($1)"}
     GROUP BY u.id, u.name, u.handle, u.city, u.karma, u.badges, u.avatar_url, u.bio, u.hobbies, u.created_at, u.hazard_reports_count`,
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
    city: row.city || "Kolkata",
    karma: Number(row.karma || 50),
    badges: Array.isArray(row.badges) ? row.badges : ["Community Pioneer"],
    avatar_url: row.avatar_url,
    bio: row.bio,
    hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
    total_reports: totalReports,
    achievement: getAchievement(totalReports),
    created_at: row.created_at,
  };
}

/**
 * Award Karma points and check for safety badge promotions
 */
export async function awardKarma(userId: number, points: number, badgeToGrant?: string): Promise<{ karma: number; badges: string[] }> {
  let query = `
    UPDATE users
    SET karma = COALESCE(karma, 50) + $1
  `;
  const params: unknown[] = [points, userId];

  if (badgeToGrant) {
    query += `, badges = array_append(COALESCE(badges, '{}'), $3) WHERE id = $2 AND NOT ($3 = ANY(COALESCE(badges, '{}'))) RETURNING karma, badges`;
    params.push(badgeToGrant);
  } else {
    query += ` WHERE id = $2 RETURNING karma, badges`;
  }

  const res = await pool.query(query, params);
  if (res.rowCount === 0) {
    const fallback = await pool.query(`SELECT karma, badges FROM users WHERE id = $1`, [userId]);
    return fallback.rows[0] || { karma: 50, badges: [] };
  }

  return res.rows[0];
}

/**
 * Update user profile details
 */
export async function updateUserProfile(
  userId: number,
  updates: {
    name?: string;
    city?: string;
    avatar_url?: string | null;
    bio?: string | null;
    hobbies?: string[];
    emergency_contact?: string | null;
  }
): Promise<UserProfile | null> {
  const current = await getUserProfile(userId);
  if (!current) return null;

  const newName = updates.name !== undefined ? updates.name.trim() : current.name;
  const newCity = updates.city !== undefined ? updates.city.trim() : current.city;
  const newAvatar = updates.avatar_url !== undefined ? updates.avatar_url : current.avatar_url;
  const newBio = updates.bio !== undefined ? updates.bio : current.bio;
  const newHobbies = updates.hobbies !== undefined ? updates.hobbies : current.hobbies;
  const newEmergencyContact = updates.emergency_contact !== undefined ? updates.emergency_contact : current.emergency_contact;

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
         city = $2,
         avatar_url = $3,
         bio = $4,
         hobbies = $5,
         emergency_contact = $6
     WHERE id = $7`,
    [newName, newCity, newAvatar, newBio, newHobbies, newEmergencyContact, userId]
  );

  return getUserProfile(userId);
}
