import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSquadDetails, pingSquadLocation, leaveSquad } from "@/lib/services/squad.service";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const squad = await getSquadDetails(code);
    if (!squad) {
      return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }
    return NextResponse.json(squad);
  } catch (err: unknown) {
    console.error("[Squads] GET error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to fetch squad details" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { code } = await context.params;
    const body = await req.json();
    const { lat, lng, speed = 0, heading = 0 } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    await pingSquadLocation(code, authUser.userId, lat, lng, speed, heading);
    const updated = await getSquadDetails(code);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[Squads] Ping error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { code } = await context.params;
    await leaveSquad(code, authUser.userId);

    return NextResponse.json({ success: true, message: "Left squad successfully" });
  } catch (err: unknown) {
    console.error("[Squads] Leave error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to leave squad" }, { status: 500 });
  }
}
