import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { generateUniqueHandle } from "@/lib/utils/handle";

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
      "SELECT id, name, email, role, handle, avatar_url, bio, hobbies, created_at FROM users WHERE id = $1",
      [authUser.userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const row = result.rows[0];
    let handle = row.handle;
    if (!handle) {
      handle = await generateUniqueHandle(row.name || row.email || "user");
      await pool.query("UPDATE users SET handle = $1 WHERE id = $2", [handle, row.id]);
    }

    return NextResponse.json({
      ...row,
      handle,
      hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
    });
  } catch (err: unknown) {
    console.error("[Auth] getMe error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch user." },
      { status: 500 }
    );
  }
}
