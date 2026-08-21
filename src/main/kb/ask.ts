import { listDocs, readIndex } from './doc'
import type { KbDoc } from './doc'
import { chat, isKbAiReady, readKbAiConfig } from './openrouter'

const MAX_DOCS = 5
const MAX_DOC_CHARS = 6_000

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

export interface KbAskResult {
  answer: string
  sources: Array<{ slug: string; topic: string }>
}

export async function askKb(workspaceId: string, question: string): Promise<KbAskResult> {
  const trimmed = question.trim()
  if (!trimmed) throw new Error('Ask a question first')

  const config = readKbAiConfig()
  if (!isKbAiReady(config)) throw new Error('AI is not configured — set a key and model in Settings → AI.')

  const docs = listDocs(workspaceId)
  if (docs.length === 0) throw new Error('No knowledge base topics yet — file some notes first.')

  const selected = selectDocs(docs, trimmed)
  const documents = selected
    .map((doc) => `--- topic: ${doc.topic} (${doc.slug}) ---\n${doc.body.slice(0, MAX_DOC_CHARS)}`)
    .join('\n\n')

  const answer = await chat({
    config,
    model: config.model,
    system: SYSTEM_PROMPT,
    user: `Topic index:\n${readIndex(workspaceId) || '(none)'}\n\nDocuments:\n${documents}\n\nQuestion: ${trimmed}`,
  })

  return {
    answer: answer.replace(/```(?:markdown)?/gi, '').trim(),
    sources: selected.map((doc) => ({ slug: doc.slug, topic: doc.topic })),
  }
}
