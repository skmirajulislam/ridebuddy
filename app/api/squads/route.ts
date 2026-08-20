import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createSquad } from "@/lib/services/squad.service";

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to create a squad." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name } = body;

    const squad = await createSquad(
      authUser.userId,
      authUser.name,
      authUser.email?.split("@")[0],
      null,
      name
    );

    return NextResponse.json(squad, { status: 201 });
  } catch (err: unknown) {
    console.error("[Squads] Create error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to create squad room" },
      { status: 500 }
    );
  }
}
