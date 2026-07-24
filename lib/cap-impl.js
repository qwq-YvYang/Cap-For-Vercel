import { randomBytes, createHash, webcrypto } from 'node:crypto';
import { getSql } from './db.js';

// ---------- 工具函数 ----------

function randomHex(bytes) {
  if (webcrypto?.getRandomValues) {
    const b = new Uint8Array(bytes);
    webcrypto.getRandomValues(b);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  }
  return randomBytes(bytes).toString('hex');
}

function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

// FNV-1a 哈希算法（与 @cap.js/server 一致）
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

// 确定性伪随机数生成器（与 @cap.js/server 一致）
function prng(seed, length) {
  let state = fnv1a(seed);
  let result = '';
  function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  }
  while (result.length < length) {
    result += next().toString(16).padStart(8, '0');
  }
  return result.substring(0, length);
}

// ---------- 数据库操作 ----------

async function storeChallenge(token, challengeData) {
  const sql = getSql();
  if (!sql) return;
  await sql`
    INSERT INTO cap_challenges (token, data, expires_at)
    VALUES (${token}, ${JSON.stringify(challengeData)}, ${challengeData.expires})
    ON CONFLICT (token) DO UPDATE
    SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at
  `;
}

async function readChallenge(token) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT data, expires_at FROM cap_challenges
    WHERE token = ${token} AND expires_at > ${Date.now()}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const d = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
  return { challenge: d.challenge ?? d, expires: Number(rows[0].expires_at) };
}

async function deleteChallenge(token) {
  const sql = getSql();
  if (!sql) return;
  await sql`DELETE FROM cap_challenges WHERE token = ${token}`;
}

async function storeToken(key, expires) {
  const sql = getSql();
  if (!sql) return;
  await sql`
    INSERT INTO cap_tokens (token_hash, expires_at) VALUES (${key}, ${expires})
    ON CONFLICT (token_hash) DO UPDATE SET expires_at = EXCLUDED.expires_at
  `;
}

async function getToken(key) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT expires_at FROM cap_tokens
    WHERE token_hash = ${key} AND expires_at > ${Date.now()}
    LIMIT 1
  `;
  return rows.length > 0 ? Number(rows[0].expires_at) : null;
}

async function deleteToken(key) {
  const sql = getSql();
  if (!sql) return;
  await sql`DELETE FROM cap_tokens WHERE token_hash = ${key}`;
}

// ---------- 公开 API ----------

/**
 * 创建挑战
 */
export async function createChallenge(opts = {}) {
  const challenge = {
    c: opts.challengeCount ?? 50,
    s: opts.challengeSize ?? 32,
    d: opts.challengeDifficulty ?? 4,
  };
  const token = await randomHex(25);
  const expires = Date.now() + (opts.expiresMs ?? 600000);

  const challengeData = { expires, challenge };
  await storeChallenge(token, challengeData);

  return { challenge, token, expires };
}

/**
 * 兑换挑战（验证 PoW 解答）
 */
export async function redeemChallenge({ token, solutions }) {
  if (!token || !solutions || !Array.isArray(solutions) || solutions.some(s => typeof s !== 'number')) {
    return { success: false, message: 'Invalid body' };
  }

  const challengeData = await readChallenge(token);
  await deleteChallenge(token); // 防止重放

  if (!challengeData) {
    return { success: false, message: 'Challenge invalid or expired' };
  }

  // 验证每个 PoW 解
  let valid = true;
  for (let i = 0; i < challengeData.challenge.c; i++) {
    const salt = prng(`${token}${i + 1}`, challengeData.challenge.s);
    const target = prng(`${token}${i + 1}d`, challengeData.challenge.d);
    const hash = sha256(salt + solutions[i]);
    if (!hash.startsWith(target)) {
      valid = false;
      break;
    }
  }

  if (!valid) {
    return { success: false, message: 'Invalid solution' };
  }

  // 生成验证令牌
  const vertoken = await randomHex(15);
  const expires = Date.now() + 20 * 60 * 1000;
  const hash = await sha256(vertoken);
  const id = await randomHex(8);
  const tokenKey = `${id}:${hash}`;
  await storeToken(tokenKey, expires);

  return { success: true, token: `${id}:${vertoken}`, expires };
}

/**
 * 验证令牌有效性
 */
export async function validateToken(token, { keepToken = false } = {}) {
  if (!token || typeof token !== 'string') return { success: false };

  const parts = token.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { success: false };

  const [id, vertoken] = parts;
  const hash = sha256(vertoken);
  const key = `${id}:${hash}`;

  const expires = await getToken(key);
  if (expires && expires > Date.now()) {
    if (!keepToken) await deleteToken(key);
    return { success: true };
  }
  return { success: false };
}
