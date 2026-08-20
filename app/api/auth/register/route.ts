import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { generateUniqueHandle } from "@/lib/utils/handle";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name = "", email = "", password = "" } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const displayName = name.trim() || cleanEmail.split("@")[0];
    const handle = await generateUniqueHandle(displayName);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, handle, created_at, role, hobbies)
       VALUES ($1, $2, $3, $4, NOW(), 'user', '{}')
       RETURNING id, name, email, role, handle, avatar_url, bio, hobbies`,
      [displayName, cleanEmail, passwordHash, handle]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || "user",
          handle: user.handle,
          avatar_url: user.avatar_url || null,
          bio: user.bio || null,
          hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[Auth] Register error:", (err as Error).message);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
