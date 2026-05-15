// GET /api/users - 사용자 목록 (인증 필요)
// PUT /api/users?action=profile  - 본인 프로필 수정 (입사일 등)
// PUT /api/users?action=role  - 관리자: 멤버 역할 변경
// DELETE /api/users?username=  - 관리자: 강퇴
import { sql, requireAuth, setCors } from '../lib/db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, username, name, dept, role, phone, hire_date, total_leave, used_leave, partners
        FROM users ORDER BY id ASC
      `;
      return res.json({ users: rows });
    }

    if (req.method === 'PUT') {
      const action = req.query.action;
      if (action === 'profile') {
        const { hire_date, phone } = req.body || {};
        await sql`UPDATE users SET hire_date = COALESCE(${hire_date || null}::date, hire_date), phone = COALESCE(${phone || null}, phone) WHERE id = ${user.id}`;
        return res.json({ ok: true });
      }
      if (action === 'role') {
        if (user.role !== 'admin') return res.status(403).json({ error: '관리자 권한 필요' });
        const { username, role } = req.body || {};
        await sql`UPDATE users SET role = ${role} WHERE username = ${username}`;
        return res.json({ ok: true });
      }
      if (action === 'partners') {
        if (user.role !== 'admin') return res.status(403).json({ error: '관리자 권한 필요' });
        const { username, partners } = req.body || {};
        await sql`UPDATE users SET partners = ${JSON.stringify(partners || [])}::jsonb WHERE username = ${username}`;
        return res.json({ ok: true });
      }
      return res.status(400).json({ error: 'unknown action' });
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'admin') return res.status(403).json({ error: '관리자 권한 필요' });
      const username = req.query.username;
      if (!username) return res.status(400).json({ error: 'username 필요' });
      if (username === user.username) return res.status(400).json({ error: '본인은 강퇴 불가' });
      await sql`DELETE FROM users WHERE username = ${username}`;
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
