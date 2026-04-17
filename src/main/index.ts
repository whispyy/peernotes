import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { createMainWindow, createQuickEntryWindow, toggleQuickEntry, getMainWindow } from './windows'
import { registerPeopleHandlers } from './ipc/people'
import { registerNotesHandlers } from './ipc/notes'
import { registerExportHandlers } from './ipc/export'
import { registerImportHandlers } from './ipc/import'
import { registerSettingsHandlers } from './ipc/settings'
import { closeDb } from './store/db'
import { checkForUpdates } from './updater'

let tray: Tray | null = null

function createTray(): void {
  const resourcesPath = app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources')
  const icon = nativeImage.createFromPath(join(resourcesPath, 'tray-iconTemplate.png'))
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
    { label: 'Check for Updates…', click: () => checkForUpdates(false) },
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
  if (!app.isPackaged && process.platform === 'darwin') {
    app.dock.setIcon(join(__dirname, '../../resources/icon.png'))
  }

  registerPeopleHandlers()
  registerNotesHandlers()
  registerExportHandlers()
  registerImportHandlers()
  registerSettingsHandlers()

  createMainWindow()
  createTray()

  globalShortcut.register('Ctrl+Cmd+Alt+Space', toggleQuickEntry)

  // Silent update check at startup — will only prompt if a newer version exists
  setTimeout(() => checkForUpdates(true), 3000)

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
