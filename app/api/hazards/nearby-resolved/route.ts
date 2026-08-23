import { NextRequest, NextResponse } from "next/server";
import { getResolvedHazardsNearby } from "@/lib/services/hazard.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "lat and lng are required" },
        { status: 400 }
      );
    }

    const radiusMeters = parseFloat(radius || "100") || 100;
    const hazards = await getResolvedHazardsNearby(
      parseFloat(lat),
      parseFloat(lng),
      radiusMeters
    );

    return NextResponse.json(hazards);
  } catch (err: unknown) {
    console.error("[Hazards] nearby-resolved error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch nearby resolved hazards" },
      { status: 500 }
    );
  }
}
