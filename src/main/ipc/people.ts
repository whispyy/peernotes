import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { getDb } from '../store/db'
import type { Person } from '@shared/types'

export const SELECT_PERSON = `SELECT id, name, created_at AS createdAt FROM people`

export function registerPeopleHandlers(): void {
  ipcMain.handle('people:list', (): Person[] => {
    return getDb().prepare(`${SELECT_PERSON} ORDER BY name COLLATE NOCASE`).all() as Person[]
  })

  ipcMain.handle('people:add', (_e, name: string): Person => {
    const trimmed = name?.trim() ?? ''
    if (!trimmed)             throw new Error('Name is required')
    if (trimmed.length > 200) throw new Error('Name too long')

    const db = getDb()
    const person: Person = { id: uuid(), name: trimmed, createdAt: new Date().toISOString() }

    db.transaction(() => {
      const existing = db.prepare('SELECT id FROM people WHERE name = ? COLLATE NOCASE').get(trimmed)
      if (existing) throw new Error('Person already exists')
      db.prepare('INSERT INTO people (id, name, created_at) VALUES (?, ?, ?)').run(
        person.id, person.name, person.createdAt
      )
    })()

    return person
  })

  ipcMain.handle('people:rename', (_e, id: string, name: string): void => {
    const trimmed = name?.trim() ?? ''
    if (!id || typeof id !== 'string') throw new Error('Invalid id')
    if (!trimmed)             throw new Error('Name is required')
    if (trimmed.length > 200) throw new Error('Name too long')

    const db = getDb()
    db.transaction(() => {
      const conflict = db.prepare(
        'SELECT id FROM people WHERE name = ? COLLATE NOCASE AND id != ?'
      ).get(trimmed, id)
      if (conflict) throw new Error('Name already taken')
      db.prepare('UPDATE people SET name = ? WHERE id = ?').run(trimmed, id)
    })()
  })

  ipcMain.handle('people:remove', (_e, id: string): void => {
    if (!id || typeof id !== 'string') return
    // Notes cascade via FK ON DELETE CASCADE
    getDb().prepare('DELETE FROM people WHERE id = ?').run(id)
  })
}
