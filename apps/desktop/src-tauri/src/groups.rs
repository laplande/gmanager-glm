//! Group CRUD operations for GManager Desktop
//!
//! This module provides Tauri commands for group management.
//!
//! # Group Management
//!
//! Groups are used to organize accounts into categories.
//! Each account can belong to at most one group.

use crate::db::{CreateGroup, Database, DbError, Group};

// ============================================================================
// Type Definitions for Frontend/Backend Communication
// ============================================================================

/// Group representation sent to frontend
#[derive(Debug, Clone, serde::Serialize)]
pub struct GroupDto {
    pub id: String,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
    pub created_at: String,
}

/// Group creation payload from frontend
#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateGroupPayload {
    pub name: String,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i32>,
}

/// Group update payload from frontend
#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateGroupPayload {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i32>,
}

// ============================================================================
// Error Types
// ============================================================================

/// Group operations error type
#[derive(Debug, thiserror::Error)]
pub enum GroupError {
    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    /// Invalid input
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Group not found
    #[error("Group not found: {0}")]
    NotFound(String),
}

/// Result type for group operations
pub type GroupResult<T> = std::result::Result<T, GroupError>;

// ============================================================================
// Conversion Functions
// ============================================================================

/// Convert database group to frontend group
fn db_to_frontend_group(db_group: Group) -> GroupDto {
    GroupDto {
        id: db_group.id.to_string(),
        name: db_group.name,
        color: db_group.color,
        sort_order: db_group.sort_order,
        created_at: db_group.created_at,
    }
}

/// Convert frontend creation payload to database creation payload
fn frontend_to_db_create(payload: CreateGroupPayload) -> GroupResult<CreateGroup> {
    // Validate required fields
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(GroupError::InvalidInput("Group name is required".to_string()));
    }

    // Validate color format (basic hex check)
    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());
    if !color.starts_with('#') || (color.len() != 7 && color.len() != 4) {
        return Err(GroupError::InvalidInput(
            "Color must be a valid hex color (e.g., #6366f1)".to_string()
        ));
    }

    Ok(CreateGroup {
        name: name.to_string(),
        color,
        sort_order: payload.sort_order.unwrap_or(0),
    })
}

/// Convert frontend update payload to database update payload
fn frontend_to_db_update(payload: UpdateGroupPayload) -> GroupResult<(i64, CreateGroup)> {
    // Parse group ID
    let id = payload.id.parse::<i64>()
        .map_err(|_| GroupError::InvalidInput("Invalid group ID".to_string()))?;

    // Validate name if provided
    let name = if let Some(ref n) = payload.name {
        let trimmed = n.trim();
        if trimmed.is_empty() {
            return Err(GroupError::InvalidInput("Group name cannot be empty".to_string()));
        }
        Some(trimmed.to_string())
    } else {
        None
    };

    // Get current group to fill in missing fields
    // We'll need the database state for this, so we return partial data
    // and let the command handler fill in the rest

    Ok((id, CreateGroup {
        name: name.unwrap_or_default(),
        color: payload.color.unwrap_or_default(),
        sort_order: payload.sort_order.unwrap_or(0),
    }))
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all groups
///
/// Returns all groups ordered by sort_order, then name.
#[tauri::command]
pub fn get_groups_command(
    db: tauri::State<Database>,
) -> Result<Vec<GroupDto>, String> {
    let db_groups = db.get_groups()
        .map_err(|e| e.to_string())?;

    db_groups
        .into_iter()
        .map(db_to_frontend_group)
        .collect::<Vec<_>>()
        .into_iter()
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// Get a single group by ID
#[tauri::command]
pub fn get_group_command(
    db: tauri::State<Database>,
    id: String,
) -> Result<GroupDto, String> {
    let group_id = id.parse::<i64>()
        .map_err(|_| "Invalid group ID".to_string())?;

    let db_group = db.get_group(group_id)
        .map_err(|e| e.to_string())?;

    Ok(db_to_frontend_group(db_group))
}

/// Create a new group
#[tauri::command]
pub fn create_group_command(
    db: tauri::State<Database>,
    group: CreateGroupPayload,
) -> Result<String, String> {
    let create_group = frontend_to_db_create(group)
        .map_err(|e| e.to_string())?;

    let id = db.create_group(create_group)
        .map_err(|e| e.to_string())?;

    Ok(id.to_string())
}

/// Update an existing group
///
/// Only updates provided fields.
#[tauri::command]
pub fn update_group_command(
    db: tauri::State<Database>,
    group: UpdateGroupPayload,
) -> Result<(), String> {
    let (group_id, mut update_data) = frontend_to_db_update(group)
        .map_err(|e| e.to_string())?;

    // Get existing group to fill in unchanged fields
    let existing = db.get_group(group_id)
        .map_err(|e| e.to_string())?;

    // Fill in missing fields with existing values
    let update_payload = CreateGroup {
        name: group.name.unwrap_or_else(|| existing.name),
        color: group.color.unwrap_or_else(|| existing.color),
        sort_order: group.sort_order.unwrap_or(existing.sort_order),
    };

    db.update_group(group_id, update_payload)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Delete a group by ID
///
/// Note: Accounts associated with this group will have their group_id set to NULL.
#[tauri::command]
pub fn delete_group_command(
    db: tauri::State<Database>,
    id: String,
) -> Result<(), String> {
    let group_id = id.parse::<i64>()
        .map_err(|_| "Invalid group ID".to_string())?;

    db.delete_group(group_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get the number of accounts in a group
#[tauri::command]
pub fn get_group_accounts_count_command(
    db: tauri::State<Database>,
    id: String,
) -> Result<i64, String> {
    let group_id = id.parse::<i64>()
        .map_err(|_| "Invalid group ID".to_string())?;

    db.get_group_accounts_count(group_id)
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
        let payload = CreateGroupPayload {
            name: "Work".to_string(),
            color: Some("#ff0000".to_string()),
            sort_order: Some(1),
        };

        let result = frontend_to_db_create(payload).unwrap();

        assert_eq!(result.name, "Work");
        assert_eq!(result.color, "#ff0000");
        assert_eq!(result.sort_order, 1);
    }

    #[test]
    fn test_frontend_to_db_create_defaults() {
        let payload = CreateGroupPayload {
            name: "Personal".to_string(),
            color: None,
            sort_order: None,
        };

        let result = frontend_to_db_create(payload).unwrap();

        assert_eq!(result.name, "Personal");
        assert_eq!(result.color, "#6366f1");
        assert_eq!(result.sort_order, 0);
    }

    #[test]
    fn test_frontend_to_db_create_empty_name_fails() {
        let payload = CreateGroupPayload {
            name: "".to_string(),
            color: None,
            sort_order: None,
        };

        let result = frontend_to_db_create(payload);
        assert!(result.is_err());
    }

    #[test]
    fn test_frontend_to_db_create_whitespace_name_fails() {
        let payload = CreateGroupPayload {
            name: "   ".to_string(),
            color: None,
            sort_order: None,
        };

        let result = frontend_to_db_create(payload);
        assert!(result.is_err());
    }

    #[test]
    fn test_frontend_to_db_create_invalid_color_fails() {
        let payload = CreateGroupPayload {
            name: "Test".to_string(),
            color: Some("invalid".to_string()),
            sort_order: None,
        };

        let result = frontend_to_db_create(payload);
        assert!(result.is_err());
    }

    #[test]
    fn test_db_to_frontend_conversion() {
        let db_group = Group {
            id: 123,
            name: "Work".to_string(),
            color: "#3b82f6".to_string(),
            sort_order: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let result = db_to_frontend_group(db_group);

        assert_eq!(result.id, "123");
        assert_eq!(result.name, "Work");
        assert_eq!(result.color, "#3b82f6");
        assert_eq!(result.sort_order, 1);
        assert_eq!(result.created_at, "2024-01-01T00:00:00Z");
    }
}
