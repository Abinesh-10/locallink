/**
 * Runs all .sql files in db/migrations/ in filename order, inside a single
 * transaction per file, tracking applied migrations in a schema_migrations
 * table so re-running `npm run migrate:up` is idempotent.
 *
 * We use plain numbered .sql files (0001_*, 0002_*, ...) rather than the
 * node-pg-migrate JS DSL because the doc's schema (§3) is most naturally
 * authored as raw DDL — multiple CREATE TYPE/TABLE/TRIGGER statements per
 * file, which the DSL would only obscure.
 */
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Resolves correctly in both contexts:
//  - dev (ts-node):      __dirname = backend/db        -> backend/db/migrations
//  - docker (compiled):  __dirname = /app/dist/db       -> /app/db/migrations
//    (Dockerfile copies db/migrations to /app/db/migrations, sibling to dist/)
const MIGRATIONS_DIR = fs.existsSync(path.resolve(__dirname, 'migrations'))
  ? path.resolve(__dirname, 'migrations')
  : path.resolve(__dirname, '../db/migrations');

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const res = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map((r) => r.filename));
}

async function run(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`SKIP  ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`OK    ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`FAIL  ${file}`);
        throw err;
      } finally {
        client.release();
      }
    }
    console.log('All migrations applied.');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
