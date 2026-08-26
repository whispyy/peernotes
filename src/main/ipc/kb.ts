import { ipcMain, shell } from 'electron'
import { notifyKbProgress, notifyKbUpdated } from '../windows'
import { getActiveWorkspaceId } from './workspaces'
import { askKb } from '../kb/ask'
import { requestCancel, resetCancel } from '../kb/cancel'
import { fileNoteWithAi, fileUnfiledNotes, unfiledNoteIds } from '../kb/classify'
import {
  isStale,
  listDocs,
  markNotesPending,
  pendingNoteIds,
  pruneDanglingIds,
  readDoc,
  unfileNote,
  withKbLock,
  writeIndex,
} from '../kb/doc'
import { autoRegenerate, regenerateDoc, regenerateStaleDocs } from '../kb/generate'
import { rebuildKb } from '../kb/rebuild'
import { getLiveNote, liveNoteIds, noteIdsForPerson } from '../kb/notes'
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
// firing a burst of concurrent OpenRouter calls. The explicit Sort / Rebuild /
// Rewrite runs join the same queue, so a note saved mid-rebuild is filed after
// it finishes rather than into a topic set that is being torn down.
let filingChain: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = filingChain.then(task, task)
  filingChain = run.catch(() => undefined)
  return run
}

/** Queue work nothing is waiting on — a rejection here must not go unhandled. */
function enqueueDetached(task: () => Promise<void>): void {
  void enqueue(task).catch(() => undefined)
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

  enqueueDetached(async () => {
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

  enqueueDetached(async () => {
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
 * For changes that leave the topic right but the prose wrong — a note moved to
 * another person, its sentiment flipped, or a person renamed. Re-classifying
 * would be a wasted call, so the citing docs are only marked for a rewrite.
 */
export function scheduleCitationRefresh(workspaceId: string, noteIds: string[]): void {
  if (noteIds.length === 0) return

  enqueueDetached(async () => {
    const touched = await withKbLock(() => {
      const slugs = markNotesPending(workspaceId, noteIds)
      if (slugs.length > 0) writeIndex(workspaceId)
      return slugs
    })
    if (touched.length === 0) return
    notifyKbUpdated()
    const regenerated = await autoRegenerate(workspaceId, touched)
    if (regenerated.length > 0) notifyKbUpdated()
  })
}

/** A rename puts the wrong name in every doc that cites one of their notes. */
export function schedulePersonCitationRefresh(workspaceId: string, personId: string): void {
  scheduleCitationRefresh(workspaceId, noteIdsForPerson(personId))
}

/**
 * Called on delete, where the note row is already gone — the workspace has to be
 * passed in. Dropping the id leaves the doc stale so a regeneration removes the
 * now-dead citation from the body.
 */
export function scheduleNoteUnfiling(workspaceId: string, noteId: string): void {
  enqueueDetached(async () => {
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

  enqueueDetached(async () => {
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

  ipcMain.handle('kb:file-unfiled', (_e, workspaceId: string): Promise<KbFileResult> =>
    enqueue(async () => {
      const config = readKbAiConfig()
      if (!isKbAiReady(config)) {
        throw new Error('AI is not configured — set a key and model in Settings → AI.')
      }
      try {
        resetCancel()
        const { filed, failed, slugs, cancelled } = await fileUnfiledNotes(workspaceId, undefined, (done, total) => {
          notifyKbProgress({ phase: 'filing', done, total })
        })
        if (slugs.length > 0) {
          notifyKbUpdated()
          await autoRegenerate(workspaceId, slugs)
        }
        notifyKbUpdated()
        return { filed, failed, cancelled }
      } finally {
        // A stop applies to the run it was aimed at. Left set, it would quietly
        // suppress the background regeneration that follows later note saves.
        resetCancel()
      }
    })
  )

  ipcMain.handle('kb:regenerate', (_e, workspaceId: string, slug: string): Promise<void> =>
    enqueue(async () => {
      await regenerateDoc(workspaceId, slug)
      notifyKbUpdated()
    })
  )

  ipcMain.handle('kb:regenerate-stale', (_e, workspaceId: string): Promise<KbRegenerateResult> =>
    enqueue(async () => {
      try {
        resetCancel()
        const { regenerated, failed, cancelled } = await regenerateStaleDocs(workspaceId, (done, total) => {
          notifyKbProgress({ phase: 'writing', done, total })
          notifyKbUpdated()
        })
        notifyKbUpdated()
        return { regenerated: regenerated.length, failed, cancelled }
      } finally {
        resetCancel()
      }
    })
  )

  ipcMain.handle('kb:rebuild', (_e, workspaceId: string): Promise<KbRebuildResult> =>
    enqueue(async () => {
      try {
        const result = await rebuildKb(workspaceId, { onUpdated: notifyKbUpdated, onProgress: notifyKbProgress })
        notifyKbUpdated()
        return result
      } finally {
        resetCancel()
      }
    })
  )

  // Deliberately outside the filing queue: a stop must land while the run it is
  // stopping still holds the queue.
  ipcMain.handle('kb:cancel', (): void => requestCancel())

  ipcMain.handle('kb:ask', (_e, workspaceId: string, question: string): Promise<KbAskResult> =>
    askKb(workspaceId, question)
  )

  ipcMain.handle('kb:open-folder', async (_e, workspaceId: string): Promise<void> => {
    await shell.openPath(ensureKbDir(workspaceId))
  })
}
