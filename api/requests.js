// GET /api/requests - 가입 신청 목록 (관리자만)
// POST /api/requests?action=approve  - 승인
// POST /api/requests?action=reject  - 거절
import { sql, requireAuth, setCors } from '../lib/db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin' && user.role !== 'manager') {
    return res.status(403).json({ error: '권한 없음' });
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT id, name, username, phone, requested_dept, hire_date, created_at FROM signup_requests ORDER BY created_at DESC`;
      return res.json({ requests: rows });
    }
    if (req.method === 'POST') {
      const action = req.query.action;
      const { id, dept, role, partners } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id 필요' });

      const { rows } = await sql`SELECT * FROM signup_requests WHERE id = ${id}`;
      const r = rows[0];
      if (!r) return res.status(404).json({ error: 'not found' });

      if (action === 'approve') {
        await sql`
          INSERT INTO users (username, name, password_hash, dept, role, phone, hire_date, total_leave, used_leave, partners)
          VALUES (${r.username}, ${r.name}, ${r.password_hash}, ${dept || r.requested_dept || '기타'}, ${role || 'member'},
                  ${r.phone}, ${r.hire_date}, 15, 0, ${JSON.stringify(partners || [])}::jsonb)
          ON CONFLICT (username) DO NOTHING
        `;
        await sql`DELETE FROM signup_requests WHERE id = ${id}`;
        return res.json({ ok: true, message: '승인 완료' });
      }
      if (action === 'reject') {
        await sql`DELETE FROM signup_requests WHERE id = ${id}`;
        return res.json({ ok: true, message: '거절됨' });
      }
      return res.status(400).json({ error: 'unknown action' });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
