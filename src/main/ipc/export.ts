import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { getDb } from '../store/db'
import { SELECT_NOTE } from './notes'
import { SELECT_PERSON } from './people'
import type { Person, Note, ExportNote, ExportResult } from '@shared/types'

interface ExportPayload {
  from?: string
  to?: string
}

export function registerExportHandlers(): void {
  ipcMain.handle('notes:export', (_e, { from, to }: ExportPayload): ExportResult => {
    if (from && isNaN(Date.parse(from))) throw new Error('Invalid from date')
    if (to && isNaN(Date.parse(to))) throw new Error('Invalid to date')

    const db = getDb()

    let notes = db
      .prepare(`${SELECT_NOTE} ORDER BY timestamp ASC`)
      .all() as Note[]

    if (from) {
      const fromDate = new Date(from + 'T00:00:00')
      notes = notes.filter((n) => new Date(n.timestamp) >= fromDate)
    }
    if (to) {
      const toDate = new Date(to + 'T23:59:59.999')
      notes = notes.filter((n) => new Date(n.timestamp) <= toDate)
    }

    const people = db.prepare(`${SELECT_PERSON}`).all() as Person[]
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
