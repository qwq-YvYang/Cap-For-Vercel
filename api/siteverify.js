import { ensureTables } from '../lib/db.js';
import { validateToken } from '../lib/cap-impl.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureTables();

    const { secret, response: token } = req.body || {};
    if (!secret || !token) {
      return res.status(400).json({ success: false, error: 'Missing secret or response' });
    }
    if (secret !== process.env.CAP_SECRET_KEY) {
      return res.status(403).json({ success: false, error: 'Invalid secret' });
    }

    const result = await validateToken(token, { keepToken: false });
    return res.status(result.success ? 200 : 400).json({ success: result.success });
  } catch (error) {
    console.error('[cap] siteverify error:', error.message, error.stack);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
