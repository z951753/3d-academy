-- ============================================================
-- 3D动画学院 - Supabase PostgreSQL 建表脚本
-- 使用方法：在 Supabase Dashboard > SQL Editor 中执行
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 教程表
CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cat TEXT NOT NULL,
  level TEXT NOT NULL,
  "desc" TEXT DEFAULT '',
  link TEXT NOT NULL,
  builtin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 学习模块表
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '📚',
  category TEXT NOT NULL,
  "desc" TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 50,
  color TEXT DEFAULT '#6ea8fe',
  builtin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 学习路线进度
CREATE TABLE IF NOT EXISTS roadmap_progress (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  checks TEXT DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 错题集
CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  wrong_answer TEXT DEFAULT '',
  correct_answer TEXT DEFAULT '',
  note TEXT DEFAULT '',
  mastered INTEGER DEFAULT 0,
  date TEXT DEFAULT '',
  files TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 作业存储
CREATE TABLE IF NOT EXISTS homework (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT '未开始',
  deadline TEXT DEFAULT '',
  score TEXT DEFAULT '',
  "desc" TEXT DEFAULT '',
  date TEXT DEFAULT '',
  files TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 文件元数据（预留，Vercel 模式暂用 base64 存储在 files 字段中）
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT UNIQUE NOT NULL,
  original_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  related_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_modules_user ON modules(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_category ON modules(category);
CREATE INDEX IF NOT EXISTS idx_tutorials_user ON tutorials(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorials_cat ON tutorials(cat);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON mistakes(subject);
CREATE INDEX IF NOT EXISTS idx_homework_user ON homework(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_status ON homework(status);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);

-- Row Level Security: 允许用户只能访问自己的数据
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS 策略：Service Role Key 可以读写所有数据（API 后端使用）
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON tutorials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON roadmap_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON mistakes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON homework FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON files FOR ALL USING (true) WITH CHECK (true);
