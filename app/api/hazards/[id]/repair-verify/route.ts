import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { submitRepairVerification } from "@/lib/services/hazard.service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Please log in to verify repairs & earn Karma." },
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
    if (vote !== "confirmed" && vote !== "still_broken") {
      return NextResponse.json(
        { error: "Invalid vote type. Must be 'confirmed' or 'still_broken'" },
        { status: 400 }
      );
    }

    const result = await submitRepairVerification(hazardId, authUser.userId, vote);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[Repair Verify] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to submit repair verification" },
      { status: 500 }
    );
  }
}
