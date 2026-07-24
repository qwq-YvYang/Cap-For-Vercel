import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/validate
 *
 * 验证已颁发的令牌是否有效（未过期且未被消耗）。
 *
 * 请求体:
 *   { token: string, keepToken?: boolean }
 *
 * 响应:
 *   成功: { success: true }
 *   失败: { success: false }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initializeDatabase();

    const { token, keepToken } = req.body ?? {};

    if (!token) {
      return res.status(400)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json({ success: false });
    }

    // validateToken 内部流程:
    //   1. 解析 token (id:vertoken 格式)
    //   2. 计算 SHA-256(vertoken) 得到 token_hash
    //   3. 通过 storage.tokens.get 读取
    //   4. 如果 keepToken 为 false，通过 storage.tokens.delete 消耗令牌
    const result = await cap.validateToken(token, { keepToken });

    if (!result.success) {
      return res.status(400)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json({ success: false });
    }

    return res.status(200)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json({ success: true });
  } catch (error) {
    console.error('Failed to validate token:', error);
    return res.status(500)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json({ success: false });
  }
}
