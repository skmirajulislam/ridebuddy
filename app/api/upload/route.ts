import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { UTApi } from "uploadthing/server";

function getUTApi(): UTApi {
  const token = process.env.UPLOADTHING_TOKEN?.replace(/^['"]|['"]$/g, "");
  return new UTApi(token ? { token } : undefined);
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let uploadableFile: File | null = null;

    // Case 1: JSON payload with base64 image (most reliable across all browsers & platforms)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { imageBase64, fileName = "upload.jpg", mimeType = "image/jpeg" } = body;

      if (!imageBase64 || typeof imageBase64 !== "string") {
        return NextResponse.json({ error: "No imageBase64 provided" }, { status: 400 });
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      uploadableFile = new File([buffer], fileName, { type: mimeType });
    } 
    // Case 2: Multipart FormData
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      uploadableFile = new File([buffer], file.name || "upload.jpg", {
        type: file.type || "image/jpeg",
      });
    } else {
      // Fallback: try reading as JSON first, then formData
      try {
        const body = await req.json();
        if (body.imageBase64) {
          const cleanBase64 = body.imageBase64.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(cleanBase64, "base64");
          uploadableFile = new File([buffer], body.fileName || "upload.jpg", {
            type: body.mimeType || "image/jpeg",
          });
        }
      } catch {
        // Not JSON
      }
    }

    if (!uploadableFile) {
      return NextResponse.json({ error: "Invalid image upload format" }, { status: 400 });
    }

    // Server-side UploadThing upload via UTApi
    const utapi = getUTApi();
    const uploadRes = await utapi.uploadFiles([uploadableFile]);

    if (!uploadRes || uploadRes.length === 0 || uploadRes[0].error) {
      console.error("[Upload] Server UTApi error:", uploadRes?.[0]?.error);
      return NextResponse.json(
        { error: uploadRes?.[0]?.error?.message || "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    const uploadedData = uploadRes[0].data;
    const fileUrl = uploadedData.ufsUrl || uploadedData.url;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      key: uploadedData.key,
      name: uploadedData.name,
      size: uploadedData.size,
    });
  } catch (err: unknown) {
    console.error("[Upload] POST error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}
