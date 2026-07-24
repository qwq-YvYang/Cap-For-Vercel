import Cap from '@cap.js/server';
import { sql } from './db';

/**
 * 创建 Cap 单例实例
 *
 * 使用 @cap.js/server v4.0.5 的 storage hooks API，
 * 将挑战和令牌持久化到 Neon PostgreSQL。
 *
 * ⚠️ 注意：read 方法必须返回特定格式：
 *   - challenges.read → { challenge: data, expires: number } | null
 *   - tokens.get      → number（过期时间戳）| null
 */
export const cap = new Cap({
  // @cap.js/server v4 不再支持 noFSState，用 disableAutoCleanup 控制自动清理
  disableAutoCleanup: true,

  storage: {
    challenges: {
      /**
       * 存储挑战数据
       * challengeData 结构：{ challenge: { c, s, d }, expires: number }
       */
      async store(token: string, challengeData: any) {
        await sql`
          INSERT INTO cap_challenges (token, data, expires_at)
          VALUES (${token}, ${JSON.stringify(challengeData)}, ${challengeData.expires})
          ON CONFLICT (token) DO UPDATE
          SET data = EXCLUDED.data,
              expires_at = EXCLUDED.expires_at
        `;
      },

      /**
       * 读取挑战数据（需过滤已过期的）
       *
       * ⚠️ 必须返回 { challenge, expires } 格式，Cap 内部依赖此结构
       */
      async read(token: string) {
        const rows = await sql`
          SELECT data, expires_at FROM cap_challenges
          WHERE token = ${token} AND expires_at > ${Date.now()}
          LIMIT 1
        `;
        if (rows.length === 0) return null;

        // SQL 中的 data 是 JSONB 类型，Neon 自动解析为对象
        // 必须返回 { challenge, expires } 格式
        const row = rows[0];
        const parsed = typeof row.data === 'string'
          ? JSON.parse(row.data)
          : row.data;

        return {
          challenge: parsed.challenge ?? parsed,
          expires: Number(row.expires_at),
        };
      },

      /**
       * 删除挑战（防止重放攻击）
       */
      async delete(token: string) {
        await sql`DELETE FROM cap_challenges WHERE token = ${token}`;
      },

      /**
       * 批量清理过期挑战
       */
      async deleteExpired() {
        await sql`DELETE FROM cap_challenges WHERE expires_at <= ${Date.now()}`;
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
       * 读取令牌过期时间
       * 必须返回 number（毫秒时间戳）或 null
       */
      async get(key: string) {
        const rows = await sql`
          SELECT expires_at FROM cap_tokens
          WHERE token_hash = ${key} AND expires_at > ${Date.now()}
          LIMIT 1
        `;
        return rows.length > 0 ? Number(rows[0].expires_at) : null;
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
        await sql`DELETE FROM cap_tokens WHERE expires_at <= ${Date.now()}`;
      },
    },
  },
});
