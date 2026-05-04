import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../store/db'
import { notifyWorkspaceChanged } from '../windows'
import type { Workspace } from '@shared/types'

let activeWorkspaceId: string | null = null

export function getActiveWorkspaceId(): string | null {
  return activeWorkspaceId
}

export function registerWorkspaceHandlers(): void {
  const db = getDb()
  const stored = db
    .prepare("SELECT value FROM app_settings WHERE key = 'active_workspace_id'")
    .get() as { value: string } | undefined
  if (stored) activeWorkspaceId = stored.value

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
    if (activeWorkspaceId === id) {
      activeWorkspaceId = null
      getDb().prepare("DELETE FROM app_settings WHERE key = 'active_workspace_id'").run()
    }
  })

  ipcMain.handle('workspace:getActive', (): string | null => activeWorkspaceId)

  ipcMain.handle('workspace:setActive', (_e, id: string): void => {
    activeWorkspaceId = id
    getDb()
      .prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('active_workspace_id', ?)")
      .run(id)
    notifyWorkspaceChanged()
  })
}
