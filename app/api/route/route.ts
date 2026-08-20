import { NextRequest, NextResponse } from "next/server";
import { getRoute } from "@/lib/services/routing.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to required (format: lng,lat)" },
        { status: 400 }
      );
    }

    const routeResult = await getRoute(from, to);
    return NextResponse.json(routeResult);
  } catch (err: unknown) {
    console.error("[Route] GET error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to calculate route" },
      { status: 500 }
    );
  }
}
