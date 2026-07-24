import { neon } from '@neondatabase/serverless';

/**
 * 获取数据库连接（惰性初始化，不顶 throw）
 * 在函数调用时才检查 DATABASE_URL，避免模块加载时崩溃
 */
export function getSql() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('[cap] DATABASE_URL is not set');
    return null;
  }
  return neon(DATABASE_URL);
}

/**
 * 初始化数据库表结构（幂等操作）
 */
export async function initializeDatabase(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS cap_challenges (
        token TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        expires_at BIGINT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cap_tokens (
        token_hash TEXT PRIMARY KEY,
        expires_at BIGINT NOT NULL
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cap_challenges_expires
      ON cap_challenges(expires_at)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cap_tokens_expires
      ON cap_tokens(expires_at)
    `;

    return true;
  } catch (error) {
    console.error('[cap] Database initialization failed:', error);
    return false;
  }
}
