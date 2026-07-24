import { neon, neonConfig } from '@neondatabase/serverless';

// 确保 DATABASE_URL 存在
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please create a Neon Postgres database in Vercel Storage or set it manually.'
  );
}

/**
 * 创建 HTTP 式 Neon 数据库连接
 * 在 Serverless 环境下使用 HTTP 模式（非 WebSocket）
 */
export const sql = neon(DATABASE_URL);

/**
 * 初始化数据库表结构（幂等操作）
 * 首次冷启动时自动建表
 */
export async function initializeDatabase(): Promise<void> {
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

    // 过期清理索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_cap_challenges_expires
      ON cap_challenges(expires_at)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cap_tokens_expires
      ON cap_tokens(expires_at)
    `;
  } catch (error) {
    // 如果表已存在则忽略（幂等）
    console.warn('Database initialization warning (may be harmless):', error);
  }
}
