import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

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
}
