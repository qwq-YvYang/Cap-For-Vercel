import { IncomingMessage, ServerResponse } from 'node:http';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

/**
 * POST /api/siteverify
 * Twikoo 兼容验证接口。
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
    const { secret, response: token } = JSON.parse(Buffer.concat(chunks).toString());

    if (!secret || !token) {
      setCORS();
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing secret or response' }));
      return;
    }

    if (secret !== process.env.CAP_SECRET_KEY) {
      setCORS();
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid secret' }));
      return;
    }

    const result = await cap.validateToken(token, { keepToken: false });

    setCORS();
    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: result.success }));
  } catch (error) {
    console.error('Failed to verify site token:', error);
    setCORS();
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
  }
}
