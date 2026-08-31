import { listDocs, readIndex } from './doc'
import type { KbDoc } from './doc'
import { chat, isKbAiReady, readKbAiConfig } from './openrouter'
import type { KbAskResult, KbAskTurn } from '@shared/types'

const MAX_DOCS = 5
const MAX_DOC_CHARS = 6_000
/** Pinned sources plus a fresh pick, so a follow-up can also reach a new topic. */
const MAX_CONVERSATION_DOCS = 7
/** Older turns are dropped rather than growing the prompt without bound. */
const MAX_HISTORY_TURNS = 6

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'with', 'that', 'this', 'from', 'have', 'has', 'had',
  'what', 'who', 'why', 'how', 'when', 'where', 'which', 'about', 'does', 'did', 'was', 'were', 'been',
  'their', 'they', 'them', 'our', 'any', 'all', 'can', 'could', 'should', 'would', 'into', 'over', 'more',
])

const SYSTEM_PROMPT = `You answer questions about a team using only the knowledge-base documents provided.

Rules:
- Answer strictly from the documents. If they do not contain the answer, say so plainly and name what is missing.
- Be direct: lead with the answer in one or two sentences, then supporting detail as bullets.
- Cite with the [Person · Mon D](peernotes://note/<id>) links exactly as they appear in the documents. Never invent an id.
- Name the topics you drew from.
- Later questions continue the same conversation: resolve "they", "that" and a bare "why" against the earlier turns, and answer only the newest question.
- Output GitHub-flavored markdown, no preamble, no code fences.`

function tokenize(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2 && !STOPWORDS.has(term))
    ),
  ]
}

function scoreDoc(doc: KbDoc, terms: string[]): number {
  const title = doc.topic.toLowerCase()
  const body = doc.body.toLowerCase()
  let score = 0
  for (const term of terms) {
    if (title.includes(term)) score += 3
    const occurrences = body.split(term).length - 1
    score += Math.min(occurrences, 3)
  }
  return score
}

/** Cheap local pre-filter so the prompt stays bounded as the KB grows. */
export function selectDocs(docs: KbDoc[], question: string): KbDoc[] {
  const terms = tokenize(question)
  const scored = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, terms) }))
    .sort((a, b) => b.score - a.score)

  const matched = scored.filter((entry) => entry.score > 0).slice(0, MAX_DOCS)
  if (matched.length > 0) return matched.map((entry) => entry.doc)

  // Nothing matched on keywords — fall back to the freshest topics so the model
  // can still say "the knowledge base doesn't cover this" with context.
  return [...docs]
    .sort((a, b) => (b.generatedAt ?? '').localeCompare(a.generatedAt ?? ''))
    .slice(0, MAX_DOCS)
}

/**
 * A follow-up is often too short to score on its own ("why?", "who said that?"),
 * so the documents the conversation already drew on are kept in scope, and the
 * keyword pass runs over every question asked rather than only the newest.
 */
function selectForConversation(docs: KbDoc[], question: string, history: KbAskTurn[]): KbDoc[] {
  if (history.length === 0) return selectDocs(docs, question)

  const pinnedSlugs = new Set(history.flatMap((turn) => turn.sources.map((source) => source.slug)))
  const pinned = docs.filter((doc) => pinnedSlugs.has(doc.slug))
  const fresh = selectDocs(docs, [...history.map((turn) => turn.question), question].join(' '))

  const merged: KbDoc[] = []
  const seen = new Set<string>()
  for (const doc of [...pinned, ...fresh]) {
    if (seen.has(doc.slug)) continue
    seen.add(doc.slug)
    merged.push(doc)
  }
  return merged.slice(0, MAX_CONVERSATION_DOCS)
}

export async function askKb(
  workspaceId: string,
  question: string,
  history: KbAskTurn[] = []
): Promise<KbAskResult> {
  const trimmed = question.trim()
  if (!trimmed) throw new Error('Ask a question first')

  const config = readKbAiConfig()
  if (!isKbAiReady(config)) throw new Error('AI is not configured — set a key and model in Settings → AI.')

  const docs = listDocs(workspaceId)
  if (docs.length === 0) throw new Error('No knowledge base topics yet — file some notes first.')

  const recent = history.slice(-MAX_HISTORY_TURNS)
  const selected = selectForConversation(docs, trimmed, recent)
  const documents = selected
    .map((doc) => `--- topic: ${doc.topic} (${doc.slug}) ---\n${doc.body.slice(0, MAX_DOC_CHARS)}`)
    .join('\n\n')

  // Earlier turns are replayed as the bare exchange; only the newest question
  // carries the documents, so the prompt does not re-send them once per turn.
  const answer = await chat({
    config,
    model: config.model,
    system: SYSTEM_PROMPT,
    history: recent.flatMap((turn) => [
      { role: 'user' as const, content: turn.question },
      { role: 'assistant' as const, content: turn.answer },
    ]),
    user: `Topic index:\n${readIndex(workspaceId) || '(none)'}\n\nDocuments:\n${documents}\n\nQuestion: ${trimmed}`,
  })

  return {
    answer: answer.replace(/```(?:markdown)?/gi, '').trim(),
    sources: selected.map((doc) => ({ slug: doc.slug, topic: doc.topic })),
  }
}
