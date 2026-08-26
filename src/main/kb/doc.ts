import * as fs from 'fs'
import { docPath, ensureKbDir, indexPath, kbDir, slugify, writeFileAtomic } from './paths'

/**
 * The .md files are the only source of truth for the knowledge base — there is
 * no DB table. Everything the app needs (membership, staleness) is derived from
 * this frontmatter, which only this app reads and writes.
 */
export interface KbDoc {
  topic: string
  slug: string
  createdAt: string
  /** null until the body has been generated at least once */
  generatedAt: string | null
  /** notes filed under this topic — membership source of truth */
  noteIds: string[]
  /** notes the current body reflects; differing from noteIds ⇒ stale */
  generatedNoteIds: string[]
  body: string
}

// ── Frontmatter ───────────────────────────────────────────────────────────────

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed
  return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

function parseList(value: string): string[] {
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '')
  return inner
    .split(',')
    .map((v) => unquote(v))
    .filter(Boolean)
}

function serializeDoc(doc: KbDoc): string {
  const lines = [
    '---',
    `topic: ${quote(doc.topic)}`,
    `slug: ${doc.slug}`,
    `created_at: ${doc.createdAt}`,
    `generated_at: ${doc.generatedAt ?? ''}`,
    `note_ids: [${doc.noteIds.join(', ')}]`,
    `generated_note_ids: [${doc.generatedNoteIds.join(', ')}]`,
    '---',
    '',
  ]
  // Trimmed so repeated writes (each filing rewrites the frontmatter) don't
  // accumulate blank lines at the end of the body.
  return `${lines.join('\n')}${doc.body.trim()}\n`
}

function parseDoc(raw: string, fallbackSlug: string): KbDoc | null {
  if (!raw.startsWith('---')) return null
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return null

  const header = raw.slice(4, end)
  const body = raw.slice(end + 4).replace(/^\n+/, '')
  const fields: Record<string, string> = {}
  for (const line of header.split('\n')) {
    const sep = line.indexOf(':')
    if (sep === -1) continue
    fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
  }

  const slug = fields.slug || fallbackSlug
  return {
    topic: unquote(fields.topic ?? '') || slug,
    slug,
    createdAt: fields.created_at || new Date().toISOString(),
    generatedAt: fields.generated_at ? fields.generated_at : null,
    noteIds: parseList(fields.note_ids ?? '[]'),
    generatedNoteIds: parseList(fields.generated_note_ids ?? '[]'),
    body,
  }
}

// ── Write serialization ───────────────────────────────────────────────────────

let chain: Promise<unknown> = Promise.resolve()

/**
 * Serializes every KB mutation. Classification runs fire-and-forget on each
 * note save, so two saves in quick succession would otherwise read-modify-write
 * the same doc file concurrently and lose one of the note ids.
 */
export function withKbLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const run = chain.then(fn, fn)
  chain = run.catch(() => undefined)
  return run
}

// ── Read / write ──────────────────────────────────────────────────────────────

export function listDocs(workspaceId: string): KbDoc[] {
  const dir = kbDir(workspaceId)
  let entries: string[]
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return []
  }
  const docs: KbDoc[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.md') || entry.startsWith('_')) continue
    const slug = entry.slice(0, -3)
    try {
      const doc = parseDoc(fs.readFileSync(docPath(workspaceId, slug), 'utf-8'), slug)
      if (doc) docs.push(doc)
    } catch {
      // unreadable or hand-mangled file — skip it rather than break the view
    }
  }
  return docs.sort((a, b) => a.topic.localeCompare(b.topic))
}

export function readDoc(workspaceId: string, slug: string): KbDoc | null {
  try {
    return parseDoc(fs.readFileSync(docPath(workspaceId, slug), 'utf-8'), slug)
  } catch {
    return null
  }
}

export function writeDoc(workspaceId: string, doc: KbDoc): void {
  ensureKbDir(workspaceId)
  writeFileAtomic(docPath(workspaceId, doc.slug), serializeDoc(doc))
}

export function removeDoc(workspaceId: string, slug: string): void {
  try {
    fs.unlinkSync(docPath(workspaceId, slug))
  } catch {
    // already gone
  }
}

export function isStale(doc: KbDoc): boolean {
  if (doc.noteIds.length !== doc.generatedNoteIds.length) return true
  const generated = new Set(doc.generatedNoteIds)
  return doc.noteIds.some((id) => !generated.has(id))
}

/** Notes filed under a topic but not yet reflected in its body. */
export function pendingNoteIds(doc: KbDoc): string[] {
  const generated = new Set(doc.generatedNoteIds)
  return doc.noteIds.filter((id) => !generated.has(id))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Files a note under a topic, creating the doc when the topic is new. */
export function fileNote(workspaceId: string, topic: string, noteId: string): KbDoc {
  const title = topic.trim().slice(0, 80)
  const slug = slugify(title)
  const existing = readDoc(workspaceId, slug)

  const doc: KbDoc = existing ?? {
    topic: title,
    slug,
    createdAt: new Date().toISOString(),
    generatedAt: null,
    noteIds: [],
    generatedNoteIds: [],
    body: `# ${title}\n`,
  }

  if (!doc.noteIds.includes(noteId)) doc.noteIds = [...doc.noteIds, noteId]
  writeDoc(workspaceId, doc)
  return doc
}

/**
 * Marks every doc citing these notes as needing a rewrite, without disturbing
 * topic membership. Used when a note's person or sentiment changed, or a person
 * was renamed: the topic is still right, but the body attributes the note to the
 * wrong name or mood. Dropping the ids from generated_note_ids is what makes the
 * doc stale and puts them back in the pending count.
 */
export function markNotesPending(workspaceId: string, noteIds: string[]): string[] {
  const targets = new Set(noteIds)
  if (targets.size === 0) return []

  const touched: string[] = []
  for (const doc of listDocs(workspaceId)) {
    const kept = doc.generatedNoteIds.filter((id) => !targets.has(id))
    if (kept.length === doc.generatedNoteIds.length) continue
    writeDoc(workspaceId, { ...doc, generatedNoteIds: kept })
    touched.push(doc.slug)
  }
  return touched
}

/** Used when a note is edited or deleted so it gets re-filed from scratch. */
export function unfileNote(workspaceId: string, noteId: string): string[] {
  const touched: string[] = []
  for (const doc of listDocs(workspaceId)) {
    if (!doc.noteIds.includes(noteId)) continue
    writeDoc(workspaceId, { ...doc, noteIds: doc.noteIds.filter((id) => id !== noteId) })
    touched.push(doc.slug)
  }
  return touched
}

/**
 * Drops ids whose notes no longer exist (deleted, or their person archived).
 * Removing an id from note_ids while leaving generated_note_ids alone makes the
 * doc stale, which is what we want — the body still cites the dead note.
 */
export function pruneDanglingIds(workspaceId: string, liveIds: Set<string>): string[] {
  const touched: string[] = []
  for (const doc of listDocs(workspaceId)) {
    const kept = doc.noteIds.filter((id) => liveIds.has(id))
    if (kept.length === doc.noteIds.length) continue
    writeDoc(workspaceId, { ...doc, noteIds: kept })
    touched.push(doc.slug)
  }
  return touched
}

// ── Index ─────────────────────────────────────────────────────────────────────

/** Browsable summary on GitHub, and the cheap topic context sent with Ask. */
export function writeIndex(workspaceId: string): void {
  const docs = listDocs(workspaceId)
  const rows = docs.map((doc) => {
    const firstLine = doc.body
      .split('\n')
      .find((line) => line.trim() && !line.startsWith('#'))
      ?.replace(/\|/g, '\\|')
      .slice(0, 120) ?? '—'
    const generated = doc.generatedAt ? doc.generatedAt.slice(0, 10) : 'never'
    return `| [${doc.topic.replace(/\|/g, '\\|')}](${doc.slug}.md) | ${doc.noteIds.length} | ${generated} | ${firstLine} |`
  })

  const content = [
    '# Knowledge base',
    '',
    `_${docs.length} topic${docs.length === 1 ? '' : 's'} · generated by Peernotes — do not edit by hand, docs are rewritten on regeneration._`,
    '',
    '| Topic | Notes | Last generated | Summary |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')

  ensureKbDir(workspaceId)
  writeFileAtomic(indexPath(workspaceId), content)
}

export function readIndex(workspaceId: string): string {
  try {
    return fs.readFileSync(indexPath(workspaceId), 'utf-8')
  } catch {
    return ''
  }
}
