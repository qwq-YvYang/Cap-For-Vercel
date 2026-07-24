import { IncomingMessage, ServerResponse } from 'node:http';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/redeem
 * 验证用户提交的 PoW 解答。
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
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

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const { token, solutions } = JSON.parse(Buffer.concat(chunks).toString());

    if (!token || !solutions || !Array.isArray(solutions)) {
      setCORS();
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Missing token or solutions' }));
      return;
    }

    const result = await cap.redeemChallenge({ token, solutions });

    const status = !result.success
      ? result.message === 'Challenge invalid or expired' ? 410 : 400
      : 200;

    setCORS();
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Failed to redeem challenge:', error);
    setCORS();
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
  }
}
