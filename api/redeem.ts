import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/redeem
 *
 * 验证用户提交的 PoW 解答。
 * 成功后返回一个可用的验证令牌（一次性）。
 *
 * 请求体:
 *   { token: string, solutions: number[] }
 *
 * 响应:
 *   成功: { success: true, token: string, expires: number }
 *   失败: { success: false, message: string }
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

    const { token, solutions } = req.body ?? {};

    if (!token || !solutions || !Array.isArray(solutions)) {
      return res.status(400)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json({ success: false, message: 'Missing token or solutions' });
    }

    // redeemChallenge 内部流程:
    //   1. 通过 storage.challenges.read 读取挑战
    //   2. 通过 storage.challenges.delete 删除挑战（防止重放）
    //   3. 验证 PoW 解
    //   4. 如果成功，通过 storage.tokens.store 存储令牌
    //   5. 返回 { success, token, expires }
    const result = await cap.redeemChallenge({ token, solutions });

    if (!result.success) {
      const status = result.message === 'Challenge invalid or expired' ? 410 : 400;
      return res.status(status)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json(result);
    }

    return res.status(200)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json(result);
  } catch (error) {
    console.error('Failed to redeem challenge:', error);
    return res.status(500)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json({ success: false, message: 'Internal server error' });
  }
}
