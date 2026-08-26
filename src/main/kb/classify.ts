import { isCancelled } from './cancel'
import { fileNote, listDocs, withKbLock, writeIndex } from './doc'
import { getLiveNote, listLiveNotes } from './notes'
import { chat, isKbAiReady, parseJsonObject, readKbAiConfig } from './openrouter'

const MAX_TOPICS_PER_NOTE = 2

const SYSTEM_PROMPT = `You file short observational notes about team members into topics for a knowledge base.

Reply with JSON only, in this exact shape:
{"topics": ["Topic Name"]}

Rules:
- Reuse an existing topic verbatim whenever one plausibly fits. Only invent a topic when none fits.
- At most ${MAX_TOPICS_PER_NOTE} topics per note. Prefer one.
- Topic names are 2-5 words, title case, and name a recurring theme (e.g. "Onboarding Friction", "Deployment Confidence").
- Never use a person's name, a date, or a sentiment as a topic.
- No commentary outside the JSON.`

function buildUserPrompt(existingTopics: string[], note: { person: string; timestamp: string; sentiment: string; note: string }): string {
  const topics = existingTopics.length > 0 ? existingTopics.map((t) => `- ${t}`).join('\n') : '(none yet)'
  return `Existing topics:
${topics}

Note:
person: ${note.person}
date: ${note.timestamp.slice(0, 10)}
sentiment: ${note.sentiment}
text: ${note.note}`
}

function extractTopics(raw: string): string[] {
  const parsed = parseJsonObject(raw)
  const topics = parsed?.topics
  if (!Array.isArray(topics)) return []
  return topics
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim())
    .slice(0, MAX_TOPICS_PER_NOTE)
}

/**
 * Files one note into topics. Resolves to the slugs it touched, or an empty
 * array when AI is unavailable or the model answered with junk — a note that
 * fails to file simply stays unfiled and is retried by the backfill pass.
 */
export async function fileNoteWithAi(noteId: string): Promise<string[]> {
  const config = readKbAiConfig()
  if (!isKbAiReady(config)) return []

  const note = getLiveNote(noteId)
  if (!note) return []

  const existingTopics = listDocs(note.workspaceId).map((doc) => doc.topic)
  const raw = await chat({
    config,
    model: config.classifierModel,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(existingTopics, note),
    timeoutMs: 45_000,
  })

  const topics = extractTopics(raw)
  if (topics.length === 0) return []

  return withKbLock(() => {
    const touched = topics.map((topic) => fileNote(note.workspaceId, topic, noteId).slug)
    writeIndex(note.workspaceId)
    return [...new Set(touched)]
  })
}

/** Notes that no topic doc claims yet. */
export function unfiledNoteIds(workspaceId: string): string[] {
  const filed = new Set(listDocs(workspaceId).flatMap((doc) => doc.noteIds))
  return listLiveNotes(workspaceId)
    .filter((note) => !filed.has(note.id))
    .map((note) => note.id)
}

/**
 * Retry path for notes added while offline, before AI was configured, or after
 * a failed classification. Stops after three consecutive failures rather than
 * hammering a rate-limited or misconfigured endpoint, and between any two notes
 * if the user asked to stop.
 */
export async function fileUnfiledNotes(
  workspaceId: string,
  limit?: number,
  onProgress?: (done: number, total: number) => void
): Promise<{ filed: number; failed: number; slugs: string[]; cancelled: boolean }> {
  const config = readKbAiConfig()
  if (!isKbAiReady(config)) return { filed: 0, failed: 0, slugs: [], cancelled: false }

  const all = unfiledNoteIds(workspaceId)
  const pending = limit === undefined ? all : all.slice(0, limit)
  if (pending.length < all.length) {
    console.log(`[kb] Filing ${pending.length} of ${all.length} unfiled notes — the rest wait for "Sort unfiled"`)
  }
  const slugs = new Set<string>()
  let filed = 0
  let failed = 0
  let consecutiveFailures = 0
  let cancelled = false

  for (const noteId of pending) {
    if (isCancelled()) {
      cancelled = true
      break
    }
    try {
      const touched = await fileNoteWithAi(noteId)
      if (touched.length > 0) {
        filed += 1
        touched.forEach((slug) => slugs.add(slug))
        consecutiveFailures = 0
      } else {
        failed += 1
        consecutiveFailures += 1
      }
    } catch {
      failed += 1
      consecutiveFailures += 1
    }
    onProgress?.(filed + failed, pending.length)
    if (consecutiveFailures >= 3) break
  }

  return { filed, failed, slugs: [...slugs], cancelled }
}
