import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

// Create a connection pool if it doesn't exist.
// This prevents Next.js hot-reloads from exhausting database connections.
export const pool = new Pool({
  connectionString: process.env.NODE_ENV === "development" ? process.env.POSTGRES_URI?.replace('?sslmode=require', '') : process.env.POSTGRES_URI,
  max: 1, 
  ssl: { rejectUnauthorized: false },
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
