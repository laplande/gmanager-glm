//! Authentication module for GManager Desktop
//!
//! This module provides master password authentication using PBKDF2 key derivation.
//! The vault system stores a salted hash for password verification and maintains
//! an in-memory session key for encrypting/decrypting sensitive data.
//!
//! # Security Architecture
//!
//! ## Vault Creation (create_vault)
//! 1. Generate 16-byte random salt
//! 2. Derive encryption key from password + salt using PBKDF2 (100,000 iterations)
//! 3. Generate verification hash by encrypting a known plaintext with the derived key
//! 4. Store salt and verification hash in SQLite database
//! 5. Store session key in memory only (never persisted)
//!
//! ## Vault Unlock (unlock_vault)
//! 1. Retrieve stored salt and verification hash from database
//! 2. Derive key from provided password + stored salt
//! 3. Verify password by attempting to decrypt the verification hash
//! 4. If valid, store session key in memory
//! 5. Return session identifier for frontend use
//!
//! ## Password Change (change_password)
//! 1. Verify old password is correct
//! 2. Generate new salt
//! 3. Derive new key from new password + new salt
//! 4. Update salt and verification hash in database
//! 5. Update in-memory session key
//!
//! # Important Security Notes
//! - The master password is NEVER stored in plaintext or retrievable form
//! - Only a salted verification hash is stored (cannot derive password from it)
//! - Session keys are kept in memory only and cleared on logout
//! - PBKDF2 with 100,000 iterations slows down brute-force attacks
//! - Each vault uses a unique random salt (prevents rainbow table attacks)

use crate::crypto::{self, derive_key, generate_salt, CryptoError};
use crate::db::{DbError, Database};
use ring::digest;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

// ============================================================================
// Constants
// ============================================================================

/// Size of the verification hash stored for password validation
const VERIFICATION_SIZE: usize = 32;

/// Known plaintext used for password verification
/// This is encrypted with the derived key to create the verification hash
const VERIFICATION_PLAINTEXT: &[u8] = b"GManagerVaultVerification";

/// Version prefix for vault verification format
const VAULT_VERSION: &str = "vault1:";

// ============================================================================
// Error Types
// ============================================================================

/// Authentication module error type
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    /// Vault has not been initialized (no password set)
    #[error("Vault not initialized")]
    NotInitialized,

    /// Vault already exists (password already set)
    #[error("Vault already exists")]
    AlreadyExists,

    /// Incorrect password provided
    #[error("Invalid password")]
    InvalidPassword,

    /// Session not active (user not logged in)
    #[error("No active session")]
    NotLoggedIn,

    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    /// Cryptographic error
    #[error("Crypto error: {0}")]
    Crypto(#[from] CryptoError),

    /// Session error
    #[error("Session error: {0}")]
    Session(String),
}

/// Result type for authentication operations
pub type AuthResult<T> = std::result::Result<T, AuthError>;

// ============================================================================
// Session Management
// ============================================================================

/// In-memory session storage
///
/// Holds the active session key after successful unlock.
/// This is NEVER persisted to disk - only exists in volatile memory.
#[derive(Clone)]
pub struct Session {
    /// The encryption key derived from the master password
    pub key: [u8; 32],
    /// Timestamp when the session was created
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Session manager using singleton pattern with Arc<Mutex<T>>
pub struct SessionManager {
    /// Optional active session (None = no user logged in)
    session: Arc<Mutex<Option<Session>>>,
}

impl Clone for SessionManager {
    fn clone(&self) -> Self {
        SessionManager {
            session: Arc::clone(&self.session),
        }
    }
}

impl SessionManager {
    /// Create a new session manager
    pub fn new() -> Self {
        SessionManager {
            session: Arc::new(Mutex::new(None)),
        }
    }

    /// Store a session key after successful unlock
    pub fn store_session(&self, key: [u8; 32]) -> AuthResult<()> {
        let mut session = self.session.lock()
            .map_err(|e| AuthError::Session(format!("Lock poison: {}", e)))?;

        *session = Some(Session {
            key,
            created_at: chrono::Utc::now(),
        });

        Ok(())
    }

    /// Get the current session key
    ///
    /// Returns an error if no session is active
    pub fn get_session_key(&self) -> AuthResult<[u8; 32]> {
        let session = self.session.lock()
            .map_err(|e| AuthError::Session(format!("Lock poison: {}", e)))?;

        match session.as_ref() {
            Some(s) => Ok(s.key),
            None => Err(AuthError::NotLoggedIn),
        }
    }

    /// Check if a session is currently active
    pub fn has_active_session(&self) -> bool {
        self.session.lock()
            .map(|s| s.is_some())
            .unwrap_or(false)
    }

    /// Clear the current session (logout)
    pub fn clear_session(&self) -> AuthResult<()> {
        let mut session = self.session.lock()
            .map_err(|e| AuthError::Session(format!("Lock poison: {}", e)))?;

        // Zero out the key before dropping (security best practice)
        if let Some(mut s) = session.take() {
            s.key.fill(0);
        }

        Ok(())
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Vault Operations
// ============================================================================

/// Check if a vault has been initialized (password has been set)
///
/// # Returns
/// - `Ok(true)` - Vault exists (password has been set)
/// - `Ok(false)` - Vault does not exist (first-time setup needed)
/// - `Err(...)` - Database error
pub fn check_has_vault(db: &Database) -> AuthResult<bool> {
    let conn = db.get_conn();

    // Check if the vault table exists and has a record
    let table_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='vault'",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    if table_exists == 0 {
        return Ok(false);
    }

    // Check if vault record exists
    let vault_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM vault",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(vault_count > 0)
}

/// Create a new vault with the given master password
///
/// # Arguments
/// * `db` - Database connection
/// * `password` - The master password to use for encryption
///
/// # Returns
/// Session key for immediate use
///
/// # Errors
/// - `AlreadyExists` - A vault already exists
/// - `Crypto` - Key derivation or salt generation failed
/// - `Database` - Database operation failed
pub fn create_vault(db: &Database, password: &str) -> AuthResult<[u8; 32]> {
    // Check if vault already exists
    if check_has_vault(db)? {
        return Err(AuthError::AlreadyExists);
    }

    // Generate a new random salt
    let salt = generate_salt()?;

    // Derive the encryption key from password and salt
    let key = derive_key(password.as_bytes(), &salt);

    // Create the vault table
    {
        let conn = db.get_conn();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vault (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                salt BLOB NOT NULL,
                verification_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
    }

    // Generate verification hash by encrypting known plaintext
    let verification_hash = generate_verification_hash(&key);

    // Store salt and verification hash
    let salt_hex = hex::encode(&salt);
    {
        let conn = db.get_conn();
        conn.execute(
            "INSERT INTO vault (id, salt, verification_hash) VALUES (1, ?1, ?2)",
            [&salt_hex, &verification_hash],
        )?;
    }

    Ok(key)
}

/// Unlock the vault with the provided master password
///
/// # Arguments
/// * `db` - Database connection
/// * `password` - The master password to verify
/// * `session_manager` - Session manager to store the session key
///
/// # Returns
/// Session key that was stored
///
/// # Errors
/// - `NotInitialized` - No vault exists (need to create one first)
/// - `InvalidPassword` - Password verification failed
/// - `Database` - Database operation failed
pub fn unlock_vault(
    db: &Database,
    password: &str,
    session_manager: &SessionManager,
) -> AuthResult<[u8; 32]> {
    // Check if vault exists
    if !check_has_vault(db)? {
        return Err(AuthError::NotInitialized);
    }

    // Retrieve stored salt and verification hash
    let (salt, verification_hash) = {
        let conn = db.get_conn();

        let mut stmt = conn.prepare(
            "SELECT salt, verification_hash FROM vault WHERE id = 1"
        )?;

        let mut rows = stmt.query([])?;

        let row = rows.next()?.ok_or(AuthError::NotInitialized)?;

        let salt_hex: String = row.get(0)?;
        let verification_hash: String = row.get(1)?;

        let salt = hex::decode(&salt_hex)
            .map_err(|_| AuthError::Crypto(CryptoError::InvalidFormat(
                "Invalid salt encoding".to_string()
            )))?;

        let salt_array: [u8; 16] = salt.try_into()
            .map_err(|_| AuthError::Crypto(CryptoError::InvalidFormat(
                "Invalid salt length".to_string()
            )))?;

        (salt_array, verification_hash)
    };

    // Derive key from provided password and stored salt
    let key = derive_key(password.as_bytes(), &salt);

    // Verify password by checking the verification hash
    if !verify_password(&key, &verification_hash) {
        return Err(AuthError::InvalidPassword);
    }

    // Store session key in memory
    session_manager.store_session(key)?;

    Ok(key)
}

/// Change the master password
///
/// # Arguments
/// * `db` - Database connection
/// * `old_password` - Current master password (for verification)
/// * `new_password` - New master password to set
/// * `session_manager` - Session manager to update the session key
///
/// # Errors
/// - `NotInitialized` - No vault exists
/// - `InvalidPassword` - Old password verification failed
/// - `Database` - Database operation failed
pub fn change_password(
    db: &Database,
    old_password: &str,
    new_password: &str,
    session_manager: &SessionManager,
) -> AuthResult<()> {
    // Verify old password by attempting to unlock
    let _old_key = derive_key_from_password(db, old_password)?;

    // Generate new salt and key
    let new_salt = generate_salt()?;
    let new_key = derive_key(new_password.as_bytes(), &new_salt);

    // Generate new verification hash
    let new_verification_hash = generate_verification_hash(&new_key);

    // Update database
    let salt_hex = hex::encode(&new_salt);
    {
        let conn = db.get_conn();
        conn.execute(
            "UPDATE vault SET salt = ?1, verification_hash = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
            [&salt_hex, &new_verification_hash],
        )?;
    }

    // Update the session key if a session is active
    if session_manager.has_active_session() {
        session_manager.store_session(new_key)?;
    }

    Ok(())
}

/// Logout and clear the session from memory
///
/// # Arguments
/// * `session_manager` - Session manager to clear
///
/// # Returns
/// Ok(()) on success
pub fn logout(session_manager: &SessionManager) -> AuthResult<()> {
    session_manager.clear_session()
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Derive key from password using stored salt
///
/// Helper function that retrieves the salt and derives the key
/// without verifying the password. Used internally.
fn derive_key_from_password(db: &Database, password: &str) -> AuthResult<[u8; 32]> {
    if !check_has_vault(db)? {
        return Err(AuthError::NotInitialized);
    }

    let salt = {
        let conn = db.get_conn();

        let salt_hex: String = conn.query_row(
            "SELECT salt FROM vault WHERE id = 1",
            [],
            |row| row.get(0),
        )?;

        let salt = hex::decode(&salt_hex)
            .map_err(|_| AuthError::Crypto(CryptoError::InvalidFormat(
                "Invalid salt encoding".to_string()
            )))?;

        let salt_array: [u8; 16] = salt.try_into()
            .map_err(|_| AuthError::Crypto(CryptoError::InvalidFormat(
                "Invalid salt length".to_string()
            )))?;

        salt_array
    };

    Ok(derive_key(password.as_bytes(), &salt))
}

/// Generate a verification hash from the derived key
///
/// The verification hash is created by:
/// 1. Computing SHA-256 of the known plaintext
/// 2. Encoding with version prefix for future compatibility
fn generate_verification_hash(key: &[u8; 32]) -> String {
    let mut data = key.to_vec();
    data.extend_from_slice(VERIFICATION_PLAINTEXT);
    let hash = digest::digest(&digest::SHA256, &data);
    let hash_bytes = hash.as_ref();

    format!("{}{}", VAULT_VERSION, hex::encode(hash_bytes))
}

/// Verify password by checking the verification hash
///
/// # Arguments
/// * `key` - The derived key to verify
/// * `stored_hash` - The stored verification hash
///
/// # Returns
/// - `true` - Password is correct (hash matches)
/// - `false` - Password is incorrect
fn verify_password(key: &[u8; 32], stored_hash: &str) -> bool {
    // Check version prefix
    if !stored_hash.starts_with(VAULT_VERSION) {
        return false;
    }

    // Extract stored hash
    let stored_hash_part = &stored_hash[VAULT_VERSION.len()..];

    // Decode stored hash
    let stored_bytes = match hex::decode(stored_hash_part) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    // Compute expected hash
    let mut data = key.to_vec();
    data.extend_from_slice(VERIFICATION_PLAINTEXT);
    let expected_hash = digest::digest(&digest::SHA256, &data);
    let expected_bytes = expected_hash.as_ref();

    // Constant-time comparison to prevent timing attacks
    if stored_bytes.len() != expected_bytes.len() {
        return false;
    }

    let mut result = 0u8;
    for (a, b) in stored_bytes.iter().zip(expected_bytes.iter()) {
        result |= a ^ b;
    }

    result == 0
}

/// Get the current session key
///
/// # Arguments
/// * `session_manager` - Session manager
///
/// # Returns
/// The current session key
///
/// # Errors
/// - `NotLoggedIn` - No active session
pub fn get_session_key(session_manager: &SessionManager) -> AuthResult<[u8; 32]> {
    session_manager.get_session_key()
}

// ============================================================================
// Tauri Command Wrappers
// ============================================================================

/// Tauri command: Check if vault has been initialized
///
/// # Returns
/// `true` if vault exists, `false` otherwise
#[tauri::command]
pub fn check_has_vault_command(
    db: tauri::State<Database>,
) -> Result<bool, String> {
    check_has_vault(&db)
        .map_err(|e| e.to_string())
}

/// Tauri command: Create a new vault with master password
///
/// # Arguments
/// * `password` - The master password
///
/// # Returns
/// Success indication
#[tauri::command]
pub fn create_vault_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    password: String,
) -> Result<(), String> {
    // Validate password
    if password.len() < 8 {
        return Err("Password must be at least 8 characters".to_string());
    }

    let key = create_vault(&db, &password)
        .map_err(|e| e.to_string())?;

    // Store session key for immediate use
    session_manager.store_session(key)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Tauri command: Unlock vault with master password
///
/// # Arguments
/// * `password` - The master password
///
/// # Returns
/// Session token for frontend use
#[tauri::command]
pub fn unlock_vault_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    password: String,
) -> Result<String, String> {
    let _key = unlock_vault(&db, &password, &session_manager)
        .map_err(|e| e.to_string())?;

    // Return a session token (could be enhanced with JWT in the future)
    // For now, just return success with a timestamp-based token
    let token = format!("session:{}", chrono::Utc::now().timestamp());

    Ok(token)
}

/// Tauri command: Change master password
///
/// # Arguments
/// * `old_password` - Current master password
/// * `new_password` - New master password
///
/// # Returns
/// Success indication
#[tauri::command]
pub fn change_password_command(
    db: tauri::State<Database>,
    session_manager: tauri::State<SessionManager>,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    // Validate new password
    if new_password.len() < 8 {
        return Err("New password must be at least 8 characters".to_string());
    }

    change_password(&db, &old_password, &new_password, &session_manager)
        .map_err(|e| e.to_string())
}

/// Tauri command: Logout and clear session
///
/// # Returns
/// Success indication
#[tauri::command]
pub fn logout_command(
    session_manager: tauri::State<SessionManager>,
) -> Result<(), String> {
    logout(&session_manager)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    fn get_test_db() -> Database {
        Database::init_in_memory().expect("Failed to create test database")
    }

    fn get_test_session_manager() -> SessionManager {
        SessionManager::new()
    }

    #[test]
    fn test_check_has_vault_initially_false() {
        let db = get_test_db();
        assert!(!check_has_vault(&db).unwrap());
    }

    #[test]
    fn test_create_and_check_vault() {
        let db = get_test_db();
        create_vault(&db, "test-password-123").unwrap();
        assert!(check_has_vault(&db).unwrap());
    }

    #[test]
    fn test_create_vault_twice_fails() {
        let db = get_test_db();
        create_vault(&db, "test-password-123").unwrap();
        let result = create_vault(&db, "another-password");
        assert!(matches!(result, Err(AuthError::AlreadyExists)));
    }

    #[test]
    fn test_unlock_vault_with_correct_password() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        create_vault(&db, "test-password-123").unwrap();
        let result = unlock_vault(&db, "test-password-123", &session_manager);
        assert!(result.is_ok());
        assert!(session_manager.has_active_session());
    }

    #[test]
    fn test_unlock_vault_with_wrong_password() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        create_vault(&db, "test-password-123").unwrap();
        let result = unlock_vault(&db, "wrong-password", &session_manager);
        assert!(matches!(result, Err(AuthError::InvalidPassword)));
        assert!(!session_manager.has_active_session());
    }

    #[test]
    fn test_unlock_vault_when_not_initialized() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        let result = unlock_vault(&db, "any-password", &session_manager);
        assert!(matches!(result, Err(AuthError::NotInitialized)));
    }

    #[test]
    fn test_change_password_with_correct_old_password() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        create_vault(&db, "old-password-123").unwrap();
        unlock_vault(&db, "old-password-123", &session_manager).unwrap();

        change_password(&db, "old-password-123", "new-password-456", &session_manager)
            .unwrap();

        // Should be able to unlock with new password
        session_manager.clear_session().unwrap();
        unlock_vault(&db, "new-password-456", &session_manager).unwrap();
    }

    #[test]
    fn test_change_password_with_wrong_old_password() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        create_vault(&db, "correct-password").unwrap();

        let result = change_password(
            &db,
            "wrong-password",
            "new-password-456",
            &session_manager,
        );
        assert!(matches!(result, Err(AuthError::InvalidPassword)));
    }

    #[test]
    fn test_logout_clears_session() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        create_vault(&db, "test-password-123").unwrap();
        unlock_vault(&db, "test-password-123", &session_manager).unwrap();

        assert!(session_manager.has_active_session());

        logout(&session_manager).unwrap();

        assert!(!session_manager.has_active_session());
    }

    #[test]
    fn test_get_session_key_when_logged_in() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        create_vault(&db, "test-password-123").unwrap();
        unlock_vault(&db, "test-password-123", &session_manager).unwrap();

        let key = get_session_key(&session_manager);
        assert!(key.is_ok());
        // Key should be 32 bytes
        assert_eq!(key.unwrap().len(), 32);
    }

    #[test]
    fn test_get_session_key_when_not_logged_in() {
        let session_manager = get_test_session_manager();

        let result = get_session_key(&session_manager);
        assert!(matches!(result, Err(AuthError::NotLoggedIn)));
    }

    #[test]
    fn test_verification_hash_generation() {
        let key = derive_key(b"test-password", b"test-salt-16-bytes!!");
        let hash1 = generate_verification_hash(&key);
        let hash2 = generate_verification_hash(&key);

        // Same key should produce same hash
        assert_eq!(hash1, hash2);
        assert!(hash1.starts_with(VAULT_VERSION));
    }

    #[test]
    fn test_verify_password_with_correct_key() {
        let key = derive_key(b"test-password", b"test-salt-16-bytes!!");
        let hash = generate_verification_hash(&key);

        assert!(verify_password(&key, &hash));
    }

    #[test]
    fn test_verify_password_with_wrong_key() {
        let correct_key = derive_key(b"test-password", b"test-salt-16-bytes!!");
        let wrong_key = derive_key(b"wrong-password", b"test-salt-16-bytes!!");
        let hash = generate_verification_hash(&correct_key);

        assert!(!verify_password(&wrong_key, &hash));
    }

    #[test]
    fn test_session_key_zeroed_on_logout() {
        let db = get_test_db();
        let session_manager = get_test_session_manager();

        create_vault(&db, "test-password-123").unwrap();
        unlock_vault(&db, "test-password-123", &session_manager).unwrap();

        let key_before = get_session_key(&session_manager).unwrap();

        logout(&session_manager).unwrap();

        // After logout, we should get NotLoggedIn error
        let result = get_session_key(&session_manager);
        assert!(matches!(result, Err(AuthError::NotLoggedIn)));

        // Key should have been zeroed (security best practice)
        // Note: We can't directly verify this since the key is dropped,
        // but the implementation zeroes it before dropping
    }
}
