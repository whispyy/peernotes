import { ipcMain, dialog } from 'electron'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { v4 as uuid } from 'uuid'
import { getDb } from '../store/db'
import { notifyMainWindow } from '../windows'
import { VALID_SENTIMENTS, NOTE_MAX_LENGTH } from '@shared/types'
import type { ImportPayload, ImportResult } from '@shared/types'

export function registerImportHandlers(): void {
  ipcMain.handle('import:openFile', async (): Promise<{ content: string; name: string } | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return null
    return {
      content: readFileSync(filePaths[0], 'utf-8'),
      name: basename(filePaths[0])
    }
  })

  ipcMain.handle('notes:import', (_e, payload: ImportPayload, workspaceId: string): ImportResult => {
    if (!payload || !Array.isArray(payload.notes)) {
      return { imported: 0, skipped: 0, peopleCreated: 0 }
    }

    const db = getDb()
    let imported = 0
    let skipped = 0
    let peopleCreated = 0

    const run = db.transaction(() => {
      // Build a case-insensitive name→id map scoped to this workspace
      const nameToId = new Map<string, string>()
      const existing = db
        .prepare('SELECT id, name FROM people WHERE workspace_id = ?')
        .all(workspaceId) as Array<{ id: string; name: string }>
      for (const p of existing) nameToId.set(p.name.toLowerCase(), p.id)

      // Seed from payload.people for v1 round-trip fidelity
      if (Array.isArray(payload.people)) {
        const insertPerson = db.prepare(
          'INSERT OR IGNORE INTO people (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)'
        )
        for (const p of payload.people) {
          if (!p.id || !p.name?.trim()) continue
          const name = p.name.trim()
          const r = insertPerson.run(p.id, workspaceId, name, p.createdAt ?? new Date().toISOString())
          if (r.changes > 0) {
            peopleCreated++
            nameToId.set(name.toLowerCase(), p.id)
          }
        }
      }

      const existingNoteIds = new Set<string>(
        (db.prepare('SELECT id FROM notes').all() as Array<{ id: string }>).map((r) => r.id)
      )

      for (const note of payload.notes) {
        const personName = note.person?.trim()
        if (!personName) { skipped++; continue }
        if (!VALID_SENTIMENTS.includes(note.sentiment as never)) { skipped++; continue }
        if (!note.note?.trim()) { skipped++; continue }
        if (!note.timestamp || isNaN(Date.parse(note.timestamp))) { skipped++; continue }
        if (note.id && existingNoteIds.has(note.id)) { skipped++; continue }

        let personId = nameToId.get(personName.toLowerCase())
        if (!personId) {
          personId = uuid()
          db.prepare('INSERT INTO people (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)').run(
            personId, workspaceId, personName, new Date().toISOString()
          )
          nameToId.set(personName.toLowerCase(), personId)
          peopleCreated++
        }

        db.prepare(
          'INSERT INTO notes (id, person_id, sentiment, note, timestamp) VALUES (?, ?, ?, ?, ?)'
        ).run(
          note.id ?? uuid(),
          personId,
          note.sentiment,
          note.note.slice(0, NOTE_MAX_LENGTH),
          note.timestamp
        )
        imported++
      }
    })

    run()
    if (imported > 0) notifyMainWindow()
    return { imported, skipped, peopleCreated }
  })
}
