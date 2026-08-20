import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { verifyHazard } from "@/lib/services/hazard.service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Please log in to verify road hazards." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const hazardId = parseInt(id, 10);
    if (isNaN(hazardId)) {
      return NextResponse.json({ error: "Invalid hazard ID" }, { status: 400 });
    }

    const body = await req.json();
    const { vote } = body;
    if (vote !== "still_there" && vote !== "fixed") {
      return NextResponse.json(
        { error: "Invalid vote type. Must be 'still_there' or 'fixed'" },
        { status: 400 }
      );
    }

    const result = await verifyHazard(hazardId, authUser.userId, vote);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[Verify Hazard] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to submit hazard verification" },
      { status: 500 }
    );
  }
}
