import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user_id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
