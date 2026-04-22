import { ipcMain, safeStorage } from 'electron'
import * as https from 'https'
import { getDb } from '../store/db'
import { getActiveWorkspaceId } from './workspaces'
import { notifyMainWindow, notifySyncUpdated } from '../windows'
import { buildExport } from './export'
import { performImport } from './import'
import type { SyncSettings, SyncDirection, ImportPayload } from '@shared/types'

let autoSyncTimer: ReturnType<typeof setInterval> | null = null

// ── Token encryption (safeStorage) ───────────────────────────────────────────

function encryptToken(token: string): string {
  if (!safeStorage.isEncryptionAvailable()) return token
  return safeStorage.encryptString(token).toString('base64')
}

function decryptToken(stored: string | null): string | null {
  if (!stored) return null
  if (!safeStorage.isEncryptionAvailable()) return stored
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch {
    return null
  }
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function getWorkspaceName(workspaceId: string): string {
  const row = getDb()
    .prepare('SELECT name FROM workspaces WHERE id = ?')
    .get(workspaceId) as { name: string } | undefined
  return row?.name ?? 'default'
}

function effectivePath(baseDir: string, workspaceName: string): string {
  const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default'
  return `${baseDir.replace(/\/+$/, '')}/${slug}.json`
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function readSettings(): SyncSettings {
  const row = getDb()
    .prepare('SELECT * FROM sync_settings WHERE id = 1')
    .get() as Record<string, unknown> | undefined
  const githubToken = decryptToken((row?.github_token as string) ?? null)
  return {
    githubToken,
    githubTokenSet: !!githubToken,
    repo: (row?.repo as string) ?? null,
    branch: (row?.branch as string) ?? 'main',
    filePath: (row?.file_path as string) ?? 'peernotes',
    lastSyncedAt: (row?.last_synced_at as number) ?? null,
    lastSyncError: (row?.last_sync_error as string) ?? null,
    autoSyncEnabled: Boolean(row?.auto_sync_enabled),
    autoSyncIntervalMinutes: (row?.auto_sync_interval_minutes as number) ?? 15,
    autoSyncDirection: ((row?.auto_sync_direction as SyncDirection) ?? 'both'),
  }
}

function markSyncSuccess(): void {
  getDb()
    .prepare('UPDATE sync_settings SET last_synced_at = ?, last_sync_error = NULL WHERE id = 1')
    .run(Date.now())
}

function markSyncError(msg: string): void {
  getDb()
    .prepare('UPDATE sync_settings SET last_sync_error = ? WHERE id = 1')
    .run(msg)
}

function markPartialSync(msg: string): void {
  getDb()
    .prepare('UPDATE sync_settings SET last_synced_at = ?, last_sync_error = ? WHERE id = 1')
    .run(Date.now(), msg)
}

// ── GitHub API ────────────────────────────────────────────────────────────────

function httpsRequest(
  options: https.RequestOptions,
  body?: string,
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, data }))
    })
    req.setTimeout(15_000, () => { req.destroy(new Error('GitHub API request timed out')) })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function encodePath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/')
}

function parseGhError(data: string, status: number): string {
  try {
    return (JSON.parse(data) as { message: string }).message ?? `GitHub API error ${status}`
  } catch {
    return `GitHub API error ${status}`
  }
}

class GitHubConflictError extends Error {}

function validateRepo(repo: string): void {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error('Invalid repository format — expected owner/repo (e.g. alice/my-notes)')
  }
}

async function ghGet(
  token: string,
  repo: string,
  branch: string,
  filePath: string,
): Promise<{ sha: string; content: string } | null> {
  validateRepo(repo)
  const { status, data } = await httpsRequest({
    hostname: 'api.github.com',
    path: `/repos/${encodePath(repo)}/contents/${encodePath(filePath)}?ref=${encodeURIComponent(branch)}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'peernotes-app',
      Accept: 'application/vnd.github+json',
    },
  })
  if (status === 404) return null
  if (status < 200 || status >= 300) throw new Error(parseGhError(data, status))
  const json = JSON.parse(data) as { sha: string; content: string }
  return { sha: json.sha, content: json.content }
}

async function ghPut(
  token: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  sha: string | null,
): Promise<void> {
  const body = JSON.stringify({
    message: `peernotes: backup ${new Date().toISOString()}`,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  })
  const { status, data } = await httpsRequest(
    {
      hostname: 'api.github.com',
      path: `/repos/${encodePath(repo)}/contents/${encodePath(filePath)}`,
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'peernotes-app',
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body,
  )
  if (status === 422) throw new GitHubConflictError(parseGhError(data, status))
  if (status < 200 || status >= 300) throw new Error(parseGhError(data, status))
}

// ── Core push / pull ──────────────────────────────────────────────────────────

async function doPush(
  workspaceId: string,
  s: SyncSettings,
): Promise<{ total: number }> {
  if (!s.githubToken || !s.repo) throw new Error('Sync not configured — set token and repository')
  const path = effectivePath(s.filePath, getWorkspaceName(workspaceId))
  const exportData = buildExport(workspaceId)
  const content = JSON.stringify(exportData, null, 2)
  const existing = await ghGet(s.githubToken, s.repo, s.branch, path)
  try {
    await ghPut(s.githubToken, s.repo, s.branch, path, content, existing?.sha ?? null)
  } catch (err) {
    if (!(err instanceof GitHubConflictError)) throw err
    const fresh = await ghGet(s.githubToken, s.repo, s.branch, path)
    await ghPut(s.githubToken, s.repo, s.branch, path, content, fresh?.sha ?? null)
  }
  return { total: exportData.total }
}

async function doPull(
  workspaceId: string,
  s: SyncSettings,
): Promise<{ imported: number; skipped: number }> {
  if (!s.githubToken || !s.repo) throw new Error('Sync not configured — set token and repository')
  const path = effectivePath(s.filePath, getWorkspaceName(workspaceId))
  const file = await ghGet(s.githubToken, s.repo, s.branch, path)
  if (!file) throw new Error('No backup file found in repository at the configured path')
  if (!file.content) throw new Error('Backup file is too large to fetch via the GitHub API (>1 MB)')
  const raw = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf-8')
  let payload: ImportPayload
  try {
    payload = JSON.parse(raw) as ImportPayload
  } catch {
    throw new Error('Backup file is corrupted or not a valid Peernotes export')
  }
  const result = performImport(payload, workspaceId)
  if (result.imported > 0) notifyMainWindow()
  return { imported: result.imported, skipped: result.skipped }
}

// ── Auto-sync timer ───────────────────────────────────────────────────────────

function stopAutoSync(): void {
  if (autoSyncTimer !== null) {
    clearInterval(autoSyncTimer)
    autoSyncTimer = null
  }
}

function startAutoSync(s: SyncSettings): void {
  stopAutoSync()
  if (!s.autoSyncEnabled) return

  const ms = s.autoSyncIntervalMinutes * 60 * 1000
  autoSyncTimer = setInterval(async () => {
    const current = readSettings()
    const workspaceId = getActiveWorkspaceId()
    if (!workspaceId || !current.githubToken || !current.repo) return

    const toErr = (e: unknown) => e instanceof Error ? e.message : String(e)
    let pushErr: string | null = null
    let pullErr: string | null = null

    if (current.autoSyncDirection !== 'pull') {
      try { await doPush(workspaceId, current) } catch (e) { pushErr = toErr(e) }
    }
    if (current.autoSyncDirection !== 'push') {
      try { await doPull(workspaceId, current) } catch (e) { pullErr = toErr(e) }
    }

    if (!pushErr && !pullErr) {
      markSyncSuccess()
    } else if (pushErr && pullErr) {
      markSyncError(`Push failed: ${pushErr} — Pull failed: ${pullErr}`)
    } else {
      markPartialSync(pushErr
        ? `Partial sync — push failed: ${pushErr}`
        : `Partial sync — pull failed: ${pullErr}`)
    }
    notifySyncUpdated()
  }, ms)
}

export function cleanupSync(): void {
  stopAutoSync()
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

export function registerSyncHandlers(): void {
  startAutoSync(readSettings())

  ipcMain.handle('sync:settings:get', (): SyncSettings => {
    const s = readSettings()
    return { ...s, githubToken: null }
  })

  ipcMain.handle('sync:settings:set', (_e, patch: Partial<SyncSettings>): void => {
    const VALID_DIRECTIONS: SyncDirection[] = ['push', 'pull', 'both']
    const MIN_INTERVAL = 5
    const MAX_INTERVAL = 1440

    if ('autoSyncDirection' in patch && !VALID_DIRECTIONS.includes(patch.autoSyncDirection as SyncDirection)) {
      throw new Error(`Invalid autoSyncDirection: must be one of ${VALID_DIRECTIONS.join(', ')}`)
    }
    if ('autoSyncIntervalMinutes' in patch) {
      const v = patch.autoSyncIntervalMinutes
      if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error('autoSyncIntervalMinutes must be an integer')
      patch = { ...patch, autoSyncIntervalMinutes: Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, v)) }
    }
    if ('branch' in patch && patch.branch !== undefined && !patch.branch?.trim()) {
      patch = { ...patch, branch: 'main' }
    }
    if ('filePath' in patch && patch.filePath !== undefined && !patch.filePath?.trim()) {
      patch = { ...patch, filePath: 'peernotes' }
    }

    const db = getDb()
    const columnMap: Partial<Record<keyof SyncSettings, string>> = {
      githubToken: 'github_token',
      repo: 'repo',
      branch: 'branch',
      filePath: 'file_path',
      autoSyncEnabled: 'auto_sync_enabled',
      autoSyncIntervalMinutes: 'auto_sync_interval_minutes',
      autoSyncDirection: 'auto_sync_direction',
    }
    db.transaction(() => {
      for (const [key, col] of Object.entries(columnMap)) {
        if (key in patch) {
          let val = patch[key as keyof SyncSettings]
          if (key === 'githubToken' && typeof val === 'string') val = encryptToken(val) as typeof val
          db.prepare(`UPDATE sync_settings SET ${col} = ? WHERE id = 1`).run(
            typeof val === 'boolean' ? (val ? 1 : 0) : (val as string | number | null),
          )
        }
      }
    })()
    const timerFields: (keyof SyncSettings)[] = ['autoSyncEnabled', 'autoSyncIntervalMinutes', 'autoSyncDirection']
    if (timerFields.some(f => f in patch)) startAutoSync(readSettings())
    notifySyncUpdated()
  })

  ipcMain.handle('sync:push', async (_e, workspaceId: string): Promise<{ total: number }> => {
    const s = readSettings()
    try {
      const result = await doPush(workspaceId, s)
      markSyncSuccess()
      notifySyncUpdated()
      return result
    } catch (err) {
      markSyncError(err instanceof Error ? err.message : String(err))
      throw err
    }
  })

  ipcMain.handle(
    'sync:pull',
    async (_e, workspaceId: string): Promise<{ imported: number; skipped: number }> => {
      const s = readSettings()
      try {
        const result = await doPull(workspaceId, s)
        markSyncSuccess()
        notifySyncUpdated()
        return result
      } catch (err) {
        markSyncError(err instanceof Error ? err.message : String(err))
        throw err
      }
    },
  )
}
