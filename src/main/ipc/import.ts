import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { basename } from 'path'
import { v4 as uuid } from 'uuid'
import { getDb } from '../store/db'
import { notifyMainWindow } from '../windows'
import { VALID_SENTIMENTS, NOTE_MAX_LENGTH } from '@shared/types'
import type { ImportPayload, ImportResult } from '@shared/types'
import { getLocalPath, isValidAttachmentId, isValidMimeType } from './attachments'

export function performImport(payload: ImportPayload, workspaceId: string): ImportResult {
  if (!payload || !Array.isArray(payload.notes)) {
    return { imported: 0, skipped: 0, peopleCreated: 0 }
  }

  const db = getDb()
  let imported = 0
  let skipped = 0
  let peopleCreated = 0

  // Collect file writes to perform after the transaction commits
  const filesToWrite: Array<{ path: string; data: string }> = []

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
      (db.prepare(`
        SELECT n.id FROM notes n
        INNER JOIN people p ON p.id = n.person_id
        WHERE p.workspace_id = ?
      `).all(workspaceId) as Array<{ id: string }>).map((r) => r.id)
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

    // Import attachments — only when base64 data is present (GitHub exports).
    // iCloud exports have no data; those are handled entirely by doICloudPull.
    if (Array.isArray(payload.attachments)) {
      const insertAtt = db.prepare(
        `INSERT OR IGNORE INTO note_attachments (id, note_id, filename, mime_type, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      const checkNote = db.prepare('SELECT id FROM notes WHERE id = ?')
      for (const att of payload.attachments) {
        if (!att.data) continue  // skip rows with no file data — avoids dangling DB records
        if (!att.id || !att.noteId || !att.filename || !att.mimeType) continue
        if (!isValidAttachmentId(att.id) || !isValidMimeType(att.mimeType)) continue
        if (!checkNote.get(att.noteId)) continue
        insertAtt.run(
          att.id,
          att.noteId,
          att.filename,
          att.mimeType,
          att.sizeBytes ?? 0,
          att.createdAt ?? new Date().toISOString()
        )
        const localPath = getLocalPath(att.id, att.mimeType)
        if (!fs.existsSync(localPath)) {
          filesToWrite.push({ path: localPath, data: att.data })
        }
      }
    }
  })

  run()

  // Write files after the transaction has committed so a failed write
  // cannot leave DB rows without matching files.
  for (const { path: p, data } of filesToWrite) {
    if (!fs.existsSync(p)) {
      try { fs.writeFileSync(p, Buffer.from(data, 'base64')) } catch { /* skip on write error */ }
    }
  }

  return { imported, skipped, peopleCreated }
}

export function registerImportHandlers(): void {
  ipcMain.handle('import:openFile', async (): Promise<{ content: string; name: string } | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return null
    return {
      content: fs.readFileSync(filePaths[0], 'utf-8'),
      name: basename(filePaths[0])
    }
  })

  ipcMain.handle('notes:import', (_e, payload: ImportPayload, workspaceId: string): ImportResult => {
    const result = performImport(payload, workspaceId)
    if (result.imported > 0) notifyMainWindow()
    return result
  })
}
