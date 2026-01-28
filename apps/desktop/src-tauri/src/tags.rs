//! Tag CRUD operations for GManager Desktop
//!
//! This module provides Tauri commands for tag management.
//!
//! # Tag Management
//!
//! Tags are used to categorize accounts with flexible labeling.
//! Each account can have multiple tags attached to it.

use crate::db::{CreateTag, Database, DbError, Tag};

// ============================================================================
// Type Definitions for Frontend/Backend Communication
// ============================================================================

/// Tag representation sent to frontend
#[derive(Debug, Clone, serde::Serialize)]
pub struct TagDto {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

/// Tag creation payload from frontend
#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateTagPayload {
    pub name: String,
    #[serde(default)]
    pub color: Option<String>,
}

/// Tag update payload from frontend
#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateTagPayload {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
}

/// Payload for setting multiple tags on an account
#[derive(Debug, Clone, serde::Deserialize)]
pub struct SetAccountTagsPayload {
    pub account_id: String,
    pub tag_ids: Vec<String>,
}

// ============================================================================
// Error Types
// ============================================================================

/// Tag operations error type
#[derive(Debug, thiserror::Error)]
pub enum TagError {
    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    /// Invalid input
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Tag not found
    #[error("Tag not found: {0}")]
    NotFound(String),
}

/// Result type for tag operations
pub type TagResult<T> = std::result::Result<T, TagError>;

// ============================================================================
// Conversion Functions
// ============================================================================

/// Convert database tag to frontend tag
fn db_to_frontend_tag(db_tag: Tag) -> TagDto {
    TagDto {
        id: db_tag.id.to_string(),
        name: db_tag.name,
        color: db_tag.color,
        created_at: db_tag.created_at,
    }
}

/// Convert frontend creation payload to database creation payload
fn frontend_to_db_create(payload: CreateTagPayload) -> TagResult<CreateTag> {
    // Validate required fields
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(TagError::InvalidInput("Tag name is required".to_string()));
    }

    // Validate color format (basic hex check)
    let color = payload.color.unwrap_or_else(|| "#10b981".to_string());
    if !color.starts_with('#') || (color.len() != 7 && color.len() != 4) {
        return Err(TagError::InvalidInput(
            "Color must be a valid hex color (e.g., #10b981)".to_string()
        ));
    }

    Ok(CreateTag {
        name: name.to_string(),
        color,
    })
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all tags
///
/// Returns all tags ordered by name.
#[tauri::command]
pub fn get_tags_command(
    db: tauri::State<Database>,
) -> Result<Vec<TagDto>, String> {
    let db_tags = db.get_tags()
        .map_err(|e| e.to_string())?;

    Ok(db_tags
        .into_iter()
        .map(db_to_frontend_tag)
        .collect())
}

/// Get a single tag by ID
#[tauri::command]
pub fn get_tag_command(
    db: tauri::State<Database>,
    id: String,
) -> Result<TagDto, String> {
    let tag_id = id.parse::<i64>()
        .map_err(|_| "Invalid tag ID".to_string())?;

    let db_tag = db.get_tag(tag_id)
        .map_err(|e| e.to_string())?;

    Ok(db_to_frontend_tag(db_tag))
}

/// Create a new tag
#[tauri::command]
pub fn create_tag_command(
    db: tauri::State<Database>,
    tag: CreateTagPayload,
) -> Result<String, String> {
    let create_tag = frontend_to_db_create(tag)
        .map_err(|e| e.to_string())?;

    let id = db.create_tag(create_tag)
        .map_err(|e| e.to_string())?;

    Ok(id.to_string())
}

/// Update an existing tag
///
/// Only updates provided fields.
#[tauri::command]
pub fn update_tag_command(
    db: tauri::State<Database>,
    tag: UpdateTagPayload,
) -> Result<(), String> {
    let tag_id = tag.id.parse::<i64>()
        .map_err(|_| "Invalid tag ID".to_string())?;

    // Get existing tag to fill in unchanged fields
    let existing = db.get_tag(tag_id)
        .map_err(|e| e.to_string())?;

    // Build update payload with new values or existing ones
    let update_payload = CreateTag {
        name: tag.name.unwrap_or_else(|| existing.name),
        color: tag.color.unwrap_or_else(|| existing.color),
    };

    db.update_tag(tag_id, update_payload)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Delete a tag by ID
///
/// Note: The tag will be removed from all accounts that have it.
#[tauri::command]
pub fn delete_tag_command(
    db: tauri::State<Database>,
    id: String,
) -> Result<(), String> {
    let tag_id = id.parse::<i64>()
        .map_err(|_| "Invalid tag ID".to_string())?;

    db.delete_tag(tag_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Add a tag to an account
///
/// Creates an association between an account and a tag.
/// If the association already exists, this is a no-op.
#[tauri::command]
pub fn add_tag_to_account_command(
    db: tauri::State<Database>,
    account_id: String,
    tag_id: String,
) -> Result<(), String> {
    let aid = account_id.parse::<i64>()
        .map_err(|_| "Invalid account ID".to_string())?;

    let tid = tag_id.parse::<i64>()
        .map_err(|_| "Invalid tag ID".to_string())?;

    db.add_tag_to_account(aid, tid)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Remove a tag from an account
///
/// Deletes the association between an account and a tag.
#[tauri::command]
pub fn remove_tag_from_account_command(
    db: tauri::State<Database>,
    account_id: String,
    tag_id: String,
) -> Result<(), String> {
    let aid = account_id.parse::<i64>()
        .map_err(|_| "Invalid account ID".to_string())?;

    let tid = tag_id.parse::<i64>()
        .map_err(|_| "Invalid tag ID".to_string())?;

    db.remove_tag_from_account(aid, tid)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get all tags for an account
///
/// Returns all tags associated with the specified account.
#[tauri::command]
pub fn get_account_tags_command(
    db: tauri::State<Database>,
    account_id: String,
) -> Result<Vec<TagDto>, String> {
    let aid = account_id.parse::<i64>()
        .map_err(|_| "Invalid account ID".to_string())?;

    let db_tags = db.get_account_tags(aid)
        .map_err(|e| e.to_string())?;

    Ok(db_tags
        .into_iter()
        .map(db_to_frontend_tag)
        .collect())
}

/// Set multiple tags for an account
///
/// Replaces all existing tags on an account with the provided list.
/// Tags not in the list will be removed.
#[tauri::command]
pub fn set_account_tags_command(
    db: tauri::State<Database>,
    payload: SetAccountTagsPayload,
) -> Result<(), String> {
    let account_id = payload.account_id.parse::<i64>()
        .map_err(|_| "Invalid account ID".to_string())?;

    // Parse all tag IDs
    let mut tag_ids = Vec::new();
    for tag_id_str in payload.tag_ids {
        let tid = tag_id_str.parse::<i64>()
            .map_err(|_| "Invalid tag ID".to_string())?;
        tag_ids.push(tid);
    }

    // Get current tags for the account
    let current_tags = db.get_account_tags(account_id)
        .map_err(|e| e.to_string())?;

    // Remove tags that are not in the new list
    for current_tag in &current_tags {
        if !tag_ids.contains(&current_tag.id) {
            db.remove_tag_from_account(account_id, current_tag.id)
                .map_err(|e| e.to_string())?;
        }
    }

    // Add tags that are in the new list but not currently associated
    for tag_id in tag_ids {
        // Check if already associated
        let is_associated = current_tags.iter().any(|t| t.id == tag_id);
        if !is_associated {
            db.add_tag_to_account(account_id, tag_id)
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Get the number of accounts that have a specific tag
#[tauri::command]
pub fn get_tag_accounts_count_command(
    db: tauri::State<Database>,
    tag_id: String,
) -> Result<i64, String> {
    let tid = tag_id.parse::<i64>()
        .map_err(|_| "Invalid tag ID".to_string())?;

    db.get_tag_accounts_count(tid)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_frontend_to_db_create_valid() {
        let payload = CreateTagPayload {
            name: "important".to_string(),
            color: Some("#ef4444".to_string()),
        };

        let result = frontend_to_db_create(payload).unwrap();

        assert_eq!(result.name, "important");
        assert_eq!(result.color, "#ef4444");
    }

    #[test]
    fn test_frontend_to_db_create_defaults() {
        let payload = CreateTagPayload {
            name: "work".to_string(),
            color: None,
        };

        let result = frontend_to_db_create(payload).unwrap();

        assert_eq!(result.name, "work");
        assert_eq!(result.color, "#10b981");
    }

    #[test]
    fn test_frontend_to_db_create_empty_name_fails() {
        let payload = CreateTagPayload {
            name: "".to_string(),
            color: None,
        };

        let result = frontend_to_db_create(payload);
        assert!(result.is_err());
    }

    #[test]
    fn test_frontend_to_db_create_whitespace_name_fails() {
        let payload = CreateTagPayload {
            name: "   ".to_string(),
            color: None,
        };

        let result = frontend_to_db_create(payload);
        assert!(result.is_err());
    }

    #[test]
    fn test_frontend_to_db_create_invalid_color_fails() {
        let payload = CreateTagPayload {
            name: "test".to_string(),
            color: Some("invalid".to_string()),
        };

        let result = frontend_to_db_create(payload);
        assert!(result.is_err());
    }

    #[test]
    fn test_db_to_frontend_conversion() {
        let db_tag = Tag {
            id: 456,
            name: "critical".to_string(),
            color: "#dc2626".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let result = db_to_frontend_tag(db_tag);

        assert_eq!(result.id, "456");
        assert_eq!(result.name, "critical");
        assert_eq!(result.color, "#dc2626");
        assert_eq!(result.created_at, "2024-01-01T00:00:00Z");
    }
}
