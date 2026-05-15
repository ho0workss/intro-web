-- INTRO 사내 인트라넷 - DB 스키마
-- Vercel Postgres에서 실행: /api/init?key=YOUR_INIT_KEY

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  dept TEXT DEFAULT '기타',
  role TEXT DEFAULT 'member',
  phone TEXT,
  hire_date DATE,
  total_leave NUMERIC DEFAULT 15,
  used_leave NUMERIC DEFAULT 0,
  partners JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  muted BOOLEAN DEFAULT false,
  folder_id TEXT,
  members JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  edited BOOLEAN DEFAULT false,
  recalled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  pinned BOOLEAN DEFAULT false,
  start_at TIMESTAMPTZ DEFAULT NOW(),
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,
  start_date DATE,
  end_date DATE,
  cost NUMERIC,
  reason TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signup_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  requested_dept TEXT,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  manager TEXT,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 관리자 (intro / dlsxmfh1!) - bcrypt 해시
INSERT INTO users (username, name, password_hash, dept, role, hire_date, total_leave, used_leave)
VALUES ('intro', '관리자', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '경영', 'admin', '2020-01-01', 20, 5)
ON CONFLICT (username) DO NOTHING;

-- 기본 채팅방
INSERT INTO rooms (id, name, pinned)
VALUES ('전체 공지방', '전체 공지방', true)
ON CONFLICT (id) DO NOTHING;
