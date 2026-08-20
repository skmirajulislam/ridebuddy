import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { deleteHazard } from "@/lib/services/hazard.service";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to delete a hazard" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const hazardId = parseInt(id, 10);

    if (isNaN(hazardId)) {
      return NextResponse.json({ error: "Invalid hazard ID" }, { status: 400 });
    }

    const isOfficial = authUser.role === "official" || authUser.role === "admin";
    const result = await deleteHazard(hazardId, authUser.userId, isOfficial);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: "Hazard and associated storage safely deleted." });
  } catch (err: unknown) {
    console.error("[Hazard] DELETE error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to delete hazard" },
      { status: 500 }
    );
  }
}
