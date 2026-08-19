import { isStale, listDocs, pendingNoteIds, readDoc, withKbLock, writeDoc, writeIndex } from './doc'
import { formatNoteForPrompt, getLiveNotesByIds } from './notes'
import { chat, isKbAiReady, readKbAiConfig } from './openrouter'

const SYSTEM_PROMPT = `You write one knowledge-base article about a single topic, from raw observational notes a manager took about team members.

Output GitHub-flavored markdown only — no preamble, no code fences, no top-level heading (the title is added for you).

Structure:
- One or two sentences summarizing what this topic is about.
- "## What we know" — bullets grouped by sub-theme, most significant first.
- "## Open questions" — only if the notes genuinely leave something unresolved.

Every factual claim must cite the notes it came from, inline, as [Person · Mon D](peernotes://note/<id>) using the exact ids provided. Never invent a fact or an id. Where several notes say the same thing, cite them together and say so. Stay under 400 words.`

function buildUserPrompt(topic: string, notesText: string): string {
  return `Topic: ${topic}

Notes:
${notesText}`
}

function assembleBody(topic: string, content: string): string {
  const cleaned = content
    .replace(/```(?:markdown)?/gi, '')
    .trim()
    .replace(/^#\s+.*\n+/, '')
  return `# ${topic}\n\n${cleaned}\n`
}

/**
 * Full rewrite: the body is pure AI output, so hand-edits are not preserved
 * (the KB view says so). Returns false when there was nothing to generate.
 */
export async function regenerateDoc(workspaceId: string, slug: string): Promise<boolean> {
  const config = readKbAiConfig()
  if (!isKbAiReady(config)) throw new Error('AI is not configured — set a key and model in Settings → AI Summaries.')

  const doc = readDoc(workspaceId, slug)
  if (!doc) throw new Error('Topic not found')

  const notes = getLiveNotesByIds(workspaceId, doc.noteIds)
  if (notes.length === 0) {
    await withKbLock(() => {
      const current = readDoc(workspaceId, slug)
      if (!current) return
      writeDoc(workspaceId, {
        ...current,
        body: `# ${current.topic}\n\n_No notes are filed under this topic any more._\n`,
        generatedAt: new Date().toISOString(),
        generatedNoteIds: [],
      })
      writeIndex(workspaceId)
    })
    return false
  }

  const content = await chat({
    config,
    model: config.model,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(doc.topic, notes.map(formatNoteForPrompt).join('\n')),
  })

  const generatedIds = notes.map((n) => n.id)
  await withKbLock(() => {
    // Re-read: a note may have been filed here while the model was answering,
    // so staleness must be computed against what we actually summarized.
    const current = readDoc(workspaceId, slug) ?? doc
    writeDoc(workspaceId, {
      ...current,
      body: assembleBody(current.topic, content),
      generatedAt: new Date().toISOString(),
      generatedNoteIds: generatedIds.filter((id) => current.noteIds.includes(id)),
    })
    writeIndex(workspaceId)
  })
  return true
}

export async function regenerateStaleDocs(
  workspaceId: string
): Promise<{ regenerated: string[]; failed: Array<{ slug: string; error: string }> }> {
  const regenerated: string[] = []
  const failed: Array<{ slug: string; error: string }> = []

  for (const doc of listDocs(workspaceId).filter(isStale)) {
    try {
      await regenerateDoc(workspaceId, doc.slug)
      regenerated.push(doc.slug)
    } catch (err) {
      failed.push({ slug: doc.slug, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { regenerated, failed }
}

/**
 * Called after filing: a doc rewrites itself once enough notes have piled up
 * that its body is meaningfully out of date. Silent on failure — the doc simply
 * stays stale and the user can regenerate by hand.
 */
export async function autoRegenerate(workspaceId: string, slugs: string[]): Promise<string[]> {
  const { regenThreshold } = readKbAiConfig()
  if (regenThreshold <= 0) return []

  const done: string[] = []
  for (const slug of slugs) {
    const doc = readDoc(workspaceId, slug)
    if (!doc) continue
    // A brand-new topic is generated on its first note, otherwise it would sit
    // in the sidebar with an empty body until the threshold is reached.
    const isFirstGeneration = doc.generatedAt === null
    if (!isFirstGeneration && pendingNoteIds(doc).length < regenThreshold) continue
    try {
      await regenerateDoc(workspaceId, slug)
      done.push(slug)
    } catch {
      // leave it stale
    }
  }
  return done
}
