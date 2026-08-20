import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserHazards } from "@/lib/services/hazard.service";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to view your contributions" },
        { status: 401 }
      );
    }

    const hazards = await getUserHazards(authUser.userId);
    return NextResponse.json(hazards);
  } catch (err: unknown) {
    console.error("[User Hazards] GET error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch user contributions" },
      { status: 500 }
    );
  }
}
