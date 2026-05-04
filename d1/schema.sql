-- ============================================================
-- 3D动画学院 - Cloudflare D1 数据库建表脚本
-- 使用方法: npx wrangler d1 execute 3d-academy-db --local --file=./d1/schema.sql
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 教程表
CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  cat TEXT NOT NULL,
  level TEXT NOT NULL,
  desc TEXT DEFAULT '',
  link TEXT NOT NULL,
  builtin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学习模块表
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '📚',
  category TEXT NOT NULL,
  desc TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 50,   -- 1-100 难度百分比
  color TEXT DEFAULT '#6ea8fe',    -- 主题色
  builtin INTEGER DEFAULT 0,       -- 0=自定义 1=内置
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学习路线进度（每个用户一条记录，存10个阶段的完成状态）
CREATE TABLE IF NOT EXISTS roadmap_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  checks TEXT DEFAULT '[]',  -- JSON 数组: [true, false, true, ...]
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 错题集
CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  wrong_answer TEXT DEFAULT '',
  correct_answer TEXT DEFAULT '',
  note TEXT DEFAULT '',
  mastered INTEGER DEFAULT 0,
  date TEXT DEFAULT '',
  files TEXT DEFAULT '[]',   -- JSON: [{name,size,type,key}, ...]
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 作业存储
CREATE TABLE IF NOT EXISTS homework (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT '未开始',
  deadline TEXT DEFAULT '',
  score TEXT DEFAULT '',
  desc TEXT DEFAULT '',
  date TEXT DEFAULT '',
  files TEXT DEFAULT '[]',    -- JSON: [{name,size,type,key}, ...]
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 文件元数据（R2文件记录）
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,       -- R2 对象键
  original_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT DEFAULT '',
  category TEXT DEFAULT 'general', -- mistake / homework / general
  related_id TEXT DEFAULT '',      -- 关联的错题或作业ID
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_modules_user ON modules(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_category ON modules(category);
CREATE INDEX IF NOT EXISTS idx_tutorials_user ON tutorials(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorials_cat ON tutorials(cat);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON mistakes(subject);
CREATE INDEX IF NOT EXISTS idx_homework_user ON homework(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_status ON homework(status);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_key ON files(key);
