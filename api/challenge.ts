import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/challenge
 *
 * 创建新的 Cap 人机验证挑战。
 * 客户端拿到 challenge + token 后渲染验证码并让用户计算 PoW 解。
 *
 * 请求体（可选）:
 *   { challengeCount?: number, challengeSize?: number, challengeDifficulty?: number, expiresMs?: number }
 *
 * 响应:
 *   { challenge: { c, s, d }, token: string, expires: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 首次冷启动时初始化数据库表（幂等操作）
    await initializeDatabase();

    const options = req.body ?? {};

    // createChallenge 在 v4.0.5 中是 async 的
    const result = await cap.createChallenge({
      challengeCount: options.challengeCount,
      challengeSize: options.challengeSize,
      challengeDifficulty: options.challengeDifficulty,
      expiresMs: options.expiresMs,
    });

    // result: { challenge: { c, s, d }, token, expires }
    return res.status(200)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json(result);
  } catch (error) {
    console.error('Failed to create challenge:', error);
    return res.status(500)
      .setHeader('Access-Control-Allow-Origin', '*')
      .json({ error: 'Internal server error' });
  }
}
