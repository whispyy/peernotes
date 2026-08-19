import { getDb } from '../store/db'

export interface KbNote {
  id: string
  personId: string
  person: string
  sentiment: string
  note: string
  timestamp: string
}

/**
 * Archived people are hidden everywhere else in the app (every note query joins
 * people), so the knowledge base excludes them too — filing, regeneration and
 * Ask all work off this one definition of "live note".
 */
const SELECT_KB_NOTE = `
  SELECT n.id, n.person_id AS personId, p.name AS person, n.sentiment, n.note, n.timestamp
  FROM notes n
  INNER JOIN people p ON p.id = n.person_id
  WHERE p.workspace_id = ? AND p.archived_at IS NULL
`

export function listLiveNotes(workspaceId: string): KbNote[] {
  return getDb()
    .prepare(`${SELECT_KB_NOTE} ORDER BY n.timestamp DESC`)
    .all(workspaceId) as KbNote[]
}

export function liveNoteIds(workspaceId: string): Set<string> {
  const rows = getDb()
    .prepare(`SELECT n.id FROM notes n
              INNER JOIN people p ON p.id = n.person_id
              WHERE p.workspace_id = ? AND p.archived_at IS NULL`)
    .all(workspaceId) as Array<{ id: string }>
  return new Set(rows.map((r) => r.id))
}

export function getLiveNotesByIds(workspaceId: string, ids: string[]): KbNote[] {
  if (ids.length === 0) return []
  const db = getDb()
  const found: KbNote[] = []
  // Chunked to stay clear of SQLite's bound-parameter ceiling on big topics.
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400)
    const placeholders = chunk.map(() => '?').join(', ')
    const rows = db
      .prepare(`${SELECT_KB_NOTE} AND n.id IN (${placeholders}) ORDER BY n.timestamp ASC`)
      .all(workspaceId, ...chunk) as KbNote[]
    found.push(...rows)
  }
  return found
}

export function getLiveNote(noteId: string): (KbNote & { workspaceId: string }) | null {
  const row = getDb()
    .prepare(`
      SELECT n.id, n.person_id AS personId, p.name AS person, n.sentiment, n.note, n.timestamp,
             p.workspace_id AS workspaceId
      FROM notes n
      INNER JOIN people p ON p.id = n.person_id
      WHERE n.id = ? AND p.archived_at IS NULL
    `)
    .get(noteId) as (KbNote & { workspaceId: string }) | undefined
  return row ?? null
}

export function formatNoteForPrompt(note: KbNote): string {
  const date = note.timestamp.slice(0, 10)
  return `- id: ${note.id} | person: ${note.person} | date: ${date} | sentiment: ${note.sentiment}\n  ${note.note.replace(/\n/g, '\n  ')}`
}
