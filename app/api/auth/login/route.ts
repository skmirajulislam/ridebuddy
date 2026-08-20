import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { comparePassword, generateToken } from "@/lib/auth";
import { generateUniqueHandle } from "@/lib/utils/handle";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email = "", password = "" } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const result = await pool.query(
      "SELECT id, name, email, password_hash, role, handle, avatar_url, bio, hobbies FROM users WHERE email = $1",
      [cleanEmail]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const match = await comparePassword(password, user.password_hash);

    if (!match) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    let handle = user.handle;
    if (!handle) {
      handle = await generateUniqueHandle(user.name || user.email || "user");
      await pool.query("UPDATE users SET handle = $1 WHERE id = $2", [handle, user.id]);
    }

    const token = generateToken({ ...user, handle });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        handle,
        avatar_url: user.avatar_url || null,
        bio: user.bio || null,
        hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
      },
    });
  } catch (err: unknown) {
    console.error("[Auth] Login error:", (err as Error).message);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
