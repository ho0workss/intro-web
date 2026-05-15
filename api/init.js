// DB 스키마 초기화 엔드포인트
// 사용법: GET /api/init?key=YOUR_INIT_KEY (env INIT_KEY와 일치해야 함)
import { sql, setCors } from '../lib/db.js';
import fs from 'node:fs';
import path from 'node:path';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const initKey = process.env.INIT_KEY;
  if (!initKey || req.query.key !== initKey) {
    return res.status(403).json({ error: 'INIT_KEY 일치하지 않음' });
  }

  try {
    // schema.sql 직접 실행 (statement 단위로 분리)
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results = [];
    for (const stmt of statements) {
      try {
        await sql.query(stmt);
        results.push({ ok: true, stmt: stmt.slice(0, 50) + '...' });
      } catch (e) {
        results.push({ ok: false, stmt: stmt.slice(0, 50) + '...', error: e.message });
      }
    }

    return res.json({ ok: true, count: results.length, results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
