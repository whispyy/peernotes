import { isCancelled, resetCancel } from './cancel'
import { fileUnfiledNotes } from './classify'
import { listDocs, removeDoc, withKbLock, writeIndex } from './doc'
import { regenerateDoc } from './generate'
import { liveNoteIds } from './notes'
import { isKbAiReady, readKbAiConfig } from './openrouter'
import type { KbProgress, KbRebuildResult } from '@shared/types'

interface RebuildHooks {
  /** the doc list changed on disk — refresh the view */
  onUpdated?: () => void
  /** how far along the run is, for the progress line */
  onProgress?: (progress: KbProgress) => void
}

/**
 * Discards every document and files all notes again from an empty topic list.
 *
 * This is the only operation that can make the topic set shrink, merge or split:
 * ordinary filing is append-only, so a note keeps its first topic forever and a
 * topic never disappears once created. Costs one AI call per note plus one per
 * resulting topic, which is why it sits behind a confirmation in the UI.
 *
 * If filing gives up early (the three-consecutive-failure guard) or the user
 * stops it, the notes it never reached stay unfiled and are recoverable with
 * "Sort unfiled" — but the previous documents are already gone by then, which
 * the confirmation says.
 */
export async function rebuildKb(
  workspaceId: string,
  { onUpdated, onProgress }: RebuildHooks = {}
): Promise<KbRebuildResult> {
  const config = readKbAiConfig()
  if (!isKbAiReady(config)) {
    throw new Error('AI is not configured — set a key and model in Settings → AI.')
  }

  const notes = liveNoteIds(workspaceId).size
  if (notes === 0) throw new Error('There are no notes to rebuild from.')

  resetCancel()

  await withKbLock(() => {
    // Only files that parse as our documents are removed, so anything else the
    // folder happens to hold is left alone.
    for (const doc of listDocs(workspaceId)) removeDoc(workspaceId, doc.slug)
    writeIndex(workspaceId)
  })
  onUpdated?.()

  const filing = await fileUnfiledNotes(workspaceId, undefined, (done, total) => {
    onProgress?.({ phase: 'filing', done, total })
    if (done % 5 === 0) onUpdated?.()
  })

  const docs = listDocs(workspaceId)
  let regenerated = 0
  const regenFailed: Array<{ slug: string; error: string }> = []
  let cancelled = filing.cancelled

  for (const [index, doc] of docs.entries()) {
    if (isCancelled()) {
      cancelled = true
      break
    }
    try {
      await regenerateDoc(workspaceId, doc.slug)
      regenerated += 1
    } catch (err) {
      regenFailed.push({ slug: doc.slug, error: err instanceof Error ? err.message : String(err) })
    }
    onProgress?.({ phase: 'writing', done: index + 1, total: docs.length })
    onUpdated?.()
  }

  return { notes, filed: filing.filed, failed: filing.failed, topics: docs.length, regenerated, regenFailed, cancelled }
}
