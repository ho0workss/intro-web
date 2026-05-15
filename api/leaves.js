// GET /api/leaves - 휴가 목록
// POST /api/leaves - 휴가 신청 (자동 승인, 잔여 차감)
import { sql, requireAuth, setCors } from '../lib/db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT l.*, u.name, u.username FROM leaves l
        JOIN users u ON u.id = l.user_id
        ORDER BY l.created_at DESC LIMIT 500
      `;
      return res.json({ leaves: rows });
    }
    if (req.method === 'POST') {
      const { type, start_date, end_date, cost, reason, file_name } = req.body || {};
      if (!type || !start_date || !end_date) return res.status(400).json({ error: '필수 항목 누락' });
      const days = Number(cost) || 0;
      const { rows } = await sql`
        INSERT INTO leaves (user_id, type, start_date, end_date, cost, reason, file_name, status)
        VALUES (${user.id}, ${type}, ${start_date}, ${end_date}, ${days}, ${reason || ''}, ${file_name || ''}, 'approved')
        RETURNING *
      `;
      // 잔여 차감 (공가/병가 제외)
      if (type !== '공가' && type !== '병가' && days > 0) {
        await sql`UPDATE users SET used_leave = COALESCE(used_leave, 0) + ${days} WHERE id = ${user.id}`;
      }
      return res.json({ ok: true, leave: rows[0] });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
