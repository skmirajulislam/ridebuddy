import { NextRequest, NextResponse } from "next/server";
import { checkHazardExists } from "@/lib/services/hazard.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "lat and lng required" },
        { status: 400 }
      );
    }

    const exists = await checkHazardExists(parseFloat(lat), parseFloat(lng));
    return NextResponse.json({ exists, debug: "CHECK_API" });
  } catch (err: unknown) {
    console.error("[Hazards] check error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
