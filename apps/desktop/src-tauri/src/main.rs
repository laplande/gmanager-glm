// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod accounts;
mod auth;
mod crypto;
mod db;
mod groups;
mod tags;

use accounts::{
    batch_delete_accounts_command, batch_update_accounts_command, create_account_command,
    delete_account_command, get_account_command, get_account_stats_command,
    get_accounts_command, get_accounts_count_command, search_accounts_command,
    update_account_command,
};
use auth::SessionManager;
use db::Database;
use groups::{
    create_group_command, delete_group_command, get_group_accounts_count_command,
    get_group_command, get_groups_command, update_group_command,
};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database
            let db = Database::init(app.handle())?;
            app.manage(db);

            // Initialize session manager
            let session_manager = SessionManager::new();
            app.manage(session_manager);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Vault commands
            auth::check_has_vault_command,
            auth::create_vault_command,
            auth::unlock_vault_command,
            auth::logout_command,
            auth::change_password_command,
            // Account commands
            get_accounts_command,
            get_account_command,
            get_accounts_count_command,
            create_account_command,
            update_account_command,
            delete_account_command,
            search_accounts_command,
            batch_delete_accounts_command,
            batch_update_accounts_command,
            get_account_stats_command,
            // Group commands
            get_groups_command,
            get_group_command,
            create_group_command,
            update_group_command,
            delete_group_command,
            get_group_accounts_count_command,
            // Tag commands
            tags::get_tags_command,
            tags::get_tag_command,
            tags::create_tag_command,
            tags::update_tag_command,
            tags::delete_tag_command,
            tags::add_tag_to_account_command,
            tags::remove_tag_from_account_command,
            tags::get_account_tags_command,
            tags::set_account_tags_command,
            tags::get_tag_accounts_count_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
