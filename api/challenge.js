import { ensureTables } from '../lib/db.js';
import { createChallenge } from '../lib/cap-impl.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureTables();
    const result = await createChallenge(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error('[cap] challenge error:', error.message, error.stack);
    // 返回 JSON 而不是 HTML 错误页
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}
