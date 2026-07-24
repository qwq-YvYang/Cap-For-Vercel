import { ensureTables } from '../lib/db.js';
import { redeemChallenge } from '../lib/cap-impl.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureTables();
    const { token, solutions } = req.body || {};
    if (!token || !solutions || !Array.isArray(solutions)) {
      return res.status(400).json({ success: false, message: 'Missing token or solutions' });
    }
    const result = await redeemChallenge({ token, solutions });
    const status = !result.success ? (result.message === 'Challenge invalid or expired' ? 410 : 400) : 200;
    return res.status(status).json(result);
  } catch (error) {
    console.error('[cap] redeem error:', error.message, error.stack);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
