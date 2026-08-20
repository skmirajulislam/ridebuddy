import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { comparePassword, generateToken } from "@/lib/auth";

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
      "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
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

    const token = generateToken(user);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
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
