import { Pool, PoolConfig } from "pg";

// Global singleton pool for Next.js (avoids creating new pools on each API request or hot reload)
declare global {
  var _pgPool: Pool | undefined;
}

let connectionString = process.env.DATABASE_URL;

// Normalize sslmode in connection string to eliminate pg warning
if (connectionString && connectionString.includes("sslmode=require")) {
  connectionString = connectionString.replace("sslmode=require", "sslmode=verify-full");
}

function createPool(): Pool {
  if (!connectionString) {
    console.warn("[DB] DATABASE_URL is not set. Database queries will fail.");
  }

  // Determine SSL settings
  // Local postgres usually doesn't use SSL; Cloud postgres (Neon, Supabase, RDS) does.
  const isLocal =
    connectionString?.includes("localhost") ||
    connectionString?.includes("127.0.0.1") ||
    connectionString?.includes("sslmode=disable");

  const config: PoolConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    // Increase to 15s to allow Neon serverless compute cold-start without timing out
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };

  if (!isLocal && connectionString) {
    config.ssl = {
      rejectUnauthorized: false,
    };
  }

  const pool = new Pool(config);

  pool.on("error", (err) => {
    console.error("[DB] Unexpected error on idle PostgreSQL client:", err);
  });

  return pool;
}

export const pool: Pool = global._pgPool || createPool();

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

export default pool;
