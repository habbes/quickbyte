use std::fs;
use std::path::Path;

use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn init(db_path: &str) -> SqliteConnection {
    if !db_file_exists(db_path) {
        create_db_file(db_path);
    }

    println!("Initializing db {db_path:?}");
    let mut connection = establish_connection(db_path);
    run_migrations(&mut connection);

    connection
}

fn run_migrations(connection: &mut SqliteConnection) {
    connection.run_pending_migrations(MIGRATIONS).unwrap();
}

fn establish_connection(db_path: &str) -> SqliteConnection {
    SqliteConnection::establish(&db_path)
        .unwrap_or_else(|_| panic!("Error connecting to {}", db_path))
}

fn create_db_file(db_path: &str) {
    let db_dir = Path::new(db_path).parent().unwrap();

    if !db_dir.exists() {
        fs::create_dir_all(db_dir).unwrap();
    }

    fs::File::create(db_path).unwrap();
}

fn db_file_exists(db_path: &str) -> bool {
    Path::new(&db_path).exists()
}
