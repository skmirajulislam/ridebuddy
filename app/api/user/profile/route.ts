import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserProfile, updateUserProfile } from "@/lib/services/user.service";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(authUser.userId);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err: unknown) {
    console.error("[Profile] GET error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, avatar_url, bio, hobbies } = body;

    // Validation
    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json({ error: "Name must be a string" }, { status: 400 });
    }
    if (name !== undefined && name.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (bio !== undefined && typeof bio === "string" && bio.length > 500) {
      return NextResponse.json({ error: "Bio cannot exceed 500 characters" }, { status: 400 });
    }
    if (hobbies !== undefined && !Array.isArray(hobbies)) {
      return NextResponse.json({ error: "Hobbies must be an array of strings" }, { status: 400 });
    }

    const cleanHobbies = Array.isArray(hobbies)
      ? hobbies
          .map((h: unknown) => String(h).trim())
          .filter((h: string) => h.length > 0 && h.length <= 40)
          .slice(0, 15)
      : undefined;

    const updated = await updateUserProfile(authUser.userId, {
      name: name !== undefined ? name.trim() : undefined,
      avatar_url: avatar_url !== undefined ? avatar_url : undefined,
      bio: bio !== undefined ? bio.trim() : undefined,
      hobbies: cleanHobbies,
    });

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[Profile] PATCH error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
