// GET /api/announcements
// POST /api/announcements
// DELETE /api/announcements?id=N
import { sql, requireAuth, setCors } from '../lib/db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT a.*, u.name AS author_name, u.username AS author_username
        FROM announcements a LEFT JOIN users u ON u.id = a.author_id
        ORDER BY a.pinned DESC, a.created_at DESC LIMIT 100
      `;
      return res.json({ announcements: rows });
    }
    if (req.method === 'POST') {
      const { title, content, pinned, start_at, end_at } = req.body || {};
      if (!title) return res.status(400).json({ error: '제목 필요' });
      const { rows } = await sql`
        INSERT INTO announcements (title, content, author_id, pinned, start_at, end_at)
        VALUES (${title}, ${content || ''}, ${user.id}, ${!!pinned}, ${start_at || null}, ${end_at || null})
        RETURNING *
      `;
      return res.json({ ok: true, announcement: rows[0] });
    }
    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'id 필요' });
      // 본인 또는 관리자만 삭제 가능
      const { rows } = await sql`SELECT author_id FROM announcements WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      if (rows[0].author_id !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: '권한 없음' });
      }
      await sql`DELETE FROM announcements WHERE id = ${id}`;
      return res.json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
