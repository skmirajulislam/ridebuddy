import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [authUser.userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    console.error("[Auth] getMe error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch user." },
      { status: 500 }
    );
  }
}
