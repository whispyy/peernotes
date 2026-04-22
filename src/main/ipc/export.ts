import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { getDb } from '../store/db'
import type { Person, Note, ExportNote, ExportResult } from '@shared/types'

interface ExportPayload {
  workspaceId: string
  from?: string
  to?: string
}

export function buildExport(workspaceId: string, from?: string, to?: string): ExportResult {
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

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    from: from ?? null,
    to: to ?? null,
    total: notes.length,
    people,
    notes: exportNotes
  }
}

export function registerExportHandlers(): void {
  ipcMain.handle('notes:export', (_e, { workspaceId, from, to }: ExportPayload): ExportResult => {
    if (from && isNaN(Date.parse(from))) throw new Error('Invalid from date')
    if (to && isNaN(Date.parse(to))) throw new Error('Invalid to date')
    return buildExport(workspaceId, from, to)
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
}
