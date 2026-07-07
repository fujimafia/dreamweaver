use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_color_feature",
            sql: include_str!("../migrations/002_add_color_feature.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "seed_yarn_stash",
            sql: include_str!("../migrations/003_seed_yarn_stash.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "yarn_photos",
            sql: include_str!("../migrations/004_yarn_photos.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:dreamweaver.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
