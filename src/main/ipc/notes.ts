import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { getDb } from '../store/db'
import { notifyMainWindow } from '../windows'
import { VALID_SENTIMENTS, NOTE_MAX_LENGTH } from '@shared/types'
import type { Note, Sentiment } from '@shared/types'

export const SELECT_NOTE = `
  SELECT id, person_id AS personId, sentiment, note, timestamp
  FROM notes
`

export function registerNotesHandlers(): void {
  ipcMain.handle('notes:list', (_e, workspaceId: string, offset = 0, limit = 100): Note[] => {
    return getDb()
      .prepare(`
        SELECT n.id, n.person_id AS personId, n.sentiment, n.note, n.timestamp
        FROM notes n
        INNER JOIN people p ON p.id = n.person_id
        WHERE p.workspace_id = ?
        ORDER BY n.timestamp DESC
        LIMIT ? OFFSET ?
      `)
      .all(workspaceId, limit, offset) as Note[]
  })

  ipcMain.handle('notes:count', (_e, workspaceId: string, from?: string, to?: string): number => {
    const db = getDb()
    // Use local-time boundaries (same as notes:export) so count preview matches actual export.
    const fromIso = from ? new Date(from + 'T00:00:00').toISOString() : undefined
    const toIso   = to   ? new Date(to   + 'T23:59:59.999').toISOString() : undefined
    if (fromIso && toIso) {
      const row = db.prepare(`
        SELECT COUNT(*) AS total FROM notes n
        INNER JOIN people p ON p.id = n.person_id
        WHERE p.workspace_id = ? AND n.timestamp >= ? AND n.timestamp <= ?
      `).get(workspaceId, fromIso, toIso) as { total: number }
      return row.total
    }
    if (fromIso) {
      const row = db.prepare(`
        SELECT COUNT(*) AS total FROM notes n
        INNER JOIN people p ON p.id = n.person_id
        WHERE p.workspace_id = ? AND n.timestamp >= ?
      `).get(workspaceId, fromIso) as { total: number }
      return row.total
    }
    if (toIso) {
      const row = db.prepare(`
        SELECT COUNT(*) AS total FROM notes n
        INNER JOIN people p ON p.id = n.person_id
        WHERE p.workspace_id = ? AND n.timestamp <= ?
      `).get(workspaceId, toIso) as { total: number }
      return row.total
    }
    const row = db.prepare(`
      SELECT COUNT(*) AS total FROM notes n
      INNER JOIN people p ON p.id = n.person_id
      WHERE p.workspace_id = ?
    `).get(workspaceId) as { total: number }
    return row.total
  })

  ipcMain.handle('notes:count-by-person', (_e, workspaceId: string): Record<string, number> => {
    const rows = getDb()
      .prepare(`
        SELECT n.person_id AS personId, COUNT(*) AS total
        FROM notes n
        INNER JOIN people p ON p.id = n.person_id
        WHERE p.workspace_id = ?
        GROUP BY n.person_id
      `)
      .all(workspaceId) as Array<{ personId: string; total: number }>
    return Object.fromEntries(rows.map((r) => [r.personId, r.total]))
  })

  ipcMain.handle('notes:search', (_e, workspaceId: string, query: string): Note[] => {
    const like = `%${query}%`
    return getDb()
      .prepare(`
        SELECT n.id, n.person_id AS personId, n.sentiment, n.note, n.timestamp
        FROM notes n
        INNER JOIN people p ON p.id = n.person_id
        WHERE p.workspace_id = ? AND (n.note LIKE ? OR p.name LIKE ?)
        ORDER BY n.timestamp DESC
      `)
      .all(workspaceId, like, like) as Note[]
  })

  ipcMain.handle('notes:list-for-person-in-range', (_e, personId: string, from: string, to: string): Note[] => {
    const fromIso = new Date(from + 'T00:00:00').toISOString()
    const toIso   = new Date(to   + 'T23:59:59.999').toISOString()
    return getDb()
      .prepare(`
        SELECT id, person_id AS personId, sentiment, note, timestamp
        FROM notes
        WHERE person_id = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
      `)
      .all(personId, fromIso, toIso) as Note[]
  })

  ipcMain.handle('notes:list-for-person', (_e, personId: string, offset = 0, limit = 100): Note[] => {
    return getDb()
      .prepare(`
        SELECT id, person_id AS personId, sentiment, note, timestamp
        FROM notes
        WHERE person_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `)
      .all(personId, limit, offset) as Note[]
  })

  ipcMain.handle(
    'notes:add',
    (_e, payload: { personId: string; sentiment: Sentiment; note: string }): Note => {
      const { personId, sentiment, note } = payload

      if (!VALID_SENTIMENTS.includes(sentiment)) throw new Error('Invalid sentiment')
      if (!note?.trim())                         throw new Error('Note is required')

      const db = getDb()
      const personExists = db.prepare('SELECT id FROM people WHERE id = ?').get(personId)
      if (!personExists) throw new Error('Unknown person')

      const n: Note = {
        id: uuid(),
        personId,
        sentiment,
        note: note.slice(0, NOTE_MAX_LENGTH),
        timestamp: new Date().toISOString()
      }

      db.prepare(
        'INSERT INTO notes (id, person_id, sentiment, note, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).run(n.id, n.personId, n.sentiment, n.note, n.timestamp)

      notifyMainWindow()
      return n
    }
  )

  ipcMain.handle('notes:remove', (_e, id: string): void => {
    if (!id || typeof id !== 'string') return
    getDb().prepare('DELETE FROM notes WHERE id = ?').run(id)
    notifyMainWindow()
  })

  ipcMain.handle(
    'notes:update',
    (_e, id: string, payload: { sentiment: Sentiment; note: string }): Note => {
      if (!id || typeof id !== 'string') throw new Error('Invalid note id')
      const { sentiment, note } = payload
      if (!VALID_SENTIMENTS.includes(sentiment)) throw new Error('Invalid sentiment')
      if (!note?.trim()) throw new Error('Note is required')

      const db = getDb()
      const existing = db
        .prepare(`${SELECT_NOTE} WHERE id = ?`)
        .get(id) as Note | undefined
      if (!existing) throw new Error('Note not found')

      const trimmed = note.trim().slice(0, NOTE_MAX_LENGTH)
      db.prepare('UPDATE notes SET sentiment = ?, note = ? WHERE id = ?').run(sentiment, trimmed, id)

      notifyMainWindow()
      return { ...existing, sentiment, note: trimmed }
    }
  )
}
