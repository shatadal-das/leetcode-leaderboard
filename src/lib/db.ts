import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const connectionString = process.env.POSTGRES_URI || '';
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

