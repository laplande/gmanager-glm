//! Account CRUD operations for GManager Desktop
//!
//! This module provides Tauri commands for account management with automatic
//! encryption/decryption of sensitive fields using the active session key.
//!
//! # Security Architecture
//!
//! All sensitive fields are encrypted before storage and decrypted on retrieval:
//! - email, password, recovery_email, totp_secret, notes are encrypted
//! - year, group_id, id, timestamps are stored in plaintext
//!
//! Encryption happens in this layer using the session key from SessionManager.
//! The database layer only stores encrypted strings.

use crate::auth::SessionManager;
use crate::crypto::{decrypt_field, encrypt_field, CryptoError};
use crate::db::{Account as DbAccount, AccountSearch, CreateAccount, Database, Pagination, UpdateAccount, DbError};
use std::collections::HashMap;

// ============================================================================
// Type Definitions for Frontend/Backend Communication
// ============================================================================

/// Account representation sent to frontend (all fields decrypted)
#[derive(Debug, Clone, serde::Serialize)]
pub struct Account {
    pub id: String,
    pub raw_import_id: Option<String>,
    pub email: String,
    pub password: String,
    pub recovery_email: Option<String>,
    pub totp_secret: Option<String>,
    pub year: Option<String>,
    pub notes: Option<String>,
    pub group_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<Tag>,
}

/// Tag representation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

/// Account creation payload from frontend (all fields plaintext)
#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateAccountPayload {
    pub raw_import_id: Option<String>,
    pub email: String,
    pub password: String,
    pub recovery_email: Option<String>,
    pub totp_secret: Option<String>,
    pub year: Option<String>,
    pub notes: Option<String>,
    pub group_id: Option<String>,
    pub field_order: Option<Vec<String>>,
}

/// Account update payload from frontend
#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateAccountPayload {
    pub id: String,
    pub email: Option<String>,
    pub password: Option<String>,
    pub recovery_email: Option<String>,
    pub totp_secret: Option<String>,
    pub year: Option<String>,
    pub notes: Option<String>,
    pub group_id: Option<String>,
    pub field_order: Option<Vec<String>>,
}

/// Search filters for accounts
#[derive(Debug, Clone, serde::Deserialize, Default)]
pub struct AccountSearchParams {
    pub query: Option<String>,
    pub group_id: Option<String>,
    pub tag_id: Option<String>,
    pub year: Option<String>,
    pub offset: Option<i64>,
    pub limit: Option<i64>,
}

/// Batch delete request
#[derive(Debug, Clone, serde::Deserialize)]
pub struct BatchDeleteRequest {
    pub ids: Vec<String>,
}

/// Batch update request
#[derive(Debug, Clone, serde::Deserialize)]
pub struct BatchUpdateRequest {
    pub ids: Vec<String>,
    pub updates: UpdateAccountPayload,
}

// ============================================================================
// Error Types
// ============================================================================

/// Account operations error type
#[derive(Debug, thiserror::Error)]
pub enum AccountError {
    /// No active session (user not logged in)
    #[error("No active session. Please unlock the vault first.")]
    NotLoggedIn,

    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    /// Cryptographic error
    #[error("Crypto error: {0}")]
    Crypto(#[from] CryptoError),

    /// Invalid input
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Account not found
    #[error("Account not found: {0}")]
    NotFound(String),
}

/// Result type for account operations
pub type AccountResult<T> = std::result::Result<T, AccountError>;

// ============================================================================
// Conversion Functions
// ============================================================================

/// Convert database account to frontend account with decryption
fn db_to_frontend_account(db_account: DbAccount, key: &[u8; 32]) -> AccountResult<Account> {
    // Decrypt sensitive fields
    let email = decrypt_field(&db_account.email, key)?;
    let password = decrypt_field(&db_account.password, key)?;

    let recovery_email = match db_account.recovery_email {
        Some(ref enc) => Some(decrypt_field(enc, key)?),
        None => None,
    };

    let totp_secret = match db_account.totp_secret {
        Some(ref enc) => Some(decrypt_field(enc, key)?),
        None => None,
    };

    let notes = match db_account.notes {
        Some(ref enc) => Some(decrypt_field(enc, key)?),
        None => None,
    };

    // Convert tags
    let tags = db_account.tags
        .into_iter()
        .map(|t| Tag {
            id: t.id.to_string(),
            name: t.name,
            color: t.color,
            created_at: t.created_at,
        })
        .collect();

    Ok(Account {
        id: db_account.id.to_string(),
        raw_import_id: db_account.raw_import_id.map(|id| id.to_string()),
        email,
        password,
        recovery_email,
        totp_secret,
        year: db_account.year.map(|y| y.to_string()),
        notes,
        group_id: db_account.group_id.map(|id| id.to_string()),
        created_at: db_account.created_at,
        updated_at: db_account.updated_at,
        tags,
    })
}

/// Convert frontend creation payload to database creation payload with encryption
fn frontend_to_db_create(payload: CreateAccountPayload, key: &[u8; 32]) -> AccountResult<CreateAccount> {
    // Validate required fields
    if payload.email.is_empty() {
        return Err(AccountError::InvalidInput("Email is required".to_string()));
    }
    if payload.password.is_empty() {
        return Err(AccountError::InvalidInput("Password is required".to_string()));
    }

    // Encrypt sensitive fields
    let email = encrypt_field(&payload.email, key)?;
    let password = encrypt_field(&payload.password, key)?;

    let recovery_email = match payload.recovery_email {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    let totp_secret = match payload.totp_secret {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    let notes = match payload.notes {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    // Convert optional string IDs to i64
    let raw_import_id = payload.raw_import_id
        .and_then(|id| id.parse::<i64>().ok());

    let group_id = payload.group_id
        .and_then(|id| id.parse::<i64>().ok());

    let year = payload.year
        .and_then(|y| y.parse::<i32>().ok());

    // Convert field order to comma-separated string
    let field_order = payload.field_order
        .map(|order| order.join(","));

    Ok(CreateAccount {
        raw_import_id,
        email,
        password,
        recovery_email,
        totp_secret,
        year,
        notes,
        group_id,
        field_order,
    })
}

/// Convert frontend update payload to database update payload with encryption
fn frontend_to_db_update(payload: UpdateAccountPayload, key: &[u8; 32]) -> AccountResult<UpdateAccount> {
    // Parse account ID
    let id = payload.id.parse::<i64>()
        .map_err(|_| AccountError::InvalidInput("Invalid account ID".to_string()))?;

    // Encrypt fields if provided
    let email = match payload.email {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    let password = match payload.password {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    let recovery_email = match payload.recovery_email {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    let totp_secret = match payload.totp_secret {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    let notes = match payload.notes {
        Some(ref val) if !val.is_empty() => Some(encrypt_field(val, key)?),
        _ => None,
    };

    // Convert optional string IDs to i64
    let group_id = payload.group_id
        .and_then(|id| id.parse::<i64>().ok());

    let year = payload.year
        .and_then(|y| y.parse::<i32>().ok());

    // Convert field order to comma-separated string
    let field_order = payload.field_order
        .map(|order| order.join(","));

    Ok(UpdateAccount {
        id,
        email,
        password,
        recovery_email,
        totp_secret,
        year,
        notes,
        group_id,
        field_order,
    })
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all accounts with optional pagination
///
/// Returns all accounts with sensitive fields decrypted.
#[tauri::command]
pub fn get_accounts_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    offset: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<Account>, String> {
    // Get session key
    let key = session_manager.get_session_key()
        .map_err(|e| e.to_string())?;

    // Query database
    let pagination = Pagination {
        offset: offset.unwrap_or(0),
        limit: limit.unwrap_or(100),
    };

    let db_accounts = db.get_accounts(Some(pagination))
        .map_err(|e| e.to_string())?;

    // Convert and decrypt
    db_accounts
        .into_iter()
        .map(|acc| db_to_frontend_account(acc, &key).map_err(|e| e.to_string()))
        .collect()
}

/// Get a single account by ID
#[tauri::command]
pub fn get_account_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    id: String,
) -> Result<Account, String> {
    // Get session key
    let key = session_manager.get_session_key()
        .map_err(|e| e.to_string())?;

    // Parse ID
    let account_id = id.parse::<i64>()
        .map_err(|_| "Invalid account ID".to_string())?;

    // Query database
    let db_account = db.get_account(account_id)
        .map_err(|e| e.to_string())?;

    // Convert and decrypt
    db_to_frontend_account(db_account, &key)
        .map_err(|e| e.to_string())
}

/// Create a new account
///
/// Encrypts all sensitive fields before storage.
#[tauri::command]
pub fn create_account_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    account: CreateAccountPayload,
) -> Result<String, String> {
    // Get session key
    let key = session_manager.get_session_key()
        .map_err(|e| e.to_string())?;

    // Convert and encrypt
    let create_account = frontend_to_db_create(account, &key)
        .map_err(|e| e.to_string())?;

    // Create in database
    let id = db.create_account(create_account)
        .map_err(|e| e.to_string())?;

    Ok(id.to_string())
}

/// Update an existing account
///
/// Only updates provided fields. Encrypts sensitive fields before storage.
#[tauri::command]
pub fn update_account_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    account: UpdateAccountPayload,
) -> Result<(), String> {
    // Get session key
    let key = session_manager.get_session_key()
        .map_err(|e| e.to_string())?;

    // Convert and encrypt
    let update_account = frontend_to_db_update(account, &key)
        .map_err(|e| e.to_string())?;

    // Update in database
    db.update_account(update_account)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Delete an account by ID
#[tauri::command]
pub fn delete_account_command(
    db: tauri::State<Database>,
    id: String,
) -> Result<(), String> {
    // Parse ID
    let account_id = id.parse::<i64>()
        .map_err(|_| "Invalid account ID".to_string())?;

    // Delete from database
    db.delete_account(account_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Search accounts with filters
///
/// Supports searching by:
/// - Text query (searches email, recovery_email, notes)
/// - Group ID filter
/// - Tag ID filter
/// - Year filter
/// - Pagination (offset/limit)
#[tauri::command]
pub fn search_accounts_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    params: AccountSearchParams,
) -> Result<Vec<Account>, String> {
    // Get session key
    let key = session_manager.get_session_key()
        .map_err(|e| e.to_string())?;

    // Build search parameters
    let search = AccountSearch {
        query: params.query,
        group_id: params.group_id.and_then(|id| id.parse::<i64>().ok()),
        tag_id: params.tag_id.and_then(|id| id.parse::<i64>().ok()),
        year: params.year.and_then(|y| y.parse::<i32>().ok()),
        pagination: Pagination {
            offset: params.offset.unwrap_or(0),
            limit: params.limit.unwrap_or(50),
        },
    };

    // Search database
    let db_accounts = db.search_accounts(search)
        .map_err(|e| e.to_string())?;

    // Convert and decrypt
    db_accounts
        .into_iter()
        .map(|acc| db_to_frontend_account(acc, &key).map_err(|e| e.to_string()))
        .collect()
}

/// Get total count of accounts
#[tauri::command]
pub fn get_accounts_count_command(
    db: tauri::State<Database>,
) -> Result<i64, String> {
    db.get_accounts_count()
        .map_err(|e| e.to_string())
}

/// Batch delete multiple accounts
#[tauri::command]
pub fn batch_delete_accounts_command(
    db: tauri::State<Database>,
    request: BatchDeleteRequest,
) -> Result<usize, String> {
    let mut deleted = 0;

    for id_str in &request.ids {
        if let Ok(id) = id_str.parse::<i64>() {
            if db.delete_account(id).is_ok() {
                deleted += 1;
            }
        }
    }

    Ok(deleted)
}

/// Batch update multiple accounts
///
/// Applies the same updates to all specified accounts.
#[tauri::command]
pub fn batch_update_accounts_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    request: BatchUpdateRequest,
) -> Result<usize, String> {
    // Get session key
    let key = session_manager.get_session_key()
        .map_err(|e| e.to_string())?;

    let mut updated = 0;

    for id_str in &request.ids {
        if let Ok(id) = id_str.parse::<i64>() {
            // Create update payload for this specific ID
            let mut update_payload = request.updates.clone();
            update_payload.id = id_str.clone();

            if let Ok(db_update) = frontend_to_db_update(update_payload, &key) {
                if db.update_account(db_update).is_ok() {
                    updated += 1;
                }
            }
        }
    }

    Ok(updated)
}

/// Get account statistics
#[tauri::command]
pub fn get_account_stats_command(
    db: tauri::State<Database>,
) -> Result<AccountStats, String> {
    let stats = db.get_stats()
        .map_err(|e| e.to_string())?;

    Ok(AccountStats {
        total_accounts: stats.accounts_count,
        total_groups: stats.groups_count,
        total_tags: stats.tags_count,
        accounts_by_year: stats.accounts_by_year
            .into_iter()
            .map(|(year, count)| (year.to_string(), count))
            .collect(),
        accounts_per_group: stats.accounts_per_group
            .into_iter()
            .map(|(name, id, count)| (id.to_string(), name, count))
            .collect(),
    })
}

/// Statistics about accounts
#[derive(Debug, Clone, serde::Serialize)]
pub struct AccountStats {
    pub total_accounts: i64,
    pub total_groups: i64,
    pub total_tags: i64,
    pub accounts_by_year: Vec<(String, i64)>,
    pub accounts_per_group: Vec<(String, String, i64)>, // (id, name, count)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::SessionManager;
    use crate::crypto::derive_key;

    fn get_test_db() -> Database {
        Database::init_in_memory().expect("Failed to create test database")
    }

    fn get_test_key() -> [u8; 32] {
        derive_key(b"test-password", b"test-salt-16-bytes!!")
    }

    #[test]
    fn test_frontend_to_db_create_encryption() {
        let key = get_test_key();

        let payload = CreateAccountPayload {
            raw_import_id: None,
            email: "user@example.com".to_string(),
            password: "secret123".to_string(),
            recovery_email: Some("recovery@example.com".to_string()),
            totp_secret: Some("JBSWY3DPEHPK3PXP".to_string()),
            year: Some("2024".to_string()),
            notes: Some("Test notes".to_string()),
            group_id: None,
            field_order: None,
        };

        let result = frontend_to_db_create(payload, &key).unwrap();

        // Sensitive fields should be encrypted (start with "enc1:")
        assert!(result.email.starts_with("enc1:"));
        assert!(result.password.starts_with("enc1:"));
        assert!(result.recovery_email.unwrap().starts_with("enc1:"));
        assert!(result.totp_secret.unwrap().starts_with("enc1:"));
        assert!(result.notes.unwrap().starts_with("enc1:"));

        // Non-sensitive fields unchanged
        assert_eq!(result.year, Some(2024));
    }

    #[test]
    fn test_frontend_to_db_create_empty_optional_fields() {
        let key = get_test_key();

        let payload = CreateAccountPayload {
            raw_import_id: None,
            email: "user@example.com".to_string(),
            password: "secret123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        };

        let result = frontend_to_db_create(payload, &key).unwrap();

        assert!(result.recovery_email.is_none());
        assert!(result.totp_secret.is_none());
        assert!(result.notes.is_none());
        assert!(result.year.is_none());
        assert!(result.group_id.is_none());
    }

    #[test]
    fn test_frontend_to_db_update_partial_fields() {
        let key = get_test_key();

        let payload = UpdateAccountPayload {
            id: "1".to_string(),
            email: Some("newemail@example.com".to_string()),
            password: None,
            recovery_email: None,
            totp_secret: None,
            year: Some("2025".to_string()),
            notes: None,
            group_id: None,
            field_order: None,
        };

        let result = frontend_to_db_update(payload, &key).unwrap();

        // Only provided fields should be set
        assert!(result.email.is_some());
        assert!(result.email.unwrap().starts_with("enc1:"));
        assert!(result.password.is_none());
        assert!(result.recovery_email.is_none());
        assert!(result.totp_secret.is_none());
        assert_eq!(result.year, Some(2025));
    }

    #[test]
    fn test_empty_email_fails_validation() {
        let key = get_test_key();

        let payload = CreateAccountPayload {
            raw_import_id: None,
            email: "".to_string(),
            password: "secret123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        };

        let result = frontend_to_db_create(payload, &key);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_password_fails_validation() {
        let key = get_test_key();

        let payload = CreateAccountPayload {
            raw_import_id: None,
            email: "user@example.com".to_string(),
            password: "".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: None,
        };

        let result = frontend_to_db_create(payload, &key);
        assert!(result.is_err());
    }

    #[test]
    fn test_field_order_conversion() {
        let key = get_test_key();

        let payload = CreateAccountPayload {
            raw_import_id: None,
            email: "user@example.com".to_string(),
            password: "secret123".to_string(),
            recovery_email: None,
            totp_secret: None,
            year: None,
            notes: None,
            group_id: None,
            field_order: Some(vec!["email".to_string(), "password".to_string(), "notes".to_string()]),
        };

        let result = frontend_to_db_create(payload, &key).unwrap();
        assert_eq!(result.field_order, Some("email,password,notes".to_string()));
    }
}
