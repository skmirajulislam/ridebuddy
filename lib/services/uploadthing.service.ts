// lib/services/uploadthing.service.ts
// Utility for safely deleting and managing uploaded assets on UploadThing storage.

import { UTApi } from "uploadthing/server";

let utapiInstance: UTApi | null = null;

function getUTApi(): UTApi {
  if (!utapiInstance) {
    const token = process.env.UPLOADTHING_TOKEN?.replace(/^['"]|['"]$/g, "");
    utapiInstance = new UTApi(token ? { token } : undefined);
  }
  return utapiInstance;
}

/**
 * Uploads a base64 image directly to UploadThing cloud storage.
 * Should ONLY be called after all AI verifications and checks have passed.
 */
export async function uploadBase64ToUploadThing(
  imageBase64: string,
  mimeType = "image/jpeg",
  fileName?: string
): Promise<string | null> {
  if (!imageBase64) return null;

  try {
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const name = fileName || `hazard_${Date.now()}.jpg`;
    const uploadableFile = new File([buffer], name, { type: mimeType });

    const utapi = getUTApi();
    const uploadRes = await utapi.uploadFiles([uploadableFile]);

    if (!uploadRes || uploadRes.length === 0 || uploadRes[0].error) {
      console.error("[UploadThing] Server upload error:", uploadRes?.[0]?.error);
      return null;
    }

    const uploadedData = uploadRes[0].data;
    const fileUrl = uploadedData.ufsUrl || uploadedData.url || null;
    console.log(`[UploadThing] Hazard photo uploaded successfully to cloud: ${fileUrl}`);
    return fileUrl;
  } catch (err: unknown) {
    console.error("[UploadThing] Failed to upload base64 file to cloud:", (err as Error).message);
    return null;
  }
}

/**
 * Extracts the file key from an UploadThing URL or returns the key if already formatted.
 * Handles URLs like:
 * - https://utfs.io/f/<fileKey>
 * - https://ufs.sh/f/<fileKey>
 * - https://uploadthing.com/f/<fileKey>
 */
export function extractUploadThingKey(urlOrKey: string): string | null {
  if (!urlOrKey) return null;
  const trimmed = urlOrKey.trim();

  // If not a full URL, assume it's already a raw key
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

  try {
    const urlObj = new URL(trimmed);
    const pathname = urlObj.pathname;
    
    // Check pattern /f/:key
    const match = pathname.match(/\/f\/([^/?#]+)/);
    if (match && match[1]) {
      return match[1];
    }

    // Fallback to last segment of pathname
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  } catch (err) {
    console.warn("[UploadThing] Failed to parse URL for key extraction:", urlOrKey, err);
  }

  return null;
}

/**
 * Safely deletes a file from UploadThing storage.
 * Does not throw; returns true if deleted or skipped (e.g. null/empty), false on failure.
 */
export async function deleteUploadThingFile(urlOrKey: string | null | undefined): Promise<boolean> {
  if (!urlOrKey) return true;

  const key = extractUploadThingKey(urlOrKey);
  if (!key) {
    console.warn("[UploadThing] Could not extract file key from:", urlOrKey);
    return false;
  }

  try {
    const utapi = getUTApi();
    const result = await utapi.deleteFiles(key);
    console.log(`[UploadThing] Safely deleted file with key [${key}]:`, result);
    return true;
  } catch (err: unknown) {
    console.warn(`[UploadThing] Failed to delete file [${key}] from storage:`, (err as Error).message);
    return false;
  }
}
