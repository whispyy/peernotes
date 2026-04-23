import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { getDb } from '../store/db'
import { notifyPeopleUpdated } from '../windows'
import type { Person } from '@shared/types'

export const SELECT_PERSON = `SELECT id, workspace_id AS workspaceId, name, created_at AS createdAt FROM people`

export function registerPeopleHandlers(): void {
  ipcMain.handle('people:list', (_e, workspaceId: string): Person[] => {
    return getDb()
      .prepare(`${SELECT_PERSON} WHERE workspace_id = ? ORDER BY name COLLATE NOCASE`)
      .all(workspaceId) as Person[]
  })

  ipcMain.handle('people:add', (_e, workspaceId: string, name: string): Person => {
    const trimmed = name?.trim() ?? ''
    if (!trimmed)             throw new Error('Name is required')
    if (trimmed.length > 200) throw new Error('Name too long')

    const db = getDb()
    const person: Person = {
      id: uuid(),
      workspaceId,
      name: trimmed,
      createdAt: new Date().toISOString()
    }

    db.transaction(() => {
      const existing = db
        .prepare('SELECT id FROM people WHERE name = ? COLLATE NOCASE AND workspace_id = ?')
        .get(trimmed, workspaceId)
      if (existing) throw new Error('Person already exists')
      db.prepare('INSERT INTO people (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)').run(
        person.id, person.workspaceId, person.name, person.createdAt
      )
    })()

    notifyPeopleUpdated()
    return person
  })

  ipcMain.handle('people:rename', (_e, id: string, name: string): void => {
    const trimmed = name?.trim() ?? ''
    if (!id || typeof id !== 'string') throw new Error('Invalid id')
    if (!trimmed)             throw new Error('Name is required')
    if (trimmed.length > 200) throw new Error('Name too long')

    const db = getDb()
    db.transaction(() => {
      const person = db.prepare('SELECT workspace_id FROM people WHERE id = ?').get(id) as { workspace_id: string } | undefined
      if (!person) throw new Error('Person not found')
      const conflict = db
        .prepare('SELECT id FROM people WHERE name = ? COLLATE NOCASE AND workspace_id = ? AND id != ?')
        .get(trimmed, person.workspace_id, id)
      if (conflict) throw new Error('Name already taken')
      db.prepare('UPDATE people SET name = ? WHERE id = ?').run(trimmed, id)
    })()
    notifyPeopleUpdated()
  })

  ipcMain.handle('people:remove', (_e, id: string): void => {
    if (!id || typeof id !== 'string') return
    // Notes cascade via FK ON DELETE CASCADE
    getDb().prepare('DELETE FROM people WHERE id = ?').run(id)
    notifyPeopleUpdated()
  })
}
