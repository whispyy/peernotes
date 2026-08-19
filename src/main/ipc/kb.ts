import { ipcMain, shell } from 'electron'
import { notifyKbUpdated } from '../windows'
import { getActiveWorkspaceId } from './workspaces'
import { askKb } from '../kb/ask'
import { fileNoteWithAi, fileUnfiledNotes, unfiledNoteIds } from '../kb/classify'
import {
  isStale,
  listDocs,
  pendingNoteIds,
  pruneDanglingIds,
  readDoc,
  unfileNote,
  withKbLock,
  writeIndex,
} from '../kb/doc'
import { autoRegenerate, regenerateDoc, regenerateStaleDocs } from '../kb/generate'
import { rebuildKb } from '../kb/rebuild'
import { getLiveNote, liveNoteIds } from '../kb/notes'
import { isKbAiReady, readKbAiConfig } from '../kb/openrouter'
import { ensureKbDir } from '../kb/paths'
import type {
  KbAskResult,
  KbDocContent,
  KbFileResult,
  KbRebuildResult,
  KbRegenerateResult,
  KbStatus,
} from '@shared/types'

// Filing runs off note saves, so it is serialized to keep a burst of notes from
// firing a burst of concurrent OpenRouter calls.
let filingChain: Promise<unknown> = Promise.resolve()

function enqueue(task: () => Promise<void>): void {
  filingChain = filingChain.then(task, task).catch(() => undefined)
}

/**
 * Fire-and-forget from the notes IPC handlers: a failure here must never turn a
 * successful note save into an error. Unfiled notes are retried by the backfill.
 */
export function scheduleNoteFiling(noteId: string): void {
  const config = readKbAiConfig()
  if (!config.autoFile || !isKbAiReady(config)) return

  const note = getLiveNote(noteId)
  if (!note) return
  const { workspaceId } = note

  enqueue(async () => {
    try {
      const slugs = await fileNoteWithAi(noteId)
      if (slugs.length === 0) return
      notifyKbUpdated()
      const regenerated = await autoRegenerate(workspaceId, slugs)
      if (regenerated.length > 0) notifyKbUpdated()
    } catch {
      // stays unfiled; picked up by the next backfill or "Sort unfiled notes"
    }
  })
}

/** An edited note is re-filed from scratch — its topics may have changed. */
export function scheduleNoteRefiling(noteId: string): void {
  const note = getLiveNote(noteId)
  if (!note) return
  const { workspaceId } = note

  enqueue(async () => {
    try {
      await withKbLock(() => {
        unfileNote(workspaceId, noteId)
        writeIndex(workspaceId)
      })
      notifyKbUpdated()
    } catch {
      return
    }
  })
  scheduleNoteFiling(noteId)
}

/**
 * Called on delete, where the note row is already gone — the workspace has to be
 * passed in. Dropping the id leaves the doc stale so a regeneration removes the
 * now-dead citation from the body.
 */
export function scheduleNoteUnfiling(workspaceId: string, noteId: string): void {
  enqueue(async () => {
    const touched = await withKbLock(() => {
      const slugs = unfileNote(workspaceId, noteId)
      if (slugs.length > 0) writeIndex(workspaceId)
      return slugs
    })
    if (touched.length > 0) notifyKbUpdated()
  })
}

/**
 * Startup catch-up for notes saved while offline or before AI was configured.
 * Bounded: one launch must never turn a backlog into a burst of API calls. The
 * remainder stays visible as "unfiled" for the explicit Sort button.
 */
const STARTUP_BACKFILL_LIMIT = 25

export function backfillKb(): void {
  const workspaceId = getActiveWorkspaceId()
  if (!workspaceId) return
  const config = readKbAiConfig()
  if (!config.autoFile || !isKbAiReady(config)) return

  enqueue(async () => {
    try {
      const { slugs } = await fileUnfiledNotes(workspaceId, STARTUP_BACKFILL_LIMIT)
      if (slugs.length === 0) return
      notifyKbUpdated()
      await autoRegenerate(workspaceId, slugs)
      notifyKbUpdated()
    } catch {
      return
    }
  })
}

async function buildStatus(workspaceId: string): Promise<KbStatus> {
  // Cheap sweep: drop ids whose notes were deleted or whose person was archived,
  // which also marks those docs stale so a regeneration removes the citations.
  await withKbLock(() => {
    const touched = pruneDanglingIds(workspaceId, liveNoteIds(workspaceId))
    if (touched.length > 0) writeIndex(workspaceId)
  })

  const docs = listDocs(workspaceId)
  return {
    noteCount: liveNoteIds(workspaceId).size,
    topics: docs.map((doc) => ({
      slug: doc.slug,
      topic: doc.topic,
      noteCount: doc.noteIds.length,
      pendingCount: pendingNoteIds(doc).length,
      generatedAt: doc.generatedAt,
      stale: isStale(doc),
    })),
    unfiledCount: unfiledNoteIds(workspaceId).length,
    staleCount: docs.filter(isStale).length,
    folder: ensureKbDir(workspaceId),
  }
}

export function registerKbHandlers(): void {
  ipcMain.handle('kb:status', (_e, workspaceId: string): Promise<KbStatus> => buildStatus(workspaceId))

  ipcMain.handle('kb:read', (_e, workspaceId: string, slug: string): KbDocContent | null => {
    const doc = readDoc(workspaceId, slug)
    if (!doc) return null
    return {
      slug: doc.slug,
      topic: doc.topic,
      body: doc.body,
      noteIds: doc.noteIds,
      generatedAt: doc.generatedAt,
      stale: isStale(doc),
      pendingCount: pendingNoteIds(doc).length,
    }
  })

  ipcMain.handle('kb:file-unfiled', async (_e, workspaceId: string): Promise<KbFileResult> => {
    const config = readKbAiConfig()
    if (!isKbAiReady(config)) {
      throw new Error('AI is not configured — set a key and model in Settings → AI Summaries.')
    }
    const { filed, failed, slugs } = await fileUnfiledNotes(workspaceId)
    if (slugs.length > 0) {
      notifyKbUpdated()
      await autoRegenerate(workspaceId, slugs)
    }
    notifyKbUpdated()
    return { filed, failed }
  })

  ipcMain.handle('kb:regenerate', async (_e, workspaceId: string, slug: string): Promise<void> => {
    await regenerateDoc(workspaceId, slug)
    notifyKbUpdated()
  })

  ipcMain.handle('kb:regenerate-stale', async (_e, workspaceId: string): Promise<KbRegenerateResult> => {
    const { regenerated, failed } = await regenerateStaleDocs(workspaceId)
    notifyKbUpdated()
    return { regenerated: regenerated.length, failed }
  })

  ipcMain.handle('kb:rebuild', async (_e, workspaceId: string): Promise<KbRebuildResult> => {
    const result = await rebuildKb(workspaceId, notifyKbUpdated)
    notifyKbUpdated()
    return result
  })

  ipcMain.handle('kb:ask', (_e, workspaceId: string, question: string): Promise<KbAskResult> =>
    askKb(workspaceId, question)
  )

  ipcMain.handle('kb:open-folder', async (_e, workspaceId: string): Promise<void> => {
    await shell.openPath(ensureKbDir(workspaceId))
  })
}
