import { ipcMain, globalShortcut } from 'electron'
import { getDb } from '../store/db'
import { toggleQuickEntry } from '../windows'

export const DEFAULT_SHORTCUT = 'Ctrl+Cmd+Alt+Space'

export function getStoredShortcut(): string {
  const row = getDb()
    .prepare(`SELECT value FROM app_settings WHERE key = 'quick_entry_shortcut'`)
    .get() as { value: string } | undefined
  return row?.value ?? DEFAULT_SHORTCUT
}

export function registerShortcutHandlers(onChanged: (shortcut: string) => void): void {
  ipcMain.handle('shortcut:get', (): string => getStoredShortcut())

  ipcMain.handle('shortcut:set', (_e, shortcut: string): { ok: boolean; error?: string } => {
    if (!shortcut || typeof shortcut !== 'string') return { ok: false, error: 'Invalid shortcut' }

    const current = getStoredShortcut()
    try { globalShortcut.unregister(current) } catch {}

    let registered = false
    try {
      registered = globalShortcut.register(shortcut, toggleQuickEntry)
    } catch {
      try { globalShortcut.register(current, toggleQuickEntry) } catch {}
      return { ok: false, error: 'Invalid shortcut' }
    }

    if (!registered) {
      try { globalShortcut.register(current, toggleQuickEntry) } catch {}
      return { ok: false, error: 'Shortcut is already in use by another app' }
    }

    getDb()
      .prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('quick_entry_shortcut', ?)`)
      .run(shortcut)

    onChanged(shortcut)
    return { ok: true }
  })
}
