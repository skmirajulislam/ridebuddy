import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getGovStats } from "@/lib/services/hazard.service";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (authUser.role !== "official") {
      return NextResponse.json(
        { error: "Access denied. Official permissions required." },
        { status: 403 }
      );
    }

    const stats = await getGovStats();
    return NextResponse.json(stats);
  } catch (err: unknown) {
    console.error("[Gov] stats error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch government statistics." },
      { status: 500 }
    );
  }
}
