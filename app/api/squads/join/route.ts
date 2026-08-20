import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { joinSquad } from "@/lib/services/squad.service";

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to join a squad." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Squad code is required." }, { status: 400 });
    }

    const squad = await joinSquad(
      code,
      authUser.userId,
      authUser.name,
      authUser.email?.split("@")[0],
      null
    );

    if (!squad) {
      return NextResponse.json(
        { error: "Invalid squad code or room not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(squad);
  } catch (err: unknown) {
    console.error("[Squads] Join error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to join squad room" },
      { status: 500 }
    );
  }
}
