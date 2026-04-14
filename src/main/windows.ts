import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let quickEntryWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#1C1C1E',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (is.dev) mainWindow?.webContents.openDevTools({ mode: 'detach' })
  })
  mainWindow.on('closed', () => { mainWindow = null })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/app/index.html')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/app/index.html'))
  }

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createQuickEntryWindow(): BrowserWindow {
  if (quickEntryWindow) {
    quickEntryWindow.focus()
    return quickEntryWindow
  }

  const { x, y, width } = screen.getPrimaryDisplay().workArea
  const winWidth = 460
  const winHeight = 320
  const cx = x + Math.round((width - winWidth) / 2)
  const cy = y + 140

  quickEntryWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: cx,
    y: cy,
    resizable: false,
    frame: false,
    transparent: true,
    roundedCorners: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  quickEntryWindow.on('blur', () => {
    const win = quickEntryWindow
    setTimeout(() => { if (win && !win.isDestroyed()) win.hide() }, 150)
  })
  quickEntryWindow.on('closed', () => { quickEntryWindow = null })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    quickEntryWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/quick-entry/index.html')
  } else {
    quickEntryWindow.loadFile(join(__dirname, '../renderer/quick-entry/index.html'))
  }

  quickEntryWindow.once('ready-to-show', () => quickEntryWindow?.show())

  return quickEntryWindow
}

export function notifyMainWindow(): void {
  mainWindow?.webContents.send('notes:updated')
}

export function toggleQuickEntry(): void {
  if (!quickEntryWindow || quickEntryWindow.isDestroyed()) {
    createQuickEntryWindow()
    return
  }
  if (quickEntryWindow.isVisible()) {
    quickEntryWindow.hide()
  } else {
    quickEntryWindow.show()
    quickEntryWindow.focus()
  }
}
