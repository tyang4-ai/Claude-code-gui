//! Claude GUI Companion - Rust Backend
//!
//! This crate provides the Tauri backend for the Claude GUI Companion application.
//! It includes services for managing Claude CLI processes, parsing stream-json output,
//! and handling file operations.

pub mod commands;
pub mod services;

use commands::session::AppState;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

/// Toggle window visibility
fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// Build the system tray menu
fn build_tray_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let new_session = MenuItem::with_id(app, "new_session", "New Session", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    Menu::with_items(app, &[&show, &new_session, &quit])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::new())
        .setup(|app| {
            // Build and register system tray
            let menu = build_tray_menu(app.handle())?;
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Claude GUI Companion")
                .icon(app.default_window_icon().unwrap().clone())
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        toggle_window(app);
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "new_session" => {
                        // Emit event to frontend to open new session dialog
                        let _ = app.emit("tray-new-session", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Register global hotkey (Ctrl+Shift+Space)
            let shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::Space,
            );

            // Register the shortcut with handler
            let handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    toggle_window(&handle);
                }
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Session commands
            commands::session::spawn_session,
            commands::session::send_prompt,
            commands::session::send_interrupt,
            commands::session::terminate_session,
            commands::session::get_sessions,
            commands::session::get_session,
            commands::session::is_session_alive,
            commands::session::get_session_count,
            commands::session::terminate_all_sessions,
            // File commands
            commands::files::read_file,
            commands::files::write_file_atomic,
            commands::files::check_file_modified,
            commands::files::apply_edit,
            commands::files::list_files,
            commands::files::file_exists,
            commands::files::get_file_metadata,
            // System commands
            commands::system::get_app_data_dir,
            commands::system::get_home_dir,
            commands::system::git_current_branch,
            commands::system::git_diff,
            commands::system::git_status,
            commands::system::git_staged,
            commands::system::open_in_vscode,
            commands::system::open_diff_in_vscode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
