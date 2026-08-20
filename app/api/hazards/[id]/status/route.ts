import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateHazardStatus } from "@/lib/services/hazard.service";

const VALID_STATUSES = ["active", "in_progress", "resolved"] as const;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: rawId } = await context.params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid hazard ID" }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updated = await updateHazardStatus(id, status, authUser.userId);
    if (!updated) {
      return NextResponse.json({ error: "Hazard not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[Gov] updateHazardStatus error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to update hazard status." },
      { status: 500 }
    );
  }
}
