import { ipcMain, dialog, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { getDb } from '../store/db'
import { notifyMainWindow } from '../windows'
import { MAX_ATTACHMENTS_PER_NOTE } from '@shared/types'
import type { Attachment } from '@shared/types'

// ── MIME / extension maps (single source of truth) ───────────────────────────

const EXT_TO_MIME: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',  // alias — jpeg→jpg when reversing
  png:  'image/png',
  gif:  'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
}

// First occurrence of each MIME type wins (jpeg is skipped, jpg was first)
const MIME_TO_EXT: Record<string, string> = {}
for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
  if (!(mime in MIME_TO_EXT)) MIME_TO_EXT[mime] = ext
}

export const ALLOWED_MIME_TYPES = new Set(Object.values(EXT_TO_MIME))

const MAX_SIZE_BYTES = 5 * 1024 * 1024  // 5 MB

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ── Validation helpers (used by import / icloud-sync) ────────────────────────

export function isValidAttachmentId(id: string): boolean {
  return UUID_RE.test(id)
}

export function isValidMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime)
}

// ── Path helpers ──────────────────────────────────────────────────────────────

let _attachmentDir: string | null = null

export function getAttachmentDir(): string {
  if (_attachmentDir) return _attachmentDir
  const dir = path.join(app.getPath('userData'), 'attachments')
  fs.mkdirSync(dir, { recursive: true })
  _attachmentDir = dir
  return _attachmentDir
}

export function getLocalPath(id: string, mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] ?? 'bin'
  return path.join(getAttachmentDir(), `${id}.${ext}`)
}

// ── Protocol authorization (for attachment:// handler in index.ts) ────────────

const _pickedPaths = new Set<string>()

function addPickedPaths(paths: string[]): void {
  for (const p of paths) _pickedPaths.add(p)
}

function clearPickedPath(p: string): void {
  _pickedPaths.delete(p)
}

export function isAuthorizedAttachmentPath(filePath: string): boolean {
  const dir = getAttachmentDir()
  if (filePath.startsWith(dir + path.sep)) return true
  return _pickedPaths.has(filePath)
}

// ── File cleanup helper (used by notes:remove) ────────────────────────────────

export function deleteAttachmentFiles(
  attachments: Array<{ id: string; mimeType: string }>,
  icloudAttachmentsDir?: string
): void {
  for (const att of attachments) {
    const localPath = getLocalPath(att.id, att.mimeType)
    try { fs.unlinkSync(localPath) } catch { /* already gone */ }
    if (icloudAttachmentsDir) {
      const icloudPath = path.join(icloudAttachmentsDir, path.basename(localPath))
      try { fs.unlinkSync(icloudPath) } catch { /* ok */ }
    }
  }
}

// ── DB query helper ───────────────────────────────────────────────────────────

function queryAttachments(noteId: string): Attachment[] {
  return getDb()
    .prepare(
      `SELECT id, note_id AS noteId, filename, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt
       FROM note_attachments WHERE note_id = ? ORDER BY created_at ASC`
    )
    .all(noteId) as Attachment[]
}

function findAttachmentById(id: string): { id: string; mimeType: string } | undefined {
  return getDb()
    .prepare('SELECT id, mime_type AS mimeType FROM note_attachments WHERE id = ?')
    .get(id) as { id: string; mimeType: string } | undefined
}

function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  return EXT_TO_MIME[ext] ?? 'application/octet-stream'
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

export function registerAttachmentHandlers(): void {
  ipcMain.handle('attachments:list', (_e, noteId: string): Attachment[] => {
    if (!noteId || typeof noteId !== 'string') return []
    return queryAttachments(noteId)
  })

  ipcMain.handle('attachments:pick', async (): Promise<string[] | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: Object.keys(EXT_TO_MIME) }]
    })
    if (canceled || filePaths.length === 0) return null
    addPickedPaths(filePaths)
    return filePaths
  })

  ipcMain.handle('attachments:add', (_e, noteId: string, sourcePath: string): Attachment => {
    if (!noteId || typeof noteId !== 'string') throw new Error('Invalid noteId')
    if (!sourcePath || typeof sourcePath !== 'string') throw new Error('Invalid source path')

    const db = getDb()
    const noteExists = db.prepare('SELECT id FROM notes WHERE id = ?').get(noteId)
    if (!noteExists) throw new Error('Unknown note')

    const existing = queryAttachments(noteId)
    if (existing.length >= MAX_ATTACHMENTS_PER_NOTE) {
      throw new Error(`Maximum ${MAX_ATTACHMENTS_PER_NOTE} images per note`)
    }

    const mimeType = detectMimeType(sourcePath)
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }

    const stat = fs.statSync(sourcePath)
    if (stat.size > MAX_SIZE_BYTES) {
      throw new Error(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024} MB limit (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
    }

    const id = uuid()
    const filename = path.basename(sourcePath)
    const destPath = getLocalPath(id, mimeType)

    fs.copyFileSync(sourcePath, destPath)
    clearPickedPath(sourcePath)

    try {
      db.prepare(
        `INSERT INTO note_attachments (id, note_id, filename, mime_type, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, noteId, filename, mimeType, stat.size, new Date().toISOString())
    } catch (e) {
      try { fs.unlinkSync(destPath) } catch { /* ignore */ }
      throw e
    }

    const att: Attachment = { id, noteId, filename, mimeType, sizeBytes: stat.size, createdAt: new Date().toISOString() }
    notifyMainWindow()
    return att
  })

  ipcMain.handle('attachments:remove', (_e, id: string): void => {
    if (!id || typeof id !== 'string') return
    const row = findAttachmentById(id)
    if (!row) return
    getDb().prepare('DELETE FROM note_attachments WHERE id = ?').run(id)
    deleteAttachmentFiles([row])
    notifyMainWindow()
  })

  ipcMain.handle('attachments:getPath', (_e, id: string): string | null => {
    if (!id || typeof id !== 'string') return null
    const row = findAttachmentById(id)
    if (!row) return null
    return getLocalPath(row.id, row.mimeType)
  })
}
