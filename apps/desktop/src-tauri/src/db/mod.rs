//! Database module for GManager Desktop
//!
//! This module provides SQLite database operations including:
//! - Account management (CRUD operations)
//! - Group management for organizing accounts
//! - Tag management for categorization
//! - Operation logging for audit trails
//! - Undo/redo functionality

use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

// ============================================================================
// Error Types
// ============================================================================

/// Database error type wrapping rusqlite errors with additional context
#[derive(Debug)]
pub enum DbError {
    /// SQLite error from rusqlite
    Sqlite(rusqlite::Error),
    /// Database not initialized
    NotInitialized,
    /// Invalid input data
    InvalidInput(String),
    /// Record not found
    NotFound(String),
}

impl std::fmt::Display for DbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DbError::Sqlite(e) => write!(f, "SQLite error: {}", e),
            DbError::NotInitialized => write!(f, "Database not initialized"),
            DbError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            DbError::NotFound(msg) => write!(f, "Not found: {}", msg),
        }
    }
}

impl std::error::Error for DbError {}

impl From<rusqlite::Error> for DbError {
    fn from(err: rusqlite::Error) -> Self {
        DbError::Sqlite(err)
    }
}

/// Result type for database operations
pub type DbResult<T> = Result<T, DbError>;

// ============================================================================
// Database Connection (Singleton Pattern)
// ============================================================================

/// Database connection wrapper using singleton pattern
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Database {
            conn: Arc::clone(&self.conn),
        }
    }
}

impl Database {
    /// Get the database file path from Tauri app directories
    fn get_db_path(app_handle: &AppHandle) -> PathBuf {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");

        // Ensure directory exists
        std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

        app_dir.join("gmanager.db")
    }

    /// Initialize the database with connection and schema
    pub fn init(app_handle: &AppHandle) -> DbResult<Self> {
        let db_path = Self::get_db_path(app_handle);
        let conn = Connection::open(&db_path)?;

        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])?;

        // Create schema
        Self::create_schema(&conn)?;

        Ok(Database {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Initialize database for testing with in-memory database
    #[cfg(test)]
    pub fn init_in_memory() -> DbResult<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        Self::create_schema(&conn)?;

        Ok(Database {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Create all database tables and indexes
    fn create_schema(conn: &Connection) -> DbResult<()> {
        // Create raw_imports table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS raw_imports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_text TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_name TEXT,
                imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create groups table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#6366f1',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create tags table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#10b981',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create accounts table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_import_id INTEGER,
                email TEXT NOT NULL,
                password TEXT NOT NULL,
                recovery_email TEXT,
                totp_secret TEXT,
                year INTEGER,
                notes TEXT,
                group_id INTEGER,
                field_order TEXT DEFAULT 'email,password,recovery_email,totp_secret,year,notes',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (raw_import_id) REFERENCES raw_imports(id) ON DELETE SET NULL,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
            )",
            [],
        )?;

        // Create account_tags junction table (many-to-many)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS account_tags (
                account_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                PRIMARY KEY (account_id, tag_id),
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create operation_logs table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS operation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
            )",
            [],
        )?;

        // Create undo_stack table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS undo_stack (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_type TEXT NOT NULL,
                undo_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create indexes for better query performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_accounts_group_id ON accounts(group_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_operation_logs_account_id ON operation_logs(account_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at)",
            [],
        )?;

        // Create default group if none exists
        let group_count: i64 = conn.query_row("SELECT COUNT(*) FROM groups", [], |row| row.get(0))?;
        if group_count == 0 {
            conn.execute(
                "INSERT INTO groups (name, color, sort_order) VALUES ('Default', '#6366f1', 0)",
                [],
            )?;
        }

        Ok(())
    }

    /// Get a connection lock for operations
    pub(crate) fn get_conn(&self) -> std::sync::MutexGuard<Connection> {
        self.conn
            .lock()
            .expect("Database connection lock poisoned")
    }
}

// ============================================================================
// Data Models
// ============================================================================

/// Raw import data from various sources
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RawImport {
    pub id: i64,
    pub raw_text: String,
    pub source_type: String,
    pub source_name: Option<String>,
    pub imported_at: String,
}

/// Account record
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Account {
    pub id: i64,
    pub raw_import_id: Option<i64>,
    pub email: String,
    pub password: String,
    pub recovery_email: Option<String>,
    pub totp_secret: Option<String>,
    pub year: Option<i32>,
    pub notes: Option<String>,
    pub group_id: Option<i64>,
    pub field_order: String,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<Tag>,
}

/// Account creation data
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateAccount {
    pub raw_import_id: Option<i64>,
    pub email: String,
    pub password: String,
    pub recovery_email: Option<String>,
    pub totp_secret: Option<String>,
    pub year: Option<i32>,
    pub notes: Option<String>,
    pub group_id: Option<i64>,
    pub field_order: Option<String>,
}

/// Account update data
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateAccount {
    pub id: i64,
    pub email: Option<String>,
    pub password: Option<String>,
    pub recovery_email: Option<String>,
    pub totp_secret: Option<String>,
    pub year: Option<i32>,
    pub notes: Option<String>,
    pub group_id: Option<i64>,
    pub field_order: Option<String>,
}

/// Group for organizing accounts
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Group {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
    pub created_at: String,
}

/// Group creation/update data
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateGroup {
    pub name: String,
    pub color: String,
    pub sort_order: i32,
}

/// Tag for categorizing accounts
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

/// Tag creation/update data
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateTag {
    pub name: String,
    pub color: String,
}

/// Operation log entry
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OperationLog {
    pub id: i64,
    pub account_id: Option<i64>,
    pub action: String,
    pub details: Option<String>,
    pub created_at: String,
}

/// Pagination parameters
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct Pagination {
    pub offset: i64,
    pub limit: i64,
}

impl Pagination {
    pub fn new(offset: i64, limit: i64) -> Self {
        Self { offset, limit }
    }
}

/// Account search filters
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct AccountSearch {
    pub query: Option<String>,
    pub group_id: Option<i64>,
    pub tag_id: Option<i64>,
    pub year: Option<i32>,
    pub pagination: Pagination,
}

// ============================================================================
// CRUD Operations for Accounts
// ============================================================================

impl Database {
    /// Create a new account
    pub fn create_account(&self, account: CreateAccount) -> DbResult<i64> {
        let conn = self.get_conn();

        let field_order = account.field_order.unwrap_or_else(|| {
            "email,password,recovery_email,totp_secret,year,notes".to_string()
        });

        conn.execute(
            "INSERT INTO accounts (
                raw_import_id, email, password, recovery_email, totp_secret,
                year, notes, group_id, field_order
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                account.raw_import_id,
                account.email,
                account.password,
                account.recovery_email,
                account.totp_secret,
                account.year,
                account.notes,
                account.group_id,
                field_order,
            ],
        )?;

        let account_id = conn.last_insert_rowid();

        // Log the operation
        self.log_operation_internal(
            &conn,
            Some(account_id),
            "CREATE",
            Some(&format!("Created account: {}", account.email)),
        )?;

        Ok(account_id)
    }

    /// Get account by ID with tags
    pub fn get_account(&self, id: i64) -> DbResult<Account> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare(
            "SELECT id, raw_import_id, email, password, recovery_email,
                    totp_secret, year, notes, group_id, field_order, created_at, updated_at
             FROM accounts WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        let row = rows.next()?.ok_or(DbError::NotFound(format!("Account {}", id)))?;

        let account = Account {
            id: row.get(0)?,
            raw_import_id: row.get(1)?,
            email: row.get(2)?,
            password: row.get(3)?,
            recovery_email: row.get(4)?,
            totp_secret: row.get(5)?,
            year: row.get(6)?,
            notes: row.get(7)?,
            group_id: row.get(8)?,
            field_order: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
            tags: self.get_tags_for_account(&conn, id)?,
        };

        Ok(account)
    }

    /// Get all accounts with pagination
    pub fn get_accounts(&self, pagination: Option<Pagination>) -> DbResult<Vec<Account>> {
        let conn = self.get_conn();
        let pag = pagination.unwrap_or_default();

        let mut stmt = conn.prepare(
            "SELECT id, raw_import_id, email, password, recovery_email,
                    totp_secret, year, notes, group_id, field_order, created_at, updated_at
             FROM accounts
             ORDER BY created_at DESC
             LIMIT ?1 OFFSET ?2"
        )?;

        let mut rows = stmt.query(params![pag.limit, pag.offset])?;
        let mut accounts = Vec::new();

        while let Some(row) = rows.next()? {
            let account_id: i64 = row.get(0)?;
            let account = Account {
                id: account_id,
                raw_import_id: row.get(1)?,
                email: row.get(2)?,
                password: row.get(3)?,
                recovery_email: row.get(4)?,
                totp_secret: row.get(5)?,
                year: row.get(6)?,
                notes: row.get(7)?,
                group_id: row.get(8)?,
                field_order: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                tags: self.get_tags_for_account(&conn, account_id)?,
            };
            accounts.push(account);
        }

        Ok(accounts)
    }

    /// Get total count of accounts
    pub fn get_accounts_count(&self) -> DbResult<i64> {
        let conn = self.get_conn();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM accounts", [], |row| row.get(0))?;
        Ok(count)
    }

    /// Update an existing account
    pub fn update_account(&self, account: UpdateAccount) -> DbResult<()> {
        let conn = self.get_conn();

        // Build dynamic UPDATE query based on provided fields
        let mut updates = Vec::new();
        let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();

        if let Some(ref email) = account.email {
            updates.push("email = ?");
            params.push(email);
        }
        if let Some(ref password) = account.password {
            updates.push("password = ?");
            params.push(password);
        }
        if let Some(ref recovery_email) = account.recovery_email {
            updates.push("recovery_email = ?");
            params.push(recovery_email);
        }
        if let Some(ref totp_secret) = account.totp_secret {
            updates.push("totp_secret = ?");
            params.push(totp_secret);
        }
        if account.year.is_some() {
            updates.push("year = ?");
            params.push(&account.year);
        }
        if let Some(ref notes) = account.notes {
            updates.push("notes = ?");
            params.push(notes);
        }
        if account.group_id.is_some() {
            updates.push("group_id = ?");
            params.push(&account.group_id);
        }
        if let Some(ref field_order) = account.field_order {
            updates.push("field_order = ?");
            params.push(field_order);
        }

        if updates.is_empty() {
            return Err(DbError::InvalidInput("No fields to update".to_string()));
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");
        params.push(&account.id);

        let query = format!("UPDATE accounts SET {} WHERE id = ?", updates.join(", "));

        let affected = conn.execute(&query, params.as_slice())?;

        if affected == 0 {
            return Err(DbError::NotFound(format!("Account {}", account.id)));
        }

        // Log the operation
        self.log_operation_internal(
            &conn,
            Some(account.id),
            "UPDATE",
            Some(&format!("Updated account {}", account.id)),
        )?;

        Ok(())
    }

    /// Delete an account by ID (cascades to account_tags)
    pub fn delete_account(&self, id: i64) -> DbResult<()> {
        let conn = self.get_conn();

        let affected = conn.execute("DELETE FROM accounts WHERE id = ?1", params![id])?;

        if affected == 0 {
            return Err(DbError::NotFound(format!("Account {}", id)));
        }

        // Log the operation (account_id will be NULL in logs since account is deleted)
        self.log_operation_internal(
            &conn,
            None,
            "DELETE",
            Some(&format!("Deleted account {}", id)),
        )?;

        Ok(())
    }

    /// Search accounts with filters
    pub fn search_accounts(&self, search: AccountSearch) -> DbResult<Vec<Account>> {
        let conn = self.get_conn();

        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Text search across multiple fields
        if let Some(ref query) = search.query {
            if !query.trim().is_empty() {
                conditions.push("(email LIKE ? OR recovery_email LIKE ? OR notes LIKE ?)");
                let like_pattern = format!("%{}%", query);
                params.push(Box::new(like_pattern.clone()));
                params.push(Box::new(like_pattern.clone()));
                params.push(Box::new(like_pattern));
            }
        }

        // Filter by group
        if let Some(group_id) = search.group_id {
            conditions.push("group_id = ?");
            params.push(Box::new(group_id));
        }

        // Filter by year
        if let Some(year) = search.year {
            conditions.push("year = ?");
            params.push(Box::new(year));
        }

        // Filter by tag (requires JOIN)
        let with_join = search.tag_id.is_some();
        if let Some(tag_id) = search.tag_id {
            conditions.push("account_tags.tag_id = ?");
            params.push(Box::new(tag_id));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let from_clause = if with_join {
            "accounts INNER JOIN account_tags ON accounts.id = account_tags.account_id"
        } else {
            "accounts"
        };

        let query = format!(
            "SELECT DISTINCT accounts.id, accounts.raw_import_id, accounts.email,
                    accounts.password, accounts.recovery_email, accounts.totp_secret,
                    accounts.year, accounts.notes, accounts.group_id, accounts.field_order,
                    accounts.created_at, accounts.updated_at
             FROM {}
             {}
             ORDER BY accounts.created_at DESC
             LIMIT ? OFFSET ?",
            from_clause, where_clause
        );

        let pag = &search.pagination;
        params.push(Box::new(pag.limit));
        params.push(Box::new(pag.offset));

        // Convert params to references for query
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        let mut stmt = conn.prepare(&query)?;

        let mut rows = stmt.query(params_refs.as_slice())?;
        let mut accounts = Vec::new();

        while let Some(row) = rows.next()? {
            let account_id: i64 = row.get(0)?;
            let account = Account {
                id: account_id,
                raw_import_id: row.get(1)?,
                email: row.get(2)?,
                password: row.get(3)?,
                recovery_email: row.get(4)?,
                totp_secret: row.get(5)?,
                year: row.get(6)?,
                notes: row.get(7)?,
                group_id: row.get(8)?,
                field_order: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                tags: self.get_tags_for_account(&conn, account_id)?,
            };
            accounts.push(account);
        }

        Ok(accounts)
    }

    /// Get tags for a specific account
    fn get_tags_for_account(&self, conn: &Connection, account_id: i64) -> DbResult<Vec<Tag>> {
        let mut stmt = conn.prepare(
            "SELECT t.id, t.name, t.color, t.created_at
             FROM tags t
             INNER JOIN account_tags at ON t.id = at.tag_id
             WHERE at.account_id = ?1
             ORDER BY t.name"
        )?;

        let mut rows = stmt.query(params![account_id])?;
        let mut tags = Vec::new();

        while let Some(row) = rows.next()? {
            tags.push(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            });
        }

        Ok(tags)
    }
}

// ============================================================================
// Group Operations
// ============================================================================

impl Database {
    /// Create a new group
    pub fn create_group(&self, group: CreateGroup) -> DbResult<i64> {
        let conn = self.get_conn();

        conn.execute(
            "INSERT INTO groups (name, color, sort_order) VALUES (?1, ?2, ?3)",
            params![group.name, group.color, group.sort_order],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get group by ID
    pub fn get_group(&self, id: i64) -> DbResult<Group> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare("SELECT id, name, color, sort_order, created_at FROM groups WHERE id = ?1")?;

        let mut rows = stmt.query(params![id])?;

        let row = rows.next()?.ok_or(DbError::NotFound(format!("Group {}", id)))?;

        Ok(Group {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            sort_order: row.get(3)?,
            created_at: row.get(4)?,
        })
    }

    /// Get all groups ordered by sort_order
    pub fn get_groups(&self) -> DbResult<Vec<Group>> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare("SELECT id, name, color, sort_order, created_at FROM groups ORDER BY sort_order, name")?;

        let mut rows = stmt.query([])?;
        let mut groups = Vec::new();

        while let Some(row) = rows.next()? {
            groups.push(Group {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
            });
        }

        Ok(groups)
    }

    /// Update a group
    pub fn update_group(&self, id: i64, group: CreateGroup) -> DbResult<()> {
        let conn = self.get_conn();

        let affected = conn.execute(
            "UPDATE groups SET name = ?1, color = ?2, sort_order = ?3 WHERE id = ?4",
            params![group.name, group.color, group.sort_order, id],
        )?;

        if affected == 0 {
            return Err(DbError::NotFound(format!("Group {}", id)));
        }

        Ok(())
    }

    /// Delete a group (accounts' group_id will be set to NULL)
    pub fn delete_group(&self, id: i64) -> DbResult<()> {
        let conn = self.get_conn();

        let affected = conn.execute("DELETE FROM groups WHERE id = ?1", params![id])?;

        if affected == 0 {
            return Err(DbError::NotFound(format!("Group {}", id)));
        }

        Ok(())
    }

    /// Get accounts count for a group
    pub fn get_group_accounts_count(&self, group_id: i64) -> DbResult<i64> {
        let conn = self.get_conn();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM accounts WHERE group_id = ?1",
            params![group_id],
            |row| row.get(0),
        )?;
        Ok(count)
    }
}

// ============================================================================
// Tag Operations
// ============================================================================

impl Database {
    /// Create a new tag
    pub fn create_tag(&self, tag: CreateTag) -> DbResult<i64> {
        let conn = self.get_conn();

        conn.execute(
            "INSERT INTO tags (name, color) VALUES (?1, ?2)",
            params![tag.name, tag.color],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get tag by ID
    pub fn get_tag(&self, id: i64) -> DbResult<Tag> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare("SELECT id, name, color, created_at FROM tags WHERE id = ?1")?;

        let mut rows = stmt.query(params![id])?;

        let row = rows.next()?.ok_or(DbError::NotFound(format!("Tag {}", id)))?;

        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
        })
    }

    /// Get all tags
    pub fn get_tags(&self) -> DbResult<Vec<Tag>> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare("SELECT id, name, color, created_at FROM tags ORDER BY name")?;

        let mut rows = stmt.query([])?;
        let mut tags = Vec::new();

        while let Some(row) = rows.next()? {
            tags.push(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            });
        }

        Ok(tags)
    }

    /// Update a tag
    pub fn update_tag(&self, id: i64, tag: CreateTag) -> DbResult<()> {
        let conn = self.get_conn();

        let affected = conn.execute(
            "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
            params![tag.name, tag.color, id],
        )?;

        if affected == 0 {
            return Err(DbError::NotFound(format!("Tag {}", id)));
        }

        Ok(())
    }

    /// Delete a tag (cascades to account_tags)
    pub fn delete_tag(&self, id: i64) -> DbResult<()> {
        let conn = self.get_conn();

        let affected = conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;

        if affected == 0 {
            return Err(DbError::NotFound(format!("Tag {}", id)));
        }

        Ok(())
    }

    /// Add a tag to an account
    pub fn add_tag_to_account(&self, account_id: i64, tag_id: i64) -> DbResult<()> {
        let conn = self.get_conn();

        // Verify account exists
        let account_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM accounts WHERE id = ?1",
            params![account_id],
            |row| row.get(0),
        )?;

        if account_exists == 0 {
            return Err(DbError::NotFound(format!("Account {}", account_id)));
        }

        // Verify tag exists
        let tag_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM tags WHERE id = ?1",
            params![tag_id],
            |row| row.get(0),
        )?;

        if tag_exists == 0 {
            return Err(DbError::NotFound(format!("Tag {}", tag_id)));
        }

        conn.execute(
            "INSERT OR IGNORE INTO account_tags (account_id, tag_id) VALUES (?1, ?2)",
            params![account_id, tag_id],
        )?;

        // Log the operation
        self.log_operation_internal(
            &conn,
            Some(account_id),
            "ADD_TAG",
            Some(&format!("Added tag {} to account", tag_id)),
        )?;

        Ok(())
    }

    /// Remove a tag from an account
    pub fn remove_tag_from_account(&self, account_id: i64, tag_id: i64) -> DbResult<()> {
        let conn = self.get_conn();

        let affected = conn.execute(
            "DELETE FROM account_tags WHERE account_id = ?1 AND tag_id = ?2",
            params![account_id, tag_id],
        )?;

        if affected == 0 {
            return Err(DbError::NotFound(format!(
                "Tag {} not associated with account {}",
                tag_id, account_id
            )));
        }

        // Log the operation
        self.log_operation_internal(
            &conn,
            Some(account_id),
            "REMOVE_TAG",
            Some(&format!("Removed tag {} from account", tag_id)),
        )?;

        Ok(())
    }

    /// Get all tags for an account
    pub fn get_account_tags(&self, account_id: i64) -> DbResult<Vec<Tag>> {
        let conn = self.get_conn();
        self.get_tags_for_account(&conn, account_id)
    }

    /// Get accounts count for a tag
    pub fn get_tag_accounts_count(&self, tag_id: i64) -> DbResult<i64> {
        let conn = self.get_conn();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM account_tags WHERE tag_id = ?1",
            params![tag_id],
            |row| row.get(0),
        )?;
        Ok(count)
    }
}

// ============================================================================
// Raw Import Operations
// ============================================================================

impl Database {
    /// Create a raw import entry
    pub fn create_raw_import(
        &self,
        raw_text: String,
        source_type: String,
        source_name: Option<String>,
    ) -> DbResult<i64> {
        let conn = self.get_conn();

        conn.execute(
            "INSERT INTO raw_imports (raw_text, source_type, source_name) VALUES (?1, ?2, ?3)",
            params![raw_text, source_type, source_name],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get raw import by ID
    pub fn get_raw_import(&self, id: i64) -> DbResult<RawImport> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare(
            "SELECT id, raw_text, source_type, source_name, imported_at
             FROM raw_imports WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        let row = rows.next()?.ok_or(DbError::NotFound(format!("Raw import {}", id)))?;

        Ok(RawImport {
            id: row.get(0)?,
            raw_text: row.get(1)?,
            source_type: row.get(2)?,
            source_name: row.get(3)?,
            imported_at: row.get(4)?,
        })
    }

    /// Delete a raw import
    pub fn delete_raw_import(&self, id: i64) -> DbResult<()> {
        let conn = self.get_conn();

        let affected = conn.execute("DELETE FROM raw_imports WHERE id = ?1", params![id])?;

        if affected == 0 {
            return Err(DbError::NotFound(format!("Raw import {}", id)));
        }

        Ok(())
    }
}

// ============================================================================
// Operation Logging
// ============================================================================

impl Database {
    /// Log an operation for audit trail
    pub fn log_operation(
        &self,
        account_id: Option<i64>,
        action: &str,
        details: Option<&str>,
    ) -> DbResult<()> {
        let conn = self.get_conn();
        self.log_operation_internal(&conn, account_id, action, details)
    }

    /// Internal logging helper that accepts a connection reference
    fn log_operation_internal(
        &self,
        conn: &Connection,
        account_id: Option<i64>,
        action: &str,
        details: Option<&str>,
    ) -> DbResult<()> {
        conn.execute(
            "INSERT INTO operation_logs (account_id, action, details) VALUES (?1, ?2, ?3)",
            params![account_id, action, details],
        )?;

        Ok(())
    }

    /// Get operation logs for an account
    pub fn get_operation_logs(
        &self,
        account_id: Option<i64>,
        limit: i64,
    ) -> DbResult<Vec<OperationLog>> {
        let conn = self.get_conn();

        let query = if let Some(aid) = account_id {
            "SELECT id, account_id, action, details, created_at
             FROM operation_logs
             WHERE account_id = ?1
             ORDER BY created_at DESC
             LIMIT ?2"
        } else {
            "SELECT id, account_id, action, details, created_at
             FROM operation_logs
             ORDER BY created_at DESC
             LIMIT ?1"
        };

        let mut stmt = conn.prepare(query)?;

        let mut rows = if let Some(aid) = account_id {
            stmt.query(params![aid, limit])?
        } else {
            stmt.query(params![limit])?
        };

        let mut logs = Vec::new();

        while let Some(row) = rows.next()? {
            logs.push(OperationLog {
                id: row.get(0)?,
                account_id: row.get(1)?,
                action: row.get(2)?,
                details: row.get(3)?,
                created_at: row.get(4)?,
            });
        }

        Ok(logs)
    }

    /// Clear old operation logs (for maintenance)
    pub fn clear_old_logs(&self, days: i64) -> DbResult<i64> {
        let conn = self.get_conn();

        let affected = conn.execute(
            "DELETE FROM operation_logs WHERE created_at < datetime('now', '-' || ?1 || ' days')",
            params![days],
        )?;

        Ok(affected as i64)
    }
}

// ============================================================================
// Undo/Redo Stack Operations
// ============================================================================

impl Database {
    /// Push an operation to the undo stack
    pub fn push_undo(&self, operation_type: &str, undo_data: &str) -> DbResult<i64> {
        let conn = self.get_conn();

        conn.execute(
            "INSERT INTO undo_stack (operation_type, undo_data) VALUES (?1, ?2)",
            params![operation_type, undo_data],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get the latest undo operation
    pub fn pop_undo(&self) -> DbResult<Option<(i64, String, String)>> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare(
            "SELECT id, operation_type, undo_data
             FROM undo_stack
             ORDER BY id DESC
             LIMIT 1"
        )?;

        let mut rows = stmt.query([])?;

        if let Some(row) = rows.next()? {
            let id: i64 = row.get(0)?;
            let operation_type: String = row.get(1)?;
            let undo_data: String = row.get(2)?;

            // Delete the popped entry
            conn.execute("DELETE FROM undo_stack WHERE id = ?1", params![id])?;

            Ok(Some((id, operation_type, undo_data)))
        } else {
            Ok(None)
        }
    }

    /// Get all undo operations
    pub fn get_undo_stack(&self, limit: i64) -> DbResult<Vec<(i64, String, String)>> {
        let conn = self.get_conn();

        let mut stmt = conn.prepare(
            "SELECT id, operation_type, undo_data
             FROM undo_stack
             ORDER BY id DESC
             LIMIT ?1"
        )?;

        let mut rows = stmt.query(params![limit])?;
        let mut result = Vec::new();

        while let Some(row) = rows.next()? {
            result.push((row.get(0)?, row.get(1)?, row.get(2)?));
        }

        Ok(result)
    }

    /// Clear the undo stack
    pub fn clear_undo_stack(&self) -> DbResult<i64> {
        let conn = self.get_conn();
        let affected = conn.execute("DELETE FROM undo_stack", [])?;
        Ok(affected as i64)
    }
}

// ============================================================================
// Statistics and Reporting
// ============================================================================

impl Database {
    /// Get database statistics
    pub fn get_stats(&self) -> DbResult<DatabaseStats> {
        let conn = self.get_conn();

        let accounts_count: i64 = conn.query_row("SELECT COUNT(*) FROM accounts", [], |row| row.get(0))?;
        let groups_count: i64 = conn.query_row("SELECT COUNT(*) FROM groups", [], |row| row.get(0))?;
        let tags_count: i64 = conn.query_row("SELECT COUNT(*) FROM tags", [], |row| row.get(0))?;
        let imports_count: i64 = conn.query_row("SELECT COUNT(*) FROM raw_imports", [], |row| row.get(0))?;
        let logs_count: i64 = conn.query_row("SELECT COUNT(*) FROM operation_logs", [], |row| row.get(0))?;

        // Get accounts by year
        let accounts_by_year = self.get_accounts_by_year(&conn)?;

        // Get accounts per group
        let accounts_per_group = self.get_accounts_per_group(&conn)?;

        // Get accounts per tag
        let accounts_per_tag = self.get_accounts_per_tag(&conn)?;

        Ok(DatabaseStats {
            accounts_count,
            groups_count,
            tags_count,
            imports_count,
            logs_count,
            accounts_by_year,
            accounts_per_group,
            accounts_per_tag,
        })
    }

    fn get_accounts_by_year(&self, conn: &Connection) -> DbResult<Vec<(i32, i64)>> {
        let mut stmt = conn.prepare(
            "SELECT year, COUNT(*) as count
             FROM accounts
             WHERE year IS NOT NULL
             GROUP BY year
             ORDER BY year DESC"
        )?;

        let mut rows = stmt.query([])?;
        let mut result = Vec::new();

        while let Some(row) = rows.next()? {
            result.push((row.get(0)?, row.get(1)?));
        }

        Ok(result)
    }

    fn get_accounts_per_group(&self, conn: &Connection) -> DbResult<Vec<(String, i64, i64)>> {
        let mut stmt = conn.prepare(
            "SELECT g.name, g.id, COUNT(a.id) as count
             FROM groups g
             LEFT JOIN accounts a ON g.id = a.group_id
             GROUP BY g.id
             ORDER BY g.sort_order, g.name"
        )?;

        let mut rows = stmt.query([])?;
        let mut result = Vec::new();

        while let Some(row) = rows.next()? {
            result.push((row.get(0)?, row.get(1)?, row.get(2)?));
        }

        Ok(result)
    }

    fn get_accounts_per_tag(&self, conn: &Connection) -> DbResult<Vec<(String, i64, i64)>> {
        let mut stmt = conn.prepare(
            "SELECT t.name, t.id, COUNT(at.account_id) as count
             FROM tags t
             LEFT JOIN account_tags at ON t.id = at.tag_id
             GROUP BY t.id
             ORDER BY t.name"
        )?;

        let mut rows = stmt.query([])?;
        let mut result = Vec::new();

        while let Some(row) = rows.next()? {
            result.push((row.get(0)?, row.get(1)?, row.get(2)?));
        }

        Ok(result)
    }
}

/// Database statistics structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DatabaseStats {
    pub accounts_count: i64,
    pub groups_count: i64,
    pub tags_count: i64,
    pub imports_count: i64,
    pub logs_count: i64,
    pub accounts_by_year: Vec<(i32, i64)>,
    pub accounts_per_group: Vec<(String, i64, i64)>,
    pub accounts_per_tag: Vec<(String, i64, i64)>,
}

// ============================================================================
// Maintenance Operations
// ============================================================================

impl Database {
    /// Vacuum the database to reclaim space
    pub fn vacuum(&self) -> DbResult<()> {
        let conn = self.get_conn();
        conn.execute("VACUUM", [])?;
        Ok(())
    }

    /// Analyze the database for query optimization
    pub fn analyze(&self) -> DbResult<()> {
        let conn = self.get_conn();
        conn.execute("ANALYZE", [])?;
        Ok(())
    }

    /// Get database file size in bytes
    pub fn get_db_size(&self, app_handle: &AppHandle) -> DbResult<u64> {
        let db_path = Database::get_db_path(app_handle);
        let metadata = std::fs::metadata(&db_path)
            .map_err(|e| DbError::InvalidInput(format!("Cannot get DB size: {}", e)))?;
        Ok(metadata.len())
    }

    /// Export all accounts as JSON
    pub fn export_accounts_json(&self) -> DbResult<String> {
        let accounts = self.get_accounts(None)?;
        let json = serde_json::to_string(&accounts)
            .map_err(|e| DbError::InvalidInput(format!("JSON serialization error: {}", e)))?;
        Ok(json)
    }

    /// Backup the database to a specified path
    pub fn backup(&self, backup_path: &PathBuf) -> DbResult<()> {
        let conn = self.get_conn();

        // Use SQLite's VACUUM INTO command for backup
        let backup_str = backup_path.to_str()
            .ok_or_else(|| DbError::InvalidInput("Invalid backup path".to_string()))?;
        conn.execute(&format!("VACUUM INTO '{}'", backup_str.replace("'", "''")), [])?;

        Ok(())
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_db() -> Database {
        Database::init_in_memory().expect("Failed to create test database")
    }

    #[test]
    fn test_create_and_get_account() {
        let db = get_test_db();

        let account = CreateAccount {
            raw_import_id: None,
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            recovery_email: Some("recovery@example.com".to_string()),
            totp_secret: None,
            year: Some(2024),
            notes: Some("Test account".to_string()),
            group_id: None,
            field_order: None,
        };

        let id = db.create_account(account).unwrap();
        let retrieved = db.get_account(id).unwrap();

        assert_eq!(retrieved.email, "test@example.com");
        assert_eq!(retrieved.year, Some(2024));
    }

    #[test]
    fn test_update_account() {
        let db = get_test_db();

        let account = CreateAccount {
            raw_import_id: None,
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        };

        let id = db.create_account(account).unwrap();

        let update = UpdateAccount {
            id,
            email: Some("updated@example.com".to_string()),
            password: None,
            recovery_email: None,
            totp_secret: None,
            year: Some(2025),
            notes: Some("Updated".to_string()),
            group_id: None,
            field_order: None,
        };

        db.update_account(update).unwrap();

        let retrieved = db.get_account(id).unwrap();
        assert_eq!(retrieved.email, "updated@example.com");
        assert_eq!(retrieved.year, Some(2025));
    }

    #[test]
    fn test_delete_account() {
        let db = get_test_db();

        let account = CreateAccount {
            raw_import_id: None,
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        };

        let id = db.create_account(account).unwrap();
        db.delete_account(id).unwrap();

        let result = db.get_account(id);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_and_get_group() {
        let db = get_test_db();

        let group = CreateGroup {
            name: "Work".to_string(),
            color: "#ff0000".to_string(),
            sort_order: 1,
        };

        let id = db.create_group(group).unwrap();
        let retrieved = db.get_group(id).unwrap();

        assert_eq!(retrieved.name, "Work");
        assert_eq!(retrieved.color, "#ff0000");
    }

    #[test]
    fn test_create_and_get_tag() {
        let db = get_test_db();

        let tag = CreateTag {
            name: "important".to_string(),
            color: "#00ff00".to_string(),
        };

        let id = db.create_tag(tag).unwrap();
        let retrieved = db.get_tag(id).unwrap();

        assert_eq!(retrieved.name, "important");
        assert_eq!(retrieved.color, "#00ff00");
    }

    #[test]
    fn test_add_and_remove_tag_from_account() {
        let db = get_test_db();

        let account = CreateAccount {
            raw_import_id: None,
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        };

        let account_id = db.create_account(account).unwrap();

        let tag = CreateTag {
            name: "test-tag".to_string(),
            color: "#0000ff".to_string(),
        };

        let tag_id = db.create_tag(tag).unwrap();

        // Add tag to account
        db.add_tag_to_account(account_id, tag_id).unwrap();

        let tags = db.get_account_tags(account_id).unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "test-tag");

        // Remove tag from account
        db.remove_tag_from_account(account_id, tag_id).unwrap();

        let tags = db.get_account_tags(account_id).unwrap();
        assert_eq!(tags.len(), 0);
    }

    #[test]
    fn test_search_accounts() {
        let db = get_test_db();

        // Create test accounts
        let _ = db.create_account(CreateAccount {
            raw_import_id: None,
            email: "work@example.com".to_string(),
            password: "pass1".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: Some(2024),
            notes: None,
            group_id: None,
            field_order: None,
        });

        let _ = db.create_account(CreateAccount {
            raw_import_id: None,
            email: "personal@example.com".to_string(),
            password: "pass2".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: Some(2023),
            notes: None,
            group_id: None,
            field_order: None,
        });

        // Search by email
        let results = db
            .search_accounts(AccountSearch {
                query: Some("work".to_string()),
                group_id: None,
                tag_id: None,
                year: None,
                pagination: Pagination { offset: 0, limit: 10 },
            })
            .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].email, "work@example.com");

        // Search by year
        let results = db
            .search_accounts(AccountSearch {
                query: None,
                group_id: None,
                tag_id: None,
                year: Some(2024),
                pagination: Pagination { offset: 0, limit: 10 },
            })
            .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].year, Some(2024));
    }

    #[test]
    fn test_operation_logging() {
        let db = get_test_db();

        let account = CreateAccount {
            raw_import_id: None,
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        };

        let account_id = db.create_account(account).unwrap();

        // Create operation log
        db.log_operation(Some(account_id), "TEST", Some("Test operation"))
            .unwrap();

        // Retrieve logs
        let logs = db.get_operation_logs(Some(account_id), 10).unwrap();
        assert!(logs.len() >= 1);

        // Find the CREATE log (automatically created)
        let create_log = logs.iter().find(|l| l.action == "CREATE");
        assert!(create_log.is_some());
    }

    #[test]
    fn test_undo_stack() {
        let db = get_test_db();

        let undo_data = r#"{"account_id": 1, "data": "test"}"#;

        db.push_undo("DELETE_ACCOUNT", undo_data).unwrap();

        let undo_entry = db.pop_undo().unwrap();
        assert!(undo_entry.is_some());

        let (id, op_type, data) = undo_entry.unwrap();
        assert_eq!(op_type, "DELETE_ACCOUNT");
        assert_eq!(data, undo_data);

        // Stack should be empty now
        let undo_entry = db.pop_undo().unwrap();
        assert!(undo_entry.is_none());
    }

    #[test]
    fn test_database_stats() {
        let db = get_test_db();

        let stats = db.get_stats().unwrap();

        // Should have default group
        assert_eq!(stats.groups_count, 1);

        // No accounts yet
        assert_eq!(stats.accounts_count, 0);

        // Create an account
        let _ = db.create_account(CreateAccount {
            raw_import_id: None,
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        });

        let stats = db.get_stats().unwrap();
        assert_eq!(stats.accounts_count, 1);
    }
}
