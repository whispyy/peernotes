import { ipcMain } from 'electron'
import { getDb } from '../store/db'
import { notifyMainWindow } from '../windows'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:reset', (_e, workspaceId: string): void => {
    const db = getDb()
    // Deletes only people in the current workspace; notes cascade via FK
    db.prepare('DELETE FROM people WHERE workspace_id = ?').run(workspaceId)
    notifyMainWindow()
  })
}
