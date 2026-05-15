// 인증 엔드포인트: POST /api/auth?action=login|register|me|logout
import { sql, setCors, getTokenFromReq, getUserFromToken } from '../lib/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 10;
const SESSION_DAYS = 7;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = req.query.action || (req.body && req.body.action);

  try {
    if (action === 'login') return await login(req, res);
    if (action === 'register') return await register(req, res);
    if (action === 'me') return await me(req, res);
    if (action === 'logout') return await logout(req, res);
    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    console.error('auth error:', e);
    return res.status(500).json({ error: e.message });
  }
}

async function login(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '아이디/비밀번호 필요' });

  const { rows } = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  const user = rows[0];
  if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다' });

  // 데모 호환: 평문 'dlsxmfh1!' 또는 '1234' 도 허용 (이전 demo 사용자 호환)
  const plainPasswords = { intro: 'dlsxmfh1!', kim: '1234', lee: '1234', park: '1234' };
  let ok = false;
  try { ok = await bcrypt.compare(password, user.password_hash); } catch { ok = false; }
  if (!ok && plainPasswords[username] === password) ok = true;
  if (!ok) return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다' });

  const token = crypto.randomBytes(32).toString('hex');
  await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${user.id}, NOW() + INTERVAL '${SESSION_DAYS} days')`;

  const { password_hash, ...safeUser } = user;
  return res.json({ ok: true, token, user: safeUser });
}

async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { name, phone, username, password, dept, hireDate } = req.body || {};
  if (!name || !username || !password) return res.status(400).json({ error: '필수 항목 누락' });

  const { rows: existing } = await sql`SELECT id FROM users WHERE username = ${username} UNION ALL SELECT id FROM signup_requests WHERE username = ${username}`;
  if (existing.length > 0) return res.status(409).json({ error: '이미 사용 중인 아이디' });

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  await sql`INSERT INTO signup_requests (name, username, phone, password_hash, requested_dept, hire_date) VALUES (${name}, ${username}, ${phone || null}, ${hash}, ${dept || null}, ${hireDate || null})`;
  return res.json({ ok: true, message: '가입 신청 완료. 관리자 승인 후 로그인하세요.' });
}

async function me(req, res) {
  const token = getTokenFromReq(req);
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: '인증 필요' });
  const { password_hash, ...safeUser } = user;
  return res.json({ user: safeUser });
}

async function logout(req, res) {
  const token = getTokenFromReq(req);
  if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
  return res.json({ ok: true });
}
