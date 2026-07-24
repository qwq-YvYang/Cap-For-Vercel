import { IncomingMessage, ServerResponse } from 'node:http';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/validate
 * 验证已颁发的令牌是否有效。
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
    const { token, keepToken } = JSON.parse(Buffer.concat(chunks).toString());

    if (!token) {
      setCORS();
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false }));
      return;
    }

    const result = await cap.validateToken(token, { keepToken });

    setCORS();
    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: result.success }));
  } catch (error) {
    console.error('Failed to validate token:', error);
    setCORS();
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false }));
  }
}
