import { neon } from '@neondatabase/serverless';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[cap] FATAL: DATABASE_URL not set');
    return null;
  }
  return neon(url);
}

export async function ensureTables() {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`CREATE TABLE IF NOT EXISTS cap_challenges (
      token TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      expires_at BIGINT NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS cap_tokens (
      token_hash TEXT PRIMARY KEY,
      expires_at BIGINT NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cc_expires ON cap_challenges(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ct_expires ON cap_tokens(expires_at)`;
    return true;
  } catch (e) {
    console.error('[cap] ensureTables error:', e.message);
    return false;
  }
}
