import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * 创建 HTTP 式 Neon 数据库连接（在 Serverless 中最优，
 * 每个查询独立 HTTP 请求，无需维护连接池）
 */
export const sql = neon(DATABASE_URL);

/**
 * 初始化数据库表结构
 * 在 Vercel 部署后首次调用时执行
 */
export async function initializeDatabase(): Promise<void> {
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
}
