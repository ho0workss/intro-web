// GET /api/messages?room=ROOM_ID&since=ID  - 메시지 조회
// POST /api/messages  - 메시지 전송
import { sql, requireAuth, setCors } from '../lib/db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') return await list(req, res, user);
    if (req.method === 'POST') return await send(req, res, user);
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error('messages error:', e);
    return res.status(500).json({ error: e.message });
  }
}

async function list(req, res, user) {
  const room = req.query.room;
  const since = parseInt(req.query.since || '0') || 0;
  if (!room) return res.status(400).json({ error: 'room 필요' });

  const { rows } = await sql`
    SELECT m.id, m.room_id, m.user_id, m.content, m.type, m.file_url, m.file_name,
           m.edited, m.recalled, m.created_at,
           u.username, u.name
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.room_id = ${room} AND m.id > ${since}
    ORDER BY m.id ASC
    LIMIT 200
  `;
  return res.json({ messages: rows });
}

async function send(req, res, user) {
  const { room, content, type, fileUrl, fileName } = req.body || {};
  if (!room) return res.status(400).json({ error: 'room 필요' });
  if (!content && !fileUrl) return res.status(400).json({ error: '내용 또는 파일 필요' });

  // 방이 없으면 자동 생성
  await sql`INSERT INTO rooms (id, name) VALUES (${room}, ${room}) ON CONFLICT (id) DO NOTHING`;

  const { rows } = await sql`
    INSERT INTO messages (room_id, user_id, content, type, file_url, file_name)
    VALUES (${room}, ${user.id}, ${content || null}, ${type || 'text'}, ${fileUrl || null}, ${fileName || null})
    RETURNING id, created_at
  `;
  return res.json({ ok: true, id: rows[0].id, created_at: rows[0].created_at });
}
