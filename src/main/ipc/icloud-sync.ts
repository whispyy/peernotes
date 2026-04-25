import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { getDb } from '../store/db'
import { getActiveWorkspaceId } from './workspaces'
import { notifyMainWindow, notifySyncUpdated } from '../windows'
import { buildExport } from './export'
import { performImport } from './import'
import type { ICloudSyncSettings, ImportPayload } from '@shared/types'

const ICLOUD_BASE = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Peernotes',
)

let autoSyncTimer: ReturnType<typeof setInterval> | null = null
let watcher: fs.FSWatcher | null = null

// ── DB helpers ────────────────────────────────────────────────────────────────

function readSettings(): ICloudSyncSettings {
  const row = getDb()
    .prepare('SELECT icloud_enabled, icloud_last_synced_at, icloud_last_sync_error FROM sync_settings WHERE id = 1')
    .get() as Record<string, unknown> | undefined
  return {
    icloudEnabled: Boolean(row?.icloud_enabled),
    lastSyncedAt: (row?.icloud_last_synced_at as number) ?? null,
    lastSyncError: (row?.icloud_last_sync_error as string) ?? null,
  }
}

function markSyncSuccess(): void {
  getDb()
    .prepare('UPDATE sync_settings SET icloud_last_synced_at = ?, icloud_last_sync_error = NULL WHERE id = 1')
    .run(Date.now())
}

function markSyncError(msg: string): void {
  getDb()
    .prepare('UPDATE sync_settings SET icloud_last_sync_error = ? WHERE id = 1')
    .run(msg)
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function getWorkspaceName(workspaceId: string): string {
  const row = getDb()
    .prepare('SELECT name FROM workspaces WHERE id = ?')
    .get(workspaceId) as { name: string } | undefined
  return row?.name ?? 'default'
}

function workspaceFilePath(workspaceId: string): string {
  const name = getWorkspaceName(workspaceId)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default'
  return path.join(ICLOUD_BASE, `${slug}.json`)
}

// ── Core push / pull ──────────────────────────────────────────────────────────

export function doICloudPush(workspaceId: string): { total: number } {
  fs.mkdirSync(ICLOUD_BASE, { recursive: true })
  const exportData = buildExport(workspaceId)
  fs.writeFileSync(workspaceFilePath(workspaceId), JSON.stringify(exportData, null, 2), 'utf-8')
  return { total: exportData.total }
}

export function doICloudPull(workspaceId: string): { imported: number; skipped: number } {
  const filePath = workspaceFilePath(workspaceId)
  if (!fs.existsSync(filePath)) {
    throw new Error('No iCloud backup found — push from this device first or wait for iCloud to sync')
  }
  let payload: ImportPayload
  try {
    payload = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ImportPayload
  } catch {
    throw new Error('iCloud backup file is corrupted or not a valid Peernotes export')
  }
  const result = performImport(payload, workspaceId)
  if (result.imported > 0) notifyMainWindow()
  return { imported: result.imported, skipped: result.skipped }
}

// ── Auto-sync ─────────────────────────────────────────────────────────────────

function stopAutoSync(): void {
  if (autoSyncTimer !== null) { clearInterval(autoSyncTimer); autoSyncTimer = null }
  if (watcher !== null) { watcher.close(); watcher = null }
}

function startAutoSync(): void {
  stopAutoSync()
  if (!readSettings().icloudEnabled) return

  // Push every 15 minutes
  autoSyncTimer = setInterval(() => {
    const workspaceId = getActiveWorkspaceId()
    if (!workspaceId) return
    try { doICloudPush(workspaceId); markSyncSuccess() }
    catch (e) { markSyncError(e instanceof Error ? e.message : String(e)) }
    notifySyncUpdated()
  }, 15 * 60 * 1000)

  // Watch the iCloud folder for incoming changes from other devices
  try {
    fs.mkdirSync(ICLOUD_BASE, { recursive: true })
    let debounce: ReturnType<typeof setTimeout> | null = null
    watcher = fs.watch(ICLOUD_BASE, (_event, filename) => {
      if (!filename?.endsWith('.json')) return
      if (debounce) clearTimeout(debounce)
      // 3s debounce — give iCloud time to finish writing the file
      debounce = setTimeout(() => {
        const workspaceId = getActiveWorkspaceId()
        if (!workspaceId) return
        if (filename !== path.basename(workspaceFilePath(workspaceId))) return
        try { doICloudPull(workspaceId); markSyncSuccess() } catch { /* file may still be downloading */ }
        notifySyncUpdated()
      }, 3000)
    })
  } catch {
    // iCloud Drive not available on this machine
  }
}

export function cleanupICloudSync(): void {
  stopAutoSync()
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

export function registerICloudSyncHandlers(): void {
  startAutoSync()

  ipcMain.handle('icloud:settings:get', (): ICloudSyncSettings => readSettings())

  ipcMain.handle('icloud:settings:set', (_e, patch: Partial<ICloudSyncSettings>): void => {
    if ('icloudEnabled' in patch) {
      getDb()
        .prepare('UPDATE sync_settings SET icloud_enabled = ? WHERE id = 1')
        .run(patch.icloudEnabled ? 1 : 0)
      startAutoSync()
    }
    notifySyncUpdated()
  })

  ipcMain.handle('icloud:push', (_e, workspaceId: string): { total: number } => {
    try {
      const result = doICloudPush(workspaceId)
      markSyncSuccess()
      notifySyncUpdated()
      return result
    } catch (err) {
      markSyncError(err instanceof Error ? err.message : String(err))
      throw err
    }
  })

  ipcMain.handle('icloud:pull', (_e, workspaceId: string): { imported: number; skipped: number } => {
    try {
      const result = doICloudPull(workspaceId)
      markSyncSuccess()
      notifySyncUpdated()
      return result
    } catch (err) {
      markSyncError(err instanceof Error ? err.message : String(err))
      throw err
    }
  })
}
