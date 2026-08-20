import { NextRequest, NextResponse } from "next/server";
import { getPublicUserProfile } from "@/lib/services/user.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    if (!handle) {
      return NextResponse.json({ error: "Handle parameter is required" }, { status: 400 });
    }

    const profile = await getPublicUserProfile(handle);
    if (!profile) {
      return NextResponse.json({ error: "Contributor profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err: unknown) {
    console.error("[PublicProfile] GET error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch contributor profile" },
      { status: 500 }
    );
  }
}
