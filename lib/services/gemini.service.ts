import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const VALIDATION_PROMPT = `You are a road safety inspection AI for Indian roads.

Analyze the image and determine if it shows a real road hazard or unsafe road condition.

Valid hazard types (accept any of these):
- pothole
- flood / waterlogging
- accident / vehicle collision
- roadblock / obstruction
- debris / rocks / fallen objects
- speed breaker (marked or unmarked)
- road crack / damaged surface
- patch work / uneven road repair
- poor lighting / low visibility
- other road safety issue

Rules:
- Return JSON only, no extra text, no markdown fences
- Accept the image if it clearly shows ANY road hazard or unsafe condition
- Reject only if the image is completely unrelated to roads (e.g. selfie, food, indoor furniture, sky)
- Blurry images of road hazards should still be accepted if the hazard is visible
- Be PERMISSIVE — err on the side of accepting road hazard images

Output format (strict JSON, no extra text):
{"is_hazard": true, "hazard_type": "string or null", "confidence": 0.0 to 1.0}`;

export interface ValidationResult {
  is_hazard: boolean;
  hazard_type: string | null;
  confidence: number;
  skipped?: boolean;
}

/**
 * Validates a base64-encoded image using Gemini Vision AI.
 * Images are never persisted to disk — analyzed in-memory only.
 */
export async function validateImage(
  base64Image: string,
  mimeType = "image/jpeg"
): Promise<ValidationResult> {
  if (!genAI || !apiKey) {
    console.warn("[Gemini] GEMINI_API_KEY is not configured — skipping AI validation");
    return { is_hazard: true, hazard_type: null, confidence: 1.0, skipped: true };
  }

  // Use gemini-1.5-flash or gemini-flash-latest
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType,
    },
  };

  let responseText: string;
  try {
    const result = await model.generateContent([VALIDATION_PROMPT, imagePart]);
    responseText = result.response.text().trim();
  } catch (err: unknown) {
    const msg = (err as Error).message || "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("Too Many") || msg.includes("RESOURCE_EXHAUSTED")) {
      console.warn("[Gemini] Rate limit hit — gracefully skipping AI verification for this report");
      return { is_hazard: true, hazard_type: null, confidence: 1.0, skipped: true };
    }
    console.error("[Gemini] AI validation failed:", msg);
    throw new Error("Image validation service is currently unavailable. Please try again.");
  }

  // Clean markdown backticks if present
  const cleaned = responseText
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: { is_hazard?: boolean; hazard_type?: string | null; confidence?: number };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Gemini] Failed to parse response:", responseText);
    return { is_hazard: true, hazard_type: null, confidence: 0.8, skipped: true };
  }

  return {
    is_hazard: Boolean(parsed.is_hazard),
    hazard_type: parsed.hazard_type ?? null,
    confidence: Number(parsed.confidence) || 0,
  };
}
