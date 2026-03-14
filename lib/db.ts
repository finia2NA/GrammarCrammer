import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('grammarcrammer.db');
    await _db.execAsync('PRAGMA journal_mode = WAL;');
    await _db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(_db);
  }
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  const { user_version: version } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  ) ?? { user_version: 0 };

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS nodes (
        id            TEXT PRIMARY KEY,
        parent_id     TEXT REFERENCES nodes(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);

      CREATE TABLE IF NOT EXISTS decks (
        node_id              TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
        topic                TEXT NOT NULL,
        language             TEXT NOT NULL,
        explanation          TEXT,
        explanation_status   TEXT NOT NULL DEFAULT 'pending',
        card_count           INTEGER NOT NULL DEFAULT 10,
        last_studied_at      INTEGER
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  }
}
