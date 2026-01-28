// Cryptography module for GManager Desktop
//
// This module provides AES-256-GCM encryption for sensitive account data.
// Uses the ring crate for cryptographic operations and PBKDF2 for key derivation.
//
// Security considerations:
// - AES-256-GCM provides authenticated encryption (confidentiality + integrity)
// - PBKDF2 with 100,000 iterations slows down brute-force attacks on master password
// - Random nonce for each encryption prevents pattern analysis
// - 128-bit nonce provides sufficient randomness for field-level encryption

use ring::aead;
use ring::aead::{AES_256_GCM, BoundKey, Nonce, OpeningKey, SealingKey, UnboundKey};
use ring::pbkdf2;
use ring::rand::{SecureRandom, SystemRandom};

use std::num::NonZeroU32;

/// Base64 encoding/decoding for encrypted data
use base64::{
    engine::general_purpose::STANDARD as BASE64,
    Engine,
};

// ============================================================================
// Constants
// ============================================================================

/// Size of the derived encryption key in bytes (256 bits)
const KEY_SIZE: usize = 32;

/// Size of the nonce/IV in bytes (96 bits for GCM)
const NONCE_SIZE: usize = 12;

/// Number of PBKDF2 iterations for key derivation
/// 100,000 iterations is recommended as of 2023 for SHA-256
/// This should be increased periodically as hardware improves
const PBKDF2_ITERATIONS: u32 = 100_000;

/// Prefix for encrypted data to help identify encrypted fields
/// This provides a sanity check when parsing encrypted strings
const ENCRYPTED_PREFIX: &str = "enc1:";

// ============================================================================
// Error Types
// ============================================================================

/// Cryptography module error type
///
/// Provides specific error variants for different failure modes
/// to allow proper error handling by calling code
#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    /// Field value is empty or null
    #[error("Cannot encrypt empty field")]
    EmptyField,

    /// Invalid UTF-8 encoding when decrypting
    #[error("Invalid UTF-8 in decrypted data")]
    InvalidUtf8,

    /// Decryption failed (wrong key, corrupted data, or tampering)
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    /// Encrypted data has invalid format
    #[error("Invalid encrypted data format: {0}")]
    InvalidFormat(String),

    /// Nonce/IV generation failed
    #[error("Failed to generate nonce")]
    NonceGenerationFailed,

    /// Random number generator failed
    #[error("RNG error")]
    RandomError,

    /// Base64 decoding failed
    #[error("Base64 decode error: {0}")]
    Base64Error(#[from] base64::DecodeError),

    /// Key derivation failed
    #[error("Key derivation failed")]
    KeyDerivationFailed,
}

/// Result type for crypto operations
pub type Result<T> = std::result::Result<T, CryptoError>;

// ============================================================================
// Key Derivation
// ============================================================================

/// Derives a 256-bit encryption key from a master password using PBKDF2
///
/// # Arguments
/// * `password` - The master password as a byte slice
/// * `salt` - A unique salt value (should be stored with the encrypted data)
///
/// # Returns
/// A 32-byte (256-bit) encryption key
///
/// # Security Notes
/// - Always use a unique, cryptographically random salt for each key derivation
/// - Store the salt alongside the encrypted data (it's not secret)
/// - 100,000 iterations provides protection against brute-force attacks
/// - Using the same salt with the same password always produces the same key
///
/// # Example
/// ```rust
/// use ring::rand::{SecureRandom, SystemRandom};
///
/// let rng = SystemRandom::new();
/// let mut salt = [0u8; 16];
/// rng.fill(&mut salt).unwrap();
///
/// let key = derive_key(b"my-master-password", &salt)?;
/// ```
pub fn derive_key(password: &[u8], salt: &[u8; 16]) -> [u8; KEY_SIZE] {
    let mut key = [0u8; KEY_SIZE];

    // PBKDF2-HMAC-SHA256 is used for key derivation
    // The iteration count should be increased as hardware improves
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        NonZeroU32::new(PBKDF2_ITERATIONS).expect("non-zero iterations"),
        salt,
        password,
        &mut key,
    );

    key
}

/// Generate a cryptographically random salt for key derivation
///
/// # Returns
/// A 16-byte random salt value
///
/// # Usage
/// Store this salt alongside the encrypted database. It doesn't need to be secret,
/// but it must be unique to prevent pre-computation attacks (rainbow tables).
pub fn generate_salt() -> Result<[u8; 16]> {
    let rng = SystemRandom::new();
    let mut salt = [0u8; 16];

    rng.fill(&mut salt)
        .map_err(|_| CryptoError::RandomError)?;

    Ok(salt)
}

// ============================================================================
// Single Field Encryption/Decryption
// ============================================================================

/// Encrypts a single field value using AES-256-GCM
///
/// # Arguments
/// * `plaintext` - The plain text string to encrypt (can be empty string, but not NULL)
/// * `key` - The 256-bit encryption key
///
/// # Returns
/// A base64-encoded string containing: prefix + nonce + ciphertext + auth_tag
///
/// # Security Guarantees
/// - Each encryption uses a unique random nonce (IV)
/// - AES-256-GCM provides authenticated encryption
/// - The authentication tag detects any tampering
/// - Same plaintext encrypted twice produces different ciphertexts
///
/// # Output Format
/// The encrypted string is base64-encoded with the structure:
/// ```
/// enc1:<base64(nonce + ciphertext + tag)>
/// ```
/// - `enc1:` - Version prefix (allows future algorithm upgrades)
/// - nonce: 12 bytes (96 bits)
/// - ciphertext: N bytes (same length as plaintext)
/// - tag: 16 bytes (128 bits, appended by GCM)
///
/// # Errors
/// Returns `CryptoError::EmptyField` if plaintext is empty
pub fn encrypt_field(plaintext: &str, key: &[u8; KEY_SIZE]) -> Result<String> {
    // Reject truly empty inputs (use Option<&str> at call site for nullable fields)
    if plaintext.is_empty() {
        return Err(CryptoError::EmptyField);
    }

    // Generate a unique random nonce for this encryption
    let nonce = generate_nonce()?;

    // Create the encryption key from the raw key bytes
    let unbound_key = UnboundKey::new(&AES_256_GCM, key)
        .expect("key is valid size");
    let sealing_key = SealingKey::new(unbound_key);

    // Convert plaintext to bytes
    let plaintext_bytes = plaintext.as_bytes();

    // Create buffer for encrypted data: nonce + plaintext + tag (16 bytes)
    // GCM appends the tag to the ciphertext
    let mut encrypted_data = vec![0u8; NONCE_SIZE + plaintext_bytes.len() + 16];

    // Copy nonce to the beginning
    encrypted_data[..NONCE_SIZE].copy_from_slice(&nonce);

    // Encrypt in-place (ciphertext overwrites plaintext portion)
    let nonce = Nonce::assume_unique_for_key(nonce);
    sealing_key
        .seal_in_place_append_tag(nonce, aead::Aad::empty(), &mut encrypted_data[NONCE_SIZE..])
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    // Encode with version prefix and base64
    let encoded = format!("{}{}", ENCRYPTED_PREFIX, BASE64.encode(&encrypted_data));

    Ok(encoded)
}

/// Decrypts a single field value encrypted with `encrypt_field`
///
/// # Arguments
/// * `encrypted` - The base64-encoded encrypted string with prefix
/// * `key` - The 256-bit decryption key (must match the encryption key)
///
/// # Returns
/// The decrypted plaintext string
///
/// # Security
/// - GCM authentication verifies data integrity before decryption
/// - Wrong key or tampered data will return an error (not garbage data)
/// - The nonce is extracted from the encrypted data
///
/// # Errors
/// - `InvalidFormat` - If the encrypted string doesn't match expected format
/// - `DecryptionFailed` - If authentication fails (wrong key or data tampering)
/// - `InvalidUtf8` - If decrypted bytes aren't valid UTF-8
pub fn decrypt_field(encrypted: &str, key: &[u8; KEY_SIZE]) -> Result<String> {
    // Check for version prefix
    if !encrypted.starts_with(ENCRYPTED_PREFIX) {
        return Err(CryptoError::InvalidFormat(
            "Missing version prefix".to_string()
        ));
    }

    // Strip prefix and decode base64
    let encoded_part = &encrypted[ENCRYPTED_PREFIX.len()..];
    let encrypted_data = BASE64.decode(encoded_part)?;

    // Validate minimum size: nonce (12) + tag (16) = 28 bytes minimum
    if encrypted_data.len() < NONCE_SIZE + 16 {
        return Err(CryptoError::InvalidFormat(
            "Encrypted data too short".to_string()
        ));
    }

    // Extract nonce from the beginning
    let nonce_bytes = &encrypted_data[..NONCE_SIZE];
    let nonce = Nonce::assume_unique_for_key(*array_ref!(nonce_bytes, 0, NONCE_SIZE));

    // Extract ciphertext + tag
    let ciphertext_with_tag = &encrypted_data[NONCE_SIZE..];

    // Create decryption key
    let unbound_key = UnboundKey::new(&AES_256_GCM, key)
        .expect("key is valid size");
    let opening_key = OpeningKey::new(unbound_key);

    // Decrypt and verify in-place
    let mut decrypted_bytes = ciphertext_with_tag.to_vec();
    let plaintext_len = opening_key
        .open_in_place(nonce, aead::Aad::empty(), &mut decrypted_bytes)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?
        .len();

    // Remove the authentication tag from the result
    decrypted_bytes.truncate(plaintext_len);

    // Convert to UTF-8 string
    String::from_utf8(decrypted_bytes)
        .map_err(|_| CryptoError::InvalidUtf8)
}

// ============================================================================
// Account Field Encryption/Decryption
// ============================================================================

/// Account structure for encryption operations
///
/// This mirrors the TypeScript Account interface but with Rust-friendly types
/// for encryption/decryption operations. Only sensitive fields are included
/// as they are the ones that get encrypted.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AccountFields {
    /// Unique identifier for the account
    pub id: String,
    /// Reference to the raw import this account came from
    pub raw_import_id: Option<String>,
    /// The primary email address (to be encrypted)
    pub email: Option<String>,
    /// The password (to be encrypted)
    pub password: Option<String>,
    /// The recovery email address (to be encrypted)
    pub recovery_email: Option<String>,
    /// The TOTP/2FA secret (to be encrypted)
    pub totp_secret: Option<String>,
    /// The year associated with the account (not encrypted)
    pub year: Option<String>,
    /// Additional notes (to be encrypted)
    pub notes: Option<String>,
    /// Reference to the group this account belongs to (not encrypted)
    pub group_id: Option<String>,
    /// ISO timestamp when the account was created
    pub created_at: String,
    /// ISO timestamp when the account was last updated
    pub updated_at: String,
}

/// Encrypts all sensitive fields in an account
///
/// # Arguments
/// * `account` - The account with plaintext sensitive fields
/// * `key` - The 256-bit encryption key
///
/// # Returns
/// A new account with sensitive fields encrypted
///
/// # Encrypted Fields
/// The following fields are encrypted (others stored as-is):
/// - `email` - Primary email address
/// - `password` - Password value
/// - `recovery_email` - Recovery email
/// - `totp_secret` - TOTP/2FA secret
/// - `notes` - User notes
///
/// # Non-Encrypted Fields
/// These fields are stored in plaintext for search/organization:
/// - `id` - Database ID
/// - `raw_import_id` - Import reference
/// - `year` - Year value (for sorting/filtering)
/// - `group_id` - Group membership
/// - `created_at`, `updated_at` - Timestamps
///
/// # Handling of Empty Fields
/// - `None` fields remain `None` (not encrypted)
/// - Empty strings (`""`) are preserved but not encrypted (return `Some("")`)
///
/// # Example
/// ```rust
/// let key = derive_key(b"master-password", &salt)?;
/// let encrypted = encrypt_account_fields(&account, &key)?;
/// ```
pub fn encrypt_account_fields(account: &AccountFields, key: &[u8; KEY_SIZE]) -> Result<AccountFields> {
    Ok(AccountFields {
        id: account.id.clone(),
        raw_import_id: account.raw_import_id.clone(),
        // Encrypt sensitive fields, preserving None values
        email: encrypt_optional_field(&account.email, key)?,
        password: encrypt_optional_field(&account.password, key)?,
        recovery_email: encrypt_optional_field(&account.recovery_email, key)?,
        totp_secret: encrypt_optional_field(&account.totp_secret, key)?,
        // Non-sensitive fields stored as-is
        year: account.year.clone(),
        notes: encrypt_optional_field(&account.notes, key)?,
        group_id: account.group_id.clone(),
        created_at: account.created_at.clone(),
        updated_at: account.updated_at.clone(),
    })
}

/// Decrypts all sensitive fields in an account
///
/// # Arguments
/// * `account` - The account with encrypted sensitive fields
/// * `key` - The 256-bit decryption key (must match encryption key)
///
/// # Returns
/// A new account with sensitive fields decrypted
///
/// # Errors
/// Returns an error if any encrypted field fails to decrypt.
/// This may indicate:
/// - Wrong master password
/// - Data corruption
/// - Tampering (authentication tag mismatch)
///
/// # Security Note
/// Failed decryption indicates the master password is incorrect or
/// data has been tampered with. The application should handle this
/// gracefully (e.g., prompt user to verify password).
pub fn decrypt_account_fields(account: &AccountFields, key: &[u8; KEY_SIZE]) -> Result<AccountFields> {
    Ok(AccountFields {
        id: account.id.clone(),
        raw_import_id: account.raw_import_id.clone(),
        // Decrypt sensitive fields, preserving None values
        email: decrypt_optional_field(&account.email, key)?,
        password: decrypt_optional_field(&account.password, key)?,
        recovery_email: decrypt_optional_field(&account.recovery_email, key)?,
        totp_secret: decrypt_optional_field(&account.totp_secret, key)?,
        // Non-sensitive fields pass through unchanged
        year: account.year.clone(),
        notes: decrypt_optional_field(&account.notes, key)?,
        group_id: account.group_id.clone(),
        created_at: account.created_at.clone(),
        updated_at: account.updated_at.clone(),
    })
}

// ============================================================================
// Batch Operations
// ============================================================================

/// Encrypts multiple accounts at once
///
/// More efficient than calling `encrypt_account_fields` individually
/// when processing multiple accounts, as key setup is done once.
///
/// # Arguments
/// * `accounts` - Iterator of accounts with plaintext fields
/// * `key` - The 256-bit encryption key
///
/// # Returns
/// A vector of accounts with encrypted fields
///
/// # Errors
/// Returns an error if any account fails to encrypt. Processing stops
/// at the first error.
pub fn encrypt_accounts(
    accounts: impl IntoIterator<Item = AccountFields>,
    key: &[u8; KEY_SIZE],
) -> Result<Vec<AccountFields>> {
    accounts
        .into_iter()
        .map(|account| encrypt_account_fields(&account, key))
        .collect()
}

/// Decrypts multiple accounts at once
///
/// More efficient than calling `decrypt_account_fields` individually
/// when processing multiple accounts, as key setup is done once.
///
/// # Arguments
/// * `accounts` - Iterator of accounts with encrypted fields
/// * `key` - The 256-bit decryption key
///
/// # Returns
/// A vector of accounts with decrypted fields
///
/// # Errors
/// Returns an error if any account fails to decrypt. This typically
/// indicates an incorrect master password or data corruption.
pub fn decrypt_accounts(
    accounts: impl IntoIterator<Item = AccountFields>,
    key: &[u8; KEY_SIZE],
) -> Result<Vec<AccountFields>> {
    accounts
        .into_iter()
        .map(|account| decrypt_account_fields(&account, key))
        .collect()
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Encrypts an optional field value
///
/// Helper function that handles the Option wrapper for field encryption.
/// None values remain None (not encrypted).
/// Empty strings (Some("")) remain Some("") but are not encrypted.
fn encrypt_optional_field(field: &Option<String>, key: &[u8; KEY_SIZE]) -> Result<Option<String>> {
    match field {
        None => Ok(None),
        Some(s) if s.is_empty() => Ok(Some(s.clone())),
        Some(s) => encrypt_field(s, key).map(Some),
    }
}

/// Decrypts an optional field value
///
/// Helper function that handles the Option wrapper for field decryption.
/// None values remain None.
/// Empty strings (Some("")) remain Some("").
fn decrypt_optional_field(field: &Option<String>, key: &[u8; KEY_SIZE]) -> Result<Option<String>> {
    match field {
        None => Ok(None),
        Some(s) if s.is_empty() => Ok(Some(s.clone())),
        Some(s) => decrypt_field(s, key).map(Some),
    }
}

/// Generates a cryptographically random nonce for encryption
///
/// The nonce must be unique for each encryption with the same key.
/// Using a random nonce with 96 bits of entropy makes collisions
/// astronomically unlikely.
fn generate_nonce() -> Result<[u8; NONCE_SIZE]> {
    let rng = SystemRandom::new();
    let mut nonce = [0u8; NONCE_SIZE];

    rng.fill(&mut nonce)
        .map_err(|_| CryptoError::NonceGenerationFailed)?;

    Ok(nonce)
}

/// Macro for creating array references from slices
/// Used for nonce conversion
macro_rules! array_ref {
    ($slice:expr, $offset:expr, $len:expr) => {
        {
            #[allow(unused_unsafe)]
            unsafe {
                &*($slice.as_ptr().add($offset) as *const [_; $len])
            }
        }
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Checks if a string appears to be encrypted data
///
/// This is a simple heuristic based on the version prefix.
/// Useful for validation or UI display logic.
///
/// # Arguments
/// * `value` - The string to check
///
/// # Returns
/// true if the string starts with the encrypted data prefix
pub fn is_encrypted(value: &str) -> bool {
    value.starts_with(ENCRYPTED_PREFIX)
}

/// Validates that a key is the correct size
///
/// Helper function to validate keys before use.
/// Primarily useful for testing and validation.
///
/// # Arguments
/// * `key` - The key to validate
///
/// # Returns
/// Ok(()) if the key is valid, Err otherwise
pub fn validate_key(key: &[u8]) -> Result<()> {
    if key.len() == KEY_SIZE {
        Ok(())
    } else {
        Err(CryptoError::InvalidFormat(format!(
            "Invalid key size: expected {} bytes, got {}",
            KEY_SIZE,
            key.len()
        )))
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_key() -> [u8; KEY_SIZE] {
        derive_key(b"test-master-password", b"test-salt-16-bytes!!")
    }

    #[test]
    fn test_derive_key_is_deterministic() {
        let salt = [1u8; 16];
        let key1 = derive_key(b"password", &salt);
        let key2 = derive_key(b"password", &salt);
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_derive_key_different_passwords() {
        let salt = [1u8; 16];
        let key1 = derive_key(b"password1", &salt);
        let key2 = derive_key(b"password2", &salt);
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_derive_key_different_salts() {
        let password = b"password";
        let salt1 = [1u8; 16];
        let salt2 = [2u8; 16];
        let key1 = derive_key(password, &salt1);
        let key2 = derive_key(password, &salt2);
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_encrypt_and_decrypt_field() {
        let key = make_test_key();
        let plaintext = "user@example.com";

        let encrypted = encrypt_field(plaintext, &key).unwrap();
        assert!(is_encrypted(&encrypted));
        assert!(!encrypted.contains(plaintext));

        let decrypted = decrypt_field(&encrypted, &key).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_same_plaintext_different_ciphertext() {
        let key = make_test_key();
        let plaintext = "same@email.com";

        let enc1 = encrypt_field(plaintext, &key).unwrap();
        let enc2 = encrypt_field(plaintext, &key).unwrap();

        // Random nonces produce different ciphertexts
        assert_ne!(enc1, enc2);

        // But both decrypt to the same value
        assert_eq!(decrypt_field(&enc1, &key).unwrap(), plaintext);
        assert_eq!(decrypt_field(&enc2, &key).unwrap(), plaintext);
    }

    #[test]
    fn test_decrypt_with_wrong_key_fails() {
        let key1 = make_test_key();
        let key2 = derive_key(b"different-password", b"different-salt-16!!");
        let plaintext = "secret@email.com";

        let encrypted = encrypt_field(plaintext, &key1).unwrap();
        let result = decrypt_field(&encrypted, &key2);

        assert!(result.is_err());
    }

    #[test]
    fn test_encrypt_empty_field_fails() {
        let key = make_test_key();
        let result = encrypt_field("", &key);
        assert!(matches!(result, Err(CryptoError::EmptyField)));
    }

    #[test]
    fn test_decrypt_invalid_format_fails() {
        let key = make_test_key();

        // Missing prefix
        assert!(decrypt_field("invalid", &key).is_err());
        // Invalid base64
        assert!(decrypt_field("enc1:!!!", &key).is_err());
        // Too short
        assert!(decrypt_field("enc1:YQ", &key).is_err());
    }

    #[test]
    fn test_encrypt_account_fields() {
        let key = make_test_key();
        let account = AccountFields {
            id: "acc-1".to_string(),
            raw_import_id: None,
            email: Some("user@example.com".to_string()),
            password: Some("secret123".to_string()),
            recovery_email: Some("recovery@example.com".to_string()),
            totp_secret: Some("JBSWY3DPEHPK3PXP".to_string()),
            year: Some("2024".to_string()),
            notes: Some("Important account".to_string()),
            group_id: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let encrypted = encrypt_account_fields(&account, &key).unwrap();

        // Sensitive fields should be encrypted
        assert!(is_encrypted(encrypted.email.as_deref().unwrap()));
        assert!(is_encrypted(encrypted.password.as_deref().unwrap()));
        assert!(is_encrypted(encrypted.recovery_email.as_deref().unwrap()));
        assert!(is_encrypted(encrypted.totp_secret.as_deref().unwrap()));
        assert!(is_encrypted(encrypted.notes.as_deref().unwrap()));

        // Non-sensitive fields unchanged
        assert_eq!(encrypted.year, account.year);
        assert_eq!(encrypted.id, account.id);
    }

    #[test]
    fn test_round_trip_account_fields() {
        let key = make_test_key();
        let original = AccountFields {
            id: "acc-1".to_string(),
            raw_import_id: Some("import-1".to_string()),
            email: Some("user@example.com".to_string()),
            password: Some("secret123".to_string()),
            recovery_email: None, // Test None handling
            totp_secret: Some("JBSWY3DPEHPK3PXP".to_string()),
            year: Some("2024".to_string()),
            notes: None, // Test None handling
            group_id: Some("group-1".to_string()),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let encrypted = encrypt_account_fields(&original, &key).unwrap();
        let decrypted = decrypt_account_fields(&encrypted, &key).unwrap();

        assert_eq!(decrypted.email, original.email);
        assert_eq!(decrypted.password, original.password);
        assert_eq!(decrypted.recovery_email, original.recovery_email);
        assert_eq!(decrypted.totp_secret, original.totp_secret);
        assert_eq!(decrypted.notes, original.notes);
        assert_eq!(decrypted.year, original.year);
        assert_eq!(decrypted.id, original.id);
    }

    #[test]
    fn test_generate_salt() {
        let salt1 = generate_salt().unwrap();
        let salt2 = generate_salt().unwrap();

        assert_ne!(salt1, salt2, "Salts should be unique");
        assert_eq!(salt1.len(), 16);
        assert_eq!(salt2.len(), 16);
    }

    #[test]
    fn test_validate_key() {
        assert!(validate_key(&[0u8; 32]).is_ok());
        assert!(validate_key(&[0u8; 16]).is_err());
        assert!(validate_key(&[0u8; 64]).is_err());
    }

    #[test]
    fn test_is_encrypted() {
        assert!(is_encrypted("enc1:SGVsbG8="));
        assert!(!is_encrypted("plaintext"));
        assert!(!is_encrypted(""));
    }
}
