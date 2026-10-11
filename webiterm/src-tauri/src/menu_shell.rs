use tauri::menu::{HELP_SUBMENU_ID, Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
use tauri::{App, AppHandle, Emitter, Wry};

pub const OPEN_PERMISSIONS_MENU_ID: &str = "open-permissions";
pub const OPEN_ABOUT_MENU_ID: &str = "open-about";
pub const CHECK_FOR_UPDATES_MENU_ID: &str = "check-for-updates";

pub fn install(handle: &AppHandle) -> Result<(), tauri::Error> {
    let menu = Menu::default(handle)?;
    let help_item = MenuItem::with_id(
        handle,
        OPEN_PERMISSIONS_MENU_ID,
        "Local data…",
        true,
        Some("CmdOrCtrl+Shift+U"),
    )?;

    if let Some(MenuItemKind::Submenu(help)) = menu.get(HELP_SUBMENU_ID) {
        help.insert(&help_item, 0)?;
    }

    #[cfg(target_os = "macos")]
    {
        let app_name = handle.package_info().name.clone();
        let app_item = MenuItem::with_id(
            handle,
            OPEN_PERMISSIONS_MENU_ID,
            "Local data…",
            true,
            None::<&str>,
        )?;
        for kind in menu.items()? {
            if let MenuItemKind::Submenu(sub) = kind
                && sub.text()? == app_name
            {
                sub.insert(&app_item, 2)?;
                break;
            }
        }
    }

    for kind in menu.items()? {
        if let MenuItemKind::Submenu(sub) = kind
            && sub.text()? == "View"
        {
            let separator = PredefinedMenuItem::separator(handle)?;
            let view_item = MenuItem::with_id(
                handle,
                OPEN_PERMISSIONS_MENU_ID,
                "Local data…",
                true,
                None::<&str>,
            )?;
            sub.append(&separator)?;
            sub.append(&view_item)?;
            break;
        }
    }

    insert_check_for_updates_item(handle, &menu)?;
    replace_about_item(handle, &menu)?;
    handle.set_menu(menu)?;
    Ok(())
}

fn insert_check_for_updates_item(handle: &AppHandle, menu: &Menu<Wry>) -> Result<(), tauri::Error> {
    let item = MenuItem::with_id(
        handle,
        CHECK_FOR_UPDATES_MENU_ID,
        "Check for Updates…",
        true,
        None::<&str>,
    )?;
    for kind in menu.items()? {
        let MenuItemKind::Submenu(submenu) = kind else {
            continue;
        };
        let children = submenu.items()?;
        for (index, child) in children.iter().enumerate() {
            let label = menu_kind_text(child)?;
            if !label.starts_with("About") {
                continue;
            }
            submenu.insert(&item, index)?;
            return Ok(());
        }
    }
    Ok(())
}

fn replace_about_item(handle: &AppHandle, menu: &Menu<Wry>) -> Result<(), tauri::Error> {
    for kind in menu.items()? {
        let MenuItemKind::Submenu(submenu) = kind else {
            continue;
        };
        let children = submenu.items()?;
        for (index, child) in children.iter().enumerate() {
            let label = menu_kind_text(child)?;
            if !label.starts_with("About") {
                continue;
            }
            submenu.remove_at(index)?;
            let item = MenuItem::with_id(handle, OPEN_ABOUT_MENU_ID, label, true, None::<&str>)?;
            submenu.insert(&item, index)?;
            break;
        }
    }
    Ok(())
}

fn menu_kind_text(kind: &MenuItemKind<Wry>) -> Result<String, tauri::Error> {
    match kind {
        MenuItemKind::MenuItem(item) => item.text(),
        MenuItemKind::Submenu(item) => item.text(),
        MenuItemKind::Predefined(item) => item.text(),
        MenuItemKind::Check(item) => item.text(),
        MenuItemKind::Icon(item) => item.text(),
    }
}

pub fn on_menu_event(app: &AppHandle<Wry>, event: &tauri::menu::MenuEvent) {
    if event.id().as_ref() == OPEN_PERMISSIONS_MENU_ID {
        let _ = app.emit_to("main", "open-permissions-modal", ());
    }
    if event.id().as_ref() == OPEN_ABOUT_MENU_ID {
        let _ = app.emit_to("main", "open-about-modal", ());
    }
    if event.id().as_ref() == CHECK_FOR_UPDATES_MENU_ID {
        let _ = app.emit_to("main", "check-for-updates", ());
    }
}

pub fn install_from_setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    install(app.handle()).map_err(|err| err.into())
}
