// POST /api/upload - 파일 업로드 (Vercel Blob)
// Body: multipart form-data or raw binary
// Returns: { url, downloadUrl }
import { put } from '@vercel/blob';
import { requireAuth, setCors } from '../lib/db.js';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const filename = req.query.filename || `upload-${Date.now()}`;
    const blob = await put(`uploads/${user.id}/${filename}`, req, {
      access: 'public',
      addRandomSuffix: true,
    });
    return res.json({ ok: true, url: blob.url, downloadUrl: blob.downloadUrl });
  } catch (e) {
    console.error('upload error:', e);
    return res.status(500).json({ error: e.message });
  }
}
