import { ipcMain } from 'electron'
import { getDb } from '../store/db'
import { notifyMainWindow } from '../windows'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:reset', (): void => {
    const db = getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM notes').run()
      db.prepare('DELETE FROM people').run()
    })()
    notifyMainWindow()
  })
}
