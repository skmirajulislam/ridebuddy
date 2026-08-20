import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    let query = `
      SELECT u.id, u.name, u.handle, u.city,
             COALESCE(u.karma, 50) AS karma,
             COALESCE(u.badges, '{"Community Pioneer"}') AS badges,
             u.avatar_url,
             COALESCE(u.hazard_reports_count, COUNT(h.id)::int)::int AS total_reports
      FROM users u
      LEFT JOIN hazards h ON h.user_id = u.id
    `;
    const params: unknown[] = [];

    if (city && city.toLowerCase() !== "all" && city.toLowerCase() !== "global") {
      params.push(city);
      query += ` WHERE LOWER(u.city) = LOWER($1)`;
    }

    query += `
      GROUP BY u.id, u.name, u.handle, u.city, u.karma, u.badges, u.avatar_url, u.hazard_reports_count
      ORDER BY karma DESC, total_reports DESC
      LIMIT ${params.length === 1 ? "$2" : "$1"}
    `;
    params.push(limit);

    const result = await pool.query(query, params);

    // Get available cities for filter dropdown
    const citiesRes = await pool.query(`
      SELECT DISTINCT city FROM users WHERE city IS NOT NULL AND TRIM(city) != '' ORDER BY city ASC LIMIT 30
    `);

    const availableCities = citiesRes.rows.map((r) => r.city);

    return NextResponse.json({
      leaderboard: result.rows.map((row, index) => ({
        rank: index + 1,
        id: row.id,
        name: row.name || "Anonymous Rider",
        handle: row.handle || `rider_${row.id}`,
        city: row.city || "Kolkata",
        karma: Number(row.karma || 50),
        badges: Array.isArray(row.badges) ? row.badges : ["Community Pioneer"],
        avatar_url: row.avatar_url,
        total_reports: Number(row.total_reports || 0),
      })),
      cities: availableCities,
      currentFilter: city || "Global",
    });
  } catch (err: unknown) {
    console.error("[Leaderboard] Error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
