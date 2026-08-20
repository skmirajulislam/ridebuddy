import pool from "../db";

export interface UserDashboardData {
  user_id: number;
  name: string;
  email: string | null;
  total_reports: number;
  achievement: {
    current: number | null;
    next: number | null;
    reached: number[];
    title: string | null;
  };
}

const ACHIEVEMENT_MILESTONES = [50, 100, 200, 500, 1000];

export function getAchievement(totalReports: number) {
  const reached = ACHIEVEMENT_MILESTONES.filter((m) => totalReports >= m);
  const current = reached.length ? reached[reached.length - 1] : null;
  const next = ACHIEVEMENT_MILESTONES.find((m) => m > totalReports) ?? null;

  return {
    current,
    next,
    reached,
    title: current ? `${current}+ Hazard Reporter` : null,
  };
}

export async function getUserDashboard(userId: number): Promise<UserDashboardData | null> {
  let result;
  try {
    result = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email,
              COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
       FROM users u
       LEFT JOIN hazards h ON h.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.name, u.email, u.hazard_reports_count`,
      [userId]
    );
  } catch (err: unknown) {
    const dbErr = err as { code?: string };
    if (dbErr?.code !== "42703") {
      throw err;
    }
    // Fallback if hazard_reports_count column is missing
    result = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email,
              COUNT(h.id)::int AS total_reports
       FROM users u
       LEFT JOIN hazards h ON h.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.name, u.email`,
      [userId]
    );
  }

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  const totalReports = Number(row.total_reports || 0);

  return {
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    total_reports: totalReports,
    achievement: getAchievement(totalReports),
  };
}
