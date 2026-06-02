import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { getDb } from '../store/db'
import { getLocalPath } from './attachments'
import type { Person, Note, ExportNote, Attachment, ExportAttachment, ExportResultV2 } from '@shared/types'

interface ExportPayload {
  workspaceId: string
  from?: string
  to?: string
}

export function buildExport(
  workspaceId: string,
  from?: string,
  to?: string,
  includeAttachmentData = false
): ExportResultV2 {
  const db = getDb()

  let notes = db
    .prepare(`
      SELECT n.id, n.person_id AS personId, n.sentiment, n.note, n.timestamp
      FROM notes n
      INNER JOIN people p ON p.id = n.person_id
      WHERE p.workspace_id = ?
      ORDER BY n.timestamp ASC
    `)
    .all(workspaceId) as Note[]

  if (from) {
    const fromDate = new Date(from + 'T00:00:00')
    notes = notes.filter((n) => new Date(n.timestamp) >= fromDate)
  }
  if (to) {
    const toDate = new Date(to + 'T23:59:59.999')
    notes = notes.filter((n) => new Date(n.timestamp) <= toDate)
  }

  const people = db
    .prepare('SELECT id, workspace_id AS workspaceId, name, created_at AS createdAt FROM people WHERE workspace_id = ?')
    .all(workspaceId) as Person[]
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]))

  const exportNotes: ExportNote[] = notes.map((n) => ({
    id: n.id,
    personId: n.personId,
    person: peopleById[n.personId]?.name ?? 'Unknown',
    sentiment: n.sentiment,
    note: n.note,
    timestamp: n.timestamp
  }))

  const noteIds = notes.map((n) => n.id)
  let attachments: ExportAttachment[] = []
  if (noteIds.length > 0) {
    const placeholders = noteIds.map(() => '?').join(',')
    const rows = db
      .prepare(
        `SELECT id, note_id AS noteId, filename, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt
         FROM note_attachments WHERE note_id IN (${placeholders}) ORDER BY created_at ASC`
      )
      .all(...noteIds) as Attachment[]
    attachments = rows.map((att) => {
      let data = ''
      if (includeAttachmentData) {
        const filePath = getLocalPath(att.id, att.mimeType)
        if (fs.existsSync(filePath)) {
          data = fs.readFileSync(filePath).toString('base64')
        }
      }
      return { ...att, data }
    })
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    from: from ?? null,
    to: to ?? null,
    total: notes.length,
    people,
    notes: exportNotes,
    attachments,
  }
}

export function registerExportHandlers(): void {
  ipcMain.handle('notes:export', (_e, { workspaceId, from, to }: ExportPayload): ExportResultV2 => {
    if (from && isNaN(Date.parse(from))) throw new Error('Invalid from date')
    if (to && isNaN(Date.parse(to))) throw new Error('Invalid to date')
    return buildExport(workspaceId, from, to, true)
  })

  ipcMain.handle(
    'export:saveFile',
    async (_e, { content, filename }: { content: string; filename: string }): Promise<boolean> => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (canceled || !filePath) return false
      fs.writeFileSync(filePath, content, 'utf-8')
      return true
    }
  )

  ipcMain.handle(
    'export:saveText',
    async (
      _e,
      { content, filename, filters }: { content: string; filename: string; filters: { name: string; extensions: string[] }[] }
    ): Promise<boolean> => {
      const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: filename, filters })
      if (canceled || !filePath) return false
      fs.writeFileSync(filePath, content, 'utf-8')
      return true
    }
  )
}
