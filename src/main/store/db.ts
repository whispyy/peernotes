import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { randomUUID } from 'crypto'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })

  const db = new Database(join(dir, 'peernotes.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  _db = db  // only set after successful migration

  return _db
}

export function closeDb(): void {
  _db?.close()
  _db = null
}

// ── Migrations ────────────────────────────────────────────────────────────────

function migrate(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number

  if (version < 1) {
    // Wrap DDL in a transaction so a mid-migration crash leaves the schema
    // untouched and is safely re-attempted on the next launch.
    // user_version is set outside the transaction (schema pragmas commit separately).
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS people (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
          id         TEXT PRIMARY KEY,
          person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
          sentiment  TEXT NOT NULL CHECK(sentiment IN ('positive','neutral','negative')),
          note       TEXT NOT NULL,
          timestamp  TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_notes_person ON notes(person_id);
        CREATE INDEX IF NOT EXISTS idx_notes_ts     ON notes(timestamp);
      `)
    })()
    db.pragma('user_version = 1')
  }

  if (version < 2) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ai_settings (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_purposes (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          system_prompt TEXT NOT NULL,
          sort_order    INTEGER NOT NULL DEFAULT 0
        );

        INSERT OR IGNORE INTO ai_settings (key, value) VALUES ('enabled', 'false');
        INSERT OR IGNORE INTO ai_settings (key, value) VALUES ('api_key', '');
        INSERT OR IGNORE INTO ai_settings (key, value) VALUES ('model', '');
      `)
    })()
    db.pragma('user_version = 2')
  }

  if (version < 3) {
    const defaultId = randomUUID()
    const now = new Date().toISOString()
    // Disable FK enforcement for the duration of this migration so that
    // DROP TABLE people does not cascade-delete notes via ON DELETE CASCADE.
    db.pragma('foreign_keys = OFF')
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
          created_at TEXT NOT NULL
        );
      `)
      db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(defaultId, 'Default', now)

      // Recreate people with workspace_id (SQLite can't add NOT NULL via ALTER TABLE)
      db.exec(`
        CREATE TABLE people_new (
          id           TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          name         TEXT NOT NULL,
          created_at   TEXT NOT NULL,
          UNIQUE(workspace_id, name)
        );
      `)
      db.prepare(`INSERT INTO people_new (id, workspace_id, name, created_at)
                  SELECT id, ?, name, created_at FROM people`).run(defaultId)
      db.exec(`
        DROP TABLE people;
        ALTER TABLE people_new RENAME TO people;
        CREATE INDEX IF NOT EXISTS idx_people_workspace ON people(workspace_id);
      `)
    })()
    db.pragma('foreign_keys = ON')
    db.pragma('user_version = 3')
  }

  if (version < 4) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_settings (
          id                        INTEGER PRIMARY KEY CHECK (id = 1),
          github_token              TEXT,
          repo                      TEXT,
          branch                    TEXT NOT NULL DEFAULT 'main',
          file_path                 TEXT NOT NULL DEFAULT 'peernotes',
          last_synced_at            INTEGER,
          last_sync_error           TEXT,
          auto_sync_enabled         INTEGER NOT NULL DEFAULT 0,
          auto_sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
          auto_sync_direction       TEXT NOT NULL DEFAULT 'both'
        );
        INSERT OR IGNORE INTO sync_settings (id) VALUES (1);
      `)
    })()
    db.pragma('user_version = 4')
  }

  if (version < 5) {
    db.transaction(() => {
      db.exec(`UPDATE sync_settings SET file_path = 'peernotes' WHERE file_path = 'peernotes/backup.json'`)
    })()
    db.pragma('user_version = 5')
  }
}
