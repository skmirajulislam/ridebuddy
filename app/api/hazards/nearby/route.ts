import { NextRequest, NextResponse } from "next/server";
import { getNearbyHazards } from "@/lib/services/hazard.service";

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

    const radiusMeters = parseFloat(radius || "500") || 500;
    const hazards = await getNearbyHazards(
      parseFloat(lat),
      parseFloat(lng),
      radiusMeters
    );

    return NextResponse.json(hazards);
  } catch (err: unknown) {
    console.error("[Hazards] nearby error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch nearby hazards" },
      { status: 500 }
    );
  }
}
