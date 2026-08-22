import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { generateUniqueHandle } from "@/lib/utils/handle";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name = "", email = "", password = "", city = "Kolkata" } = body;
    const cleanCity = String(city).trim() || "Kolkata";

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

    if (typeof email !== "string" || email.length > 254 || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
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
      `INSERT INTO users (name, email, password_hash, handle, city, karma, badges, created_at, role, hobbies)
       VALUES ($1, $2, $3, $4, $5, 50, ARRAY['Community Pioneer']::TEXT[], NOW(), 'user', '{}')
       RETURNING id, name, email, role, handle, city, karma, badges, avatar_url, bio, hobbies, emergency_contact`,
      [displayName, cleanEmail, passwordHash, handle, cleanCity]
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
          city: user.city || "Kolkata",
          karma: user.karma || 50,
          badges: Array.isArray(user.badges) ? user.badges : ["Community Pioneer"],
          avatar_url: user.avatar_url || null,
          bio: user.bio || null,
          hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
          emergency_contact: user.emergency_contact || null,
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
