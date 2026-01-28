-- GManager Database Schema
-- SQLite database for web backend

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  migrated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Raw imports table (永不修改，用于还原)
CREATE TABLE IF NOT EXISTS raw_imports (
  id TEXT PRIMARY KEY,
  raw_text TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'text', 'database')),
  source_name TEXT,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Groups table (互斥，一个账号只能属于一个分组)
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table (敏感字段加密存储)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  raw_import_id TEXT REFERENCES raw_imports(id),
  email TEXT NOT NULL,
  password TEXT,
  recovery_email TEXT,
  totp_secret TEXT,
  year TEXT,
  notes TEXT,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  field_order TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Account-Tag junction table (多对多)
CREATE TABLE IF NOT EXISTS account_tags (
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, tag_id)
);

-- Operation logs table
CREATE TABLE IF NOT EXISTS operation_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('import', 'update', 'delete', 'field_adjust', 'group_change', 'tag_add', 'tag_remove')),
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Master password hash storage
CREATE TABLE IF NOT EXISTS auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_group_id ON accounts(group_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_account_tags_account_id ON account_tags(account_id);
CREATE INDEX IF NOT EXISTS idx_account_tags_tag_id ON account_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_account_id ON operation_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
