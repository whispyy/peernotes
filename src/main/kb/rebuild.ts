import { fileUnfiledNotes } from './classify'
import { listDocs, removeDoc, withKbLock, writeIndex } from './doc'
import { regenerateDoc } from './generate'
import { liveNoteIds } from './notes'
import { isKbAiReady, readKbAiConfig } from './openrouter'

export interface KbRebuildOutcome {
  notes: number
  filed: number
  failed: number
  topics: number
  regenerated: number
  regenFailed: Array<{ slug: string; error: string }>
}

/**
 * Discards every document and files all notes again from an empty topic list.
 *
 * This is the only operation that can make the topic set shrink, merge or split:
 * ordinary filing is append-only, so a note keeps its first topic forever and a
 * topic never disappears once created. Costs one AI call per note plus one per
 * resulting topic, which is why it sits behind a confirmation in the UI.
 *
 * If filing gives up early (the three-consecutive-failure guard), the notes it
 * never reached stay unfiled and are recoverable with "Sort unfiled" — but the
 * previous documents are already gone by then, which the confirmation says.
 */
export async function rebuildKb(
  workspaceId: string,
  onProgress?: () => void
): Promise<KbRebuildOutcome> {
  const config = readKbAiConfig()
  if (!isKbAiReady(config)) {
    throw new Error('AI is not configured — set a key and model in Settings → AI Summaries.')
  }

  const notes = liveNoteIds(workspaceId).size
  if (notes === 0) throw new Error('There are no notes to rebuild from.')

  await withKbLock(() => {
    // Only files that parse as our documents are removed, so anything else the
    // folder happens to hold is left alone.
    for (const doc of listDocs(workspaceId)) removeDoc(workspaceId, doc.slug)
    writeIndex(workspaceId)
  })
  onProgress?.()

  const { filed, failed } = await fileUnfiledNotes(workspaceId, undefined, onProgress)

  const docs = listDocs(workspaceId)
  let regenerated = 0
  const regenFailed: Array<{ slug: string; error: string }> = []
  for (const doc of docs) {
    try {
      await regenerateDoc(workspaceId, doc.slug)
      regenerated += 1
    } catch (err) {
      regenFailed.push({ slug: doc.slug, error: err instanceof Error ? err.message : String(err) })
    }
    onProgress?.()
  }

  return { notes, filed, failed, topics: docs.length, regenerated, regenFailed }
}
