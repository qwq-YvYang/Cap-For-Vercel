import { IncomingMessage, ServerResponse } from 'node:http';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/challenge
 * 创建新的 Cap 人机验证挑战。
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  // 设置 CORS
  const setCORS = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  if (req.method === 'OPTIONS') {
    setCORS();
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    setCORS();
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    await initializeDatabase();

    // 读取请求体
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : {};

    const result = await cap.createChallenge({
      challengeCount: body.challengeCount,
      challengeSize: body.challengeSize,
      challengeDifficulty: body.challengeDifficulty,
      expiresMs: body.expiresMs,
    });

    setCORS();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Failed to create challenge:', error);
    setCORS();
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
