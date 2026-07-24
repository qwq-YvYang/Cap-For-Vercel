import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 初始化数据库（函数体内，安全）
    await initializeDatabase();

    const result = await cap.createChallenge({
      challengeCount: req.body?.challengeCount,
      challengeSize: req.body?.challengeSize,
      challengeDifficulty: req.body?.challengeDifficulty,
      expiresMs: req.body?.expiresMs,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[cap] challenge error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
