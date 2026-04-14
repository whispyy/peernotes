import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { createMainWindow, createQuickEntryWindow, toggleQuickEntry, getMainWindow } from './windows'
import { registerPeopleHandlers } from './ipc/people'
import { registerNotesHandlers } from './ipc/notes'
import { registerExportHandlers } from './ipc/export'
import { registerImportHandlers } from './ipc/import'
import { registerSettingsHandlers } from './ipc/settings'
import { closeDb } from './store/db'

let tray: Tray | null = null

function createTray(): void {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Peernotes')

  const menu = Menu.buildFromTemplate([
    {
      label: 'New Note',
      accelerator: 'Ctrl+Cmd+Alt+Space',
      click: toggleQuickEntry
    },
    {
      label: 'Open Dashboard',
      click: () => {
        const win = getMainWindow()
        if (win) {
          win.show()
          win.focus()
        } else {
          createMainWindow()
        }
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => {
    const win = getMainWindow()
    if (win) {
      win.isVisible() ? win.focus() : win.show()
    } else {
      createMainWindow()
    }
  })
}

app.whenReady().then(() => {
  registerPeopleHandlers()
  registerNotesHandlers()
  registerExportHandlers()
  registerImportHandlers()
  registerSettingsHandlers()

  createMainWindow()
  createTray()

  globalShortcut.register('Ctrl+Cmd+Alt+Space', toggleQuickEntry)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  closeDb()
})
