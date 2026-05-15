// GET /api/stream?room=ROOM_ID&since=ID
// Server-Sent Events 엔드포인트 - 실시간 메시지 전송
// Vercel 함수 실행시간 제한 때문에 약 25초 후 클라이언트가 재연결 필요
import { sql, requireAuth, setCors } from '../lib/db.js';

export const config = {
  maxDuration: 30,  // Vercel Hobby: 10초, Pro: 60초까지 가능
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 토큰을 query에서도 받음 (EventSource는 헤더 설정 불가)
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '인증 필요' });

  const { rows: userRows } = await sql`
    SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW() LIMIT 1
  `;
  if (userRows.length === 0) return res.status(401).json({ error: '세션 만료' });

  const room = req.query.room;
  if (!room) return res.status(400).json({ error: 'room 필요' });

  let lastId = parseInt(req.query.since || '0') || 0;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`: connected\n\n`);

  const POLL_MS = 2000;
  const MAX_DURATION_MS = 25000;
  const start = Date.now();
  let closed = false;
  req.on('close', () => { closed = true; });

  while (!closed && Date.now() - start < MAX_DURATION_MS) {
    try {
      const { rows } = await sql`
        SELECT m.id, m.room_id, m.user_id, m.content, m.type, m.file_url, m.file_name,
               m.edited, m.recalled, m.created_at, u.username, u.name
        FROM messages m JOIN users u ON u.id = m.user_id
        WHERE m.room_id = ${room} AND m.id > ${lastId}
        ORDER BY m.id ASC LIMIT 50
      `;
      if (rows.length > 0) {
        for (const msg of rows) {
          res.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
          lastId = msg.id;
        }
      } else {
        res.write(`: ping ${Date.now()}\n\n`);
      }
    } catch (e) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
      break;
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
  res.write(`event: reconnect\ndata: ${JSON.stringify({ since: lastId })}\n\n`);
  res.end();
}
