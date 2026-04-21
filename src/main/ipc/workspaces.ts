import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../store/db'
import type { Workspace } from '@shared/types'

// Tracks the currently active workspace ID in-memory so the quick-entry
// overlay can pick it up without needing the renderer to pass it over.
let activeWorkspaceId: string | null = null

export function getActiveWorkspaceId(): string | null {
  return activeWorkspaceId
}

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:list', (): Workspace[] => {
    return getDb()
      .prepare('SELECT id, name, created_at AS createdAt FROM workspaces ORDER BY created_at ASC')
      .all() as Workspace[]
  })

  ipcMain.handle('workspace:add', (_e, name: string): Workspace => {
    const trimmed = name?.trim() ?? ''
    if (!trimmed) throw new Error('Name is required')
    if (trimmed.length > 200) throw new Error('Name too long')

    const db = getDb()
    const existing = db.prepare('SELECT id FROM workspaces WHERE name = ? COLLATE NOCASE').get(trimmed)
    if (existing) throw new Error('Workspace already exists')

    const ws: Workspace = { id: randomUUID(), name: trimmed, createdAt: new Date().toISOString() }
    db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(ws.id, ws.name, ws.createdAt)
    return ws
  })

  ipcMain.handle('workspace:rename', (_e, id: string, name: string): void => {
    const trimmed = name?.trim() ?? ''
    if (!id) throw new Error('Invalid id')
    if (!trimmed) throw new Error('Name is required')
    if (trimmed.length > 200) throw new Error('Name too long')

    const db = getDb()
    const conflict = db
      .prepare('SELECT id FROM workspaces WHERE name = ? COLLATE NOCASE AND id != ?')
      .get(trimmed, id)
    if (conflict) throw new Error('Name already taken')
    db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(trimmed, id)
  })

  ipcMain.handle('workspace:remove', (_e, id: string): void => {
    if (!id) return
    getDb().prepare('DELETE FROM workspaces WHERE id = ?').run(id)
    if (activeWorkspaceId === id) activeWorkspaceId = null
  })

  ipcMain.handle('workspace:getActive', (): string | null => activeWorkspaceId)

  ipcMain.handle('workspace:setActive', (_e, id: string): void => {
    activeWorkspaceId = id
  })
}
