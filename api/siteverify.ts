import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/siteverify
 *
 * 兼容 Twikoo 的 Cap 官方验证接口。
 * Twikoo v1.7.14+ 通过此端点验证前端提交的 cap_token。
 *
 * 请求体:
 *   { secret: string, response: string }
 *
 * 响应:
 *   成功: { success: true }
 *   失败: { success: false, error: string }
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

    const { secret, response: token } = req.body ?? {};

    if (!secret || !token) {
      return res.status(400)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json({ success: false, error: 'Missing secret or response' });
    }

    // 验证 CAP_SECRET_KEY
    if (secret !== process.env.CAP_SECRET_KEY) {
      return res.status(403)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json({ success: false, error: 'Invalid secret' });
    }

    // 验证令牌（消耗该令牌，一次性使用）
    const result = await cap.validateToken(token, { keepToken: false });

    if (!result.success) {
      return res.status(400)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json({ success: false, error: 'Invalid or expired token' });
    }

    return res.status(200)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json({ success: true });
  } catch (error) {
    console.error('Failed to verify site token:', error);
    return res.status(500)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json({ success: false, error: 'Internal server error' });
  }
}
