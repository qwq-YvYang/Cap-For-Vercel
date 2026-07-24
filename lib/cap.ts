import Cap from '@cap.js/server';
import { sql } from './db';

/**
 * 创建 Cap 单例实例，将内存状态替换为 Neon PostgreSQL 存储
 *
 * @cap.js/server v4.0.5 支持 StorageHooks 配置，
 * 可以无缝替代默认的文件/内存存储，无需手动管理挑战和令牌。
 */
export const cap = new Cap({
  // 禁用文件系统状态（Vercel Serverless 无持久文件系统）
  noFSState: true,

  // 禁用自动清理（由 Neon 侧定时清理 + 查询时按过期过滤）
  disableAutoCleanup: true,

  storage: {
    challenges: {
      /**
       * 存储挑战数据
       */
      async store(token: string, challengeData: { expires: number; challenge: { c: number; s: number; d: number } }) {
        await sql`
          INSERT INTO cap_challenges (token, data, expires_at)
          VALUES (${token}, ${JSON.stringify(challengeData)}, ${challengeData.expires})
          ON CONFLICT (token) DO UPDATE
          SET data = EXCLUDED.data,
              expires_at = EXCLUDED.expires_at
        `;
      },

      /**
       * 读取挑战数据（同时过滤已过期的）
       */
      async read(token: string) {
        const rows = await sql`
          SELECT data FROM cap_challenges
          WHERE token = ${token} AND expires_at > ${Date.now()}
          LIMIT 1
        `;
        return rows.length > 0 ? rows[0].data : null;
      },

      /**
       * 删除挑战（防止重复兑换）
       */
      async delete(token: string) {
        await sql`DELETE FROM cap_challenges WHERE token = ${token}`;
      },

      /**
       * 批量清理过期挑战
       */
      async deleteExpired() {
        await sql`DELETE FROM cap_challenges WHERE expires_at < ${Date.now()}`;
      },
    },

    tokens: {
      /**
       * 存储已验证的令牌
       */
      async store(key: string, expires: number) {
        await sql`
          INSERT INTO cap_tokens (token_hash, expires_at)
          VALUES (${key}, ${expires})
          ON CONFLICT (token_hash) DO UPDATE
          SET expires_at = EXCLUDED.expires_at
        `;
      },

      /**
       * 读取令牌过期时间（同时过滤已过期的）
       */
      async get(key: string) {
        const rows = await sql`
          SELECT expires_at FROM cap_tokens
          WHERE token_hash = ${key} AND expires_at > ${Date.now()}
          LIMIT 1
        `;
        return rows.length > 0 ? rows[0].expires_at : null;
      },

      /**
       * 删除令牌（消耗一次性令牌）
       */
      async delete(key: string) {
        await sql`DELETE FROM cap_tokens WHERE token_hash = ${key}`;
      },

      /**
       * 批量清理过期令牌
       */
      async deleteExpired() {
        await sql`DELETE FROM cap_tokens WHERE expires_at < ${Date.now()}`;
      },
    },
  },
});
