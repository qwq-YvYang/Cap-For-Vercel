import Cap from '@cap.js/server';
import { getSql } from './db';

/**
 * 创建 Cap 单例实例
 *
 * 使用 @cap.js/server v4.0.5 的 storage hooks 将数据持久化到 Neon。
 *
 * 注意：challenges.read 必须返回 { challenge, expires } 格式
 */
export const cap = new Cap({
  disableAutoCleanup: true,
  noFSState: true,

  storage: {
    challenges: {
      async store(token: string, challengeData: any) {
        const sql = getSql();
        if (!sql) return;

        await sql`
          INSERT INTO cap_challenges (token, data, expires_at)
          VALUES (${token}, ${JSON.stringify(challengeData)}, ${challengeData.expires})
          ON CONFLICT (token) DO UPDATE
          SET data = EXCLUDED.data,
              expires_at = EXCLUDED.expires_at
        `;
      },

      async read(token: string) {
        const sql = getSql();
        if (!sql) return null;

        try {
          const rows = await sql`
            SELECT data, expires_at FROM cap_challenges
            WHERE token = ${token} AND expires_at > ${Date.now()}
            LIMIT 1
          `;
          if (rows.length === 0) return null;

          const row = rows[0];
          // Neon 自动解析 JSONB → 已经是对象
          const data = typeof row.data === 'string'
            ? JSON.parse(row.data)
            : row.data;

          // ⚠️ 必须返回 { challenge, expires } 格式
          return {
            challenge: data.challenge ?? data,
            expires: Number(row.expires_at),
          };
        } catch (err) {
          console.error('[cap] Error reading challenge:', err);
          return null;
        }
      },

      async delete(token: string) {
        const sql = getSql();
        if (!sql) return;
        await sql`DELETE FROM cap_challenges WHERE token = ${token}`;
      },

      async deleteExpired() {
        const sql = getSql();
        if (!sql) return;
        await sql`DELETE FROM cap_challenges WHERE expires_at <= ${Date.now()}`;
      },
    },

    tokens: {
      async store(key: string, expires: number) {
        const sql = getSql();
        if (!sql) return;

        await sql`
          INSERT INTO cap_tokens (token_hash, expires_at)
          VALUES (${key}, ${expires})
          ON CONFLICT (token_hash) DO UPDATE
          SET expires_at = EXCLUDED.expires_at
        `;
      },

      async get(key: string) {
        const sql = getSql();
        if (!sql) return null;

        try {
          const rows = await sql`
            SELECT expires_at FROM cap_tokens
            WHERE token_hash = ${key} AND expires_at > ${Date.now()}
            LIMIT 1
          `;
          return rows.length > 0 ? Number(rows[0].expires_at) : null;
        } catch (err) {
          console.error('[cap] Error reading token:', err);
          return null;
        }
      },

      async delete(key: string) {
        const sql = getSql();
        if (!sql) return;
        await sql`DELETE FROM cap_tokens WHERE token_hash = ${key}`;
      },

      async deleteExpired() {
        const sql = getSql();
        if (!sql) return;
        await sql`DELETE FROM cap_tokens WHERE expires_at <= ${Date.now()}`;
      },
    },
  },
});
