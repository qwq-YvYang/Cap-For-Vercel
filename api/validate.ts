import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cap } from '../lib/cap';
import { initializeDatabase } from '../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initializeDatabase();

    const { token, keepToken } = req.body ?? {};

    if (!token) {
      return res.status(400).json({ success: false });
    }

    const result = await cap.validateToken(token, { keepToken });

    return res.status(result.success ? 200 : 400).json({ success: result.success });
  } catch (error) {
    console.error('[cap] validate error:', error);
    return res.status(500).json({ success: false });
  }
}
