import pool from "../db";

/**
 * Clean a user's display name or email into a URL-friendly, lowercase alphanumeric base handle
 */
export function sanitizeHandleBase(nameOrEmail: string): string {
  if (!nameOrEmail) return "rider";

  // If input contains @, take the part before @
  const raw = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;

  // Keep only alphanumeric characters and underscores
  const clean = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "");

  return clean.length >= 2 ? clean.slice(0, 20) : "rider";
}

/**
 * Generate a guaranteed unique system handle for a user (e.g. 'alex_4819')
 */
export async function generateUniqueHandle(nameOrEmail: string): Promise<string> {
  const base = sanitizeHandleBase(nameOrEmail);

  // Try up to 10 attempts with random 4-digit numeric suffixes
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${base}_${randomSuffix}`;

    const check = await pool.query("SELECT id FROM users WHERE handle = $1 LIMIT 1", [candidate]);
    if ((check.rowCount ?? 0) === 0) {
      return candidate;
    }
  }

  // Fallback: timestamp suffix
  return `${base}_${Date.now().toString().slice(-6)}`;
}
