import { Pool, PoolClient } from 'pg';
import { env, isProd } from './env';
import { logger } from '../lib/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.PG_SSL ? { rejectUnauthorized: false } : undefined,
  max: isProd ? 20 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected Postgres pool error', { error: err.message });
});

/**
 * Run a query with automatic logging on failure.
 * Use this for simple, single-statement queries.
 */
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
      logger.warn('Slow query', { text, duration });
    }
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (err: any) {
    logger.error('Query failed', { text, error: err.message });
    throw err;
  }
}

/**
 * Run a set of queries inside a transaction. Pass an async function that
 * receives a PoolClient and uses it for all statements. Automatically
 * commits on success and rolls back on any thrown error.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err: any) {
    logger.error('Database connection check failed', { error: err.message });
    return false;
  }
}
