import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getHazards,
  checkDuplicate,
  createHazard,
} from "@/lib/services/hazard.service";
import { validateImage } from "@/lib/services/gemini.service";
import { uploadBase64ToUploadThing } from "@/lib/services/uploadthing.service";

const GEMINI_MIN_CONFIDENCE = 0.5;
const DUPLICATE_RADIUS_METERS = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minLat = searchParams.get("minLat");
    const maxLat = searchParams.get("maxLat");
    const minLng = searchParams.get("minLng");
    const maxLng = searchParams.get("maxLng");

    const filter =
      minLat && maxLat && minLng && maxLng
        ? {
            minLat: parseFloat(minLat),
            maxLat: parseFloat(maxLat),
            minLng: parseFloat(minLng),
            maxLng: parseFloat(maxLng),
          }
        : undefined;

    const hazards = await getHazards(filter);
    return NextResponse.json(hazards);
  } catch (err: unknown) {
    console.error("[Hazards] GET error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch hazards" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to report hazards" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, lat, lng, severity, imageBase64, imageMimeType, image_url, imageUrl, fileName } = body;

    // 1. Basic validation
    if (!type || lat == null || lng == null) {
      return NextResponse.json(
        { error: "type, lat, and lng are required" },
        { status: 400 }
      );
    }

    let finalImageUrl = image_url || imageUrl || null;

    if (!imageBase64 && !finalImageUrl) {
      return NextResponse.json(
        { error: "Image is required for hazard verification" },
        { status: 400 }
      );
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // 2. Duplicate check — Haversine distance, same type within 30m
    const duplicate = await checkDuplicate(
      parsedLat,
      parsedLng,
      type,
      DUPLICATE_RADIUS_METERS
    );

    if (duplicate) {
      return NextResponse.json(
        {
          error: `A "${type}" has already been reported within 30m of this location.`,
          existing_hazard_id: duplicate.id,
        },
        { status: 409 }
      );
    }

    // 3. Gemini Vision AI validation (analyzed in-memory BEFORE cloud upload)
    let validation: {
      is_hazard: boolean;
      hazard_type: string | null;
      confidence: number;
      skipped?: boolean;
    } = { is_hazard: true, hazard_type: type, confidence: 1.0, skipped: true };

    if (imageBase64) {
      try {
        validation = await validateImage(
          imageBase64,
          imageMimeType || "image/jpeg"
        );
      } catch (err: unknown) {
        return NextResponse.json(
          { error: (err as Error).message },
          { status: 503 }
        );
      }

      if (!validation.is_hazard) {
        return NextResponse.json(
          {
            error:
              "Image does not appear to contain a road hazard. Please capture a clear photo of the hazard.",
            gemini_result: { is_hazard: false, confidence: validation.confidence },
          },
          { status: 422 }
        );
      }

      if (validation.confidence < GEMINI_MIN_CONFIDENCE && !validation.skipped) {
        return NextResponse.json(
          {
            error: `Image confidence too low (${Math.round(
              validation.confidence * 100
            )}%). Please take a clearer photo.`,
            gemini_result: validation,
          },
          { status: 422 }
        );
      }

      // 4. FINAL CONFIRMATION RECEIVED FROM GEMINI:
      // Now that Gemini has verified the hazard image, upload it to cloud storage.
      if (!finalImageUrl) {
        try {
          const uploadedUrl = await uploadBase64ToUploadThing(
            imageBase64,
            imageMimeType || "image/jpeg",
            fileName
          );
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn("[Hazards] Cloud upload warning after Gemini confirmation:", uploadErr);
        }
      }
    }

    // 5. Create hazard in database
    const hazard = await createHazard({
      type,
      lat: parsedLat,
      lng: parsedLng,
      severity: parseInt(severity) || 1,
      user_id: authUser.userId,
      confidence: validation.confidence,
      image_url: finalImageUrl,
    });

    return NextResponse.json(
      {
        ...hazard,
        gemini_validated: true,
        hazard_type_ai: validation.hazard_type,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[Hazards] POST error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create hazard" },
      { status: 500 }
    );
  }
}
