// Vercel Postgres 클라이언트 헬퍼
import { sql } from '@vercel/postgres';

export { sql };

// 세션 토큰 검증
export async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const { rows } = await sql`
      SELECT u.* FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token} AND s.expires_at > NOW()
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (e) {
    console.error('getUserFromToken error:', e);
    return null;
  }
}

// 요청에서 토큰 추출
export function getTokenFromReq(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// 인증 미들웨어
export async function requireAuth(req, res) {
  const token = getTokenFromReq(req);
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: '인증이 필요합니다' });
    return null;
  }
  return user;
}

// CORS 헬퍼
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}
