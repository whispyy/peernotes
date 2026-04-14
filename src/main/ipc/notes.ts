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
  ipcMain.handle('notes:list', (): Note[] => {
    return getDb()
      .prepare(`${SELECT_NOTE} ORDER BY timestamp DESC`)
      .all() as Note[]
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
}
