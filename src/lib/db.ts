import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const connectionString =
  process.env.POSTGRES_URI ||
  process.env.DB_URI ||
  process.env.DATABASE_URL ||
  '';

const isLocal =
  !connectionString ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('sslmode=disable');

// Create a connection pool if it doesn't exist.
// This prevents Next.js hot-reloads from exhausting database connections.
export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString:
      process.env.NODE_ENV === 'development'
        ? connectionString.replace('?sslmode=require', '')
        : connectionString,
    max: 10,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

let initTablePromise: Promise<void> | null = null;

export async function ensureLeaderboardTable() {
  if (!connectionString) return;
  if (initTablePromise) return initTablePromise;

  initTablePromise = (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leaderboard (
          id text PRIMARY KEY,
          username text NOT NULL,
          batch text,
          rating integer NOT NULL DEFAULT 0,
          easy integer NOT NULL DEFAULT 0,
          medium integer NOT NULL DEFAULT 0,
          hard integer NOT NULL DEFAULT 0,
          today_solved integer NOT NULL DEFAULT 0,
          contests integer NOT NULL DEFAULT 0,
          profile_link text,
          has_knight_badge boolean NOT NULL DEFAULT false,
          has_guardian_badge boolean NOT NULL DEFAULT false,
          last_updated timestamp NOT NULL DEFAULT NOW()
        );
        ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS batch text;
      `);
    } catch (err) {
      console.error("Failed to ensure leaderboard table exists in DB:", err);
      initTablePromise = null;
    }
  })();

  return initTablePromise;
}

