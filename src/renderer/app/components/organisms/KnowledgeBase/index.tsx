import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { KbAskResult, KbDocContent, KbProgress } from '@shared/types'
import { Button } from '../../atoms/Button'
import { useKb } from '../../../hooks/useKb'
import { useAiSettings } from '../../../hooks/useAiSettings'

const NOTE_LINK_PREFIX = 'peernotes://note/'

/**
 * react-markdown strips URLs whose protocol isn't in its safe list, which would
 * leave every citation as an inert anchor with an empty href. Let our own scheme
 * through and keep the default sanitizing for everything else.
 */
function urlTransform(url: string): string {
  return url.startsWith(NOTE_LINK_PREFIX) ? url : defaultUrlTransform(url)
}

interface Props {
  workspaceId: string | null
  /** resolves false when the cited note no longer exists */
  onOpenNote: (noteId: string) => Promise<boolean>
  onOpenSettings: () => void
  onAddNote: () => void
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: ${({ theme }) => theme.spacing['6']};
  height: 100%;
  padding-top: ${({ theme }) => theme.spacing['6']};
  min-height: 0;
`

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1']};
  overflow-y: auto;
  min-height: 0;
`

const SidebarLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: 0 ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['1']};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const TopicRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.bg.tertiary : 'transparent')};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.1s ease;

  &:hover { background: ${({ theme }) => theme.colors.bg.secondary}; }
`

const TopicName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StaleDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.accent};
  flex-shrink: 0;
`

const NoteCount = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.full};
  flex-shrink: 0;
`

const DocColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['3']};
  overflow: hidden;
  min-height: 0;
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing['2']};
  flex-shrink: 0;
`

const AskInput = styled.input`
  flex: 1;
  min-width: 160px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.base};
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']};
  height: 28px;
  outline: none;
  transition: border-color 0.12s ease;

  &::placeholder { color: ${({ theme }) => theme.colors.text.placeholder}; }
  &:focus { border-color: ${({ theme }) => theme.colors.border.focus}; }
`

const ActionSpacer = styled.div`
  flex: 1;
`

const ConfirmBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['3']};
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  flex-shrink: 0;
`

const ConfirmText = styled.div`
  flex: 1;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.base};
`

const ErrorText = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.danger};
  flex-shrink: 0;
`

const HintText = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  flex-shrink: 0;
`

// ─── Markdown surface ────────────────────────────────────────────────────────

const Prose = styled.div`
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  user-select: text;
  word-break: break-word;

  > *:first-child { margin-top: 0; }
  > *:last-child { margin-bottom: 0; }

  p { margin: 0 0 ${({ theme }) => theme.spacing['3']}; }

  h1, h2, h3, h4, h5, h6 {
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    margin: ${({ theme }) => theme.spacing['5']} 0 ${({ theme }) => theme.spacing['2']};
  }
  h1 { font-size: ${({ theme }) => theme.typography.size.xl}; margin-top: 0; }
  h2 { font-size: ${({ theme }) => theme.typography.size.lg}; }
  h3, h4, h5, h6 { font-size: ${({ theme }) => theme.typography.size.md}; }

  strong { font-weight: ${({ theme }) => theme.typography.weight.semibold}; }
  em { font-style: italic; }

  ul, ol {
    margin: ${({ theme }) => theme.spacing['2']} 0;
    padding-left: ${({ theme }) => theme.spacing['5']};
  }
  li { margin: ${({ theme }) => theme.spacing['1']} 0; }

  blockquote {
    margin: ${({ theme }) => theme.spacing['3']} 0;
    padding-left: ${({ theme }) => theme.spacing['3']};
    border-left: 2px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  code {
    font-size: 0.92em;
    background: ${({ theme }) => theme.colors.bg.secondary};
    padding: 1px 4px;
    border-radius: ${({ theme }) => theme.radius.sm};
  }

  table { border-collapse: collapse; margin: ${({ theme }) => theme.spacing['3']} 0; }
  th, td {
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2']};
    text-align: left;
  }
`

const Citation = styled.button`
  display: inline;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: ${({ theme }) => theme.colors.accent};
  cursor: pointer;
  text-align: left;

  &:hover { text-decoration: underline; }
`

const DocScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: ${({ theme }) => theme.spacing['2']};
`

const DocMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['3']};
  padding-bottom: ${({ theme }) => theme.spacing['4']};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

const AnswerCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing['4']};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['3']};
  flex-shrink: 0;
  max-height: 45%;
  overflow-y: auto;
`

const AnswerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing['2']};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const SourceRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing['1.5']};
`

const SourceChip = styled.button`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: none;
  border-radius: ${({ theme }) => theme.radius.full};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.xs};
  padding: 2px 8px;
  cursor: pointer;

  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing['3']};
  height: 100%;
  min-height: 200px;
  padding: ${({ theme }) => theme.spacing['6']};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.base};
  text-align: center;
`

const EmptyGlyph = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.accent};
  font-size: ${({ theme }) => theme.typography.size.lg};
  margin-bottom: ${({ theme }) => theme.spacing['1']};
`

const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyText = styled.p`
  max-width: 380px;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`

const EmptyExample = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-style: italic;
`

const SidebarEmpty = styled.div`
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  line-height: ${({ theme }) => theme.typography.lineHeight.base};
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatGenerated(iso: string | null): string {
  if (!iso) return 'never generated'
  return `generated ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function formatProgress({ phase, done, total }: KbProgress): string {
  return phase === 'filing' ? `Sorting note ${done} of ${total}…` : `Writing document ${done} of ${total}…`
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KnowledgeBase({ workspaceId, onOpenNote, onOpenSettings, onAddNote }: Props) {
  const { aiSettings } = useAiSettings()
  const { status, loading, refresh } = useKb(workspaceId)

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [doc, setDoc] = useState<KbDocContent | null>(null)
  // 'rewriting' is one document on demand; 'regenerating' is the stale sweep
  const [busy, setBusy] = useState<'filing' | 'rewriting' | 'regenerating' | 'asking' | 'rebuilding' | null>(null)
  const [confirmRebuild, setConfirmRebuild] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<KbAskResult | null>(null)
  const [progress, setProgress] = useState<KbProgress | null>(null)

  const topics = status.topics
  // Enabled is not the same as usable — every action throws without both of these
  const aiReady = aiSettings.enabled && !!aiSettings.apiKey && !!aiSettings.model
  // Only the runs that work through a list can be stopped partway
  const stoppable = busy === 'filing' || busy === 'rebuilding' || busy === 'regenerating'

  useEffect(() => window.api.kb.onProgress(setProgress), [])

  // Select the first topic once the list loads, and recover if the selected
  // topic's file disappears (deleted from the folder, or pulled away by sync).
  useEffect(() => {
    if (topics.length === 0) {
      setSelectedSlug(null)
      return
    }
    if (!selectedSlug || !topics.some((t) => t.slug === selectedSlug)) {
      setSelectedSlug(topics[0].slug)
    }
  }, [topics, selectedSlug])

  // `status` is in the deps so a regeneration refreshes the open doc too
  useEffect(() => {
    if (!workspaceId || !selectedSlug) {
      setDoc(null)
      return
    }
    let cancelled = false
    window.api.kb.read(workspaceId, selectedSlug).then((next) => {
      if (!cancelled) setDoc(next)
    })
    return () => { cancelled = true }
  }, [workspaceId, selectedSlug, status])

  const run = useCallback(
    async (
      kind: 'filing' | 'rewriting' | 'regenerating' | 'asking' | 'rebuilding',
      action: () => Promise<string | null>
    ) => {
      setBusy(kind)
      setError(null)
      setNotice(null)
      setProgress(null)
      try {
        const message = await action()
        if (message) setNotice(message)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setBusy(null)
        setProgress(null)
        refresh()
      }
    },
    [refresh]
  )

  const handleFileUnfiled = () => {
    if (!workspaceId) return
    run('filing', async () => {
      const { filed, failed, cancelled } = await window.api.kb.fileUnfiled(workspaceId)
      if (filed === 0 && failed === 0) return cancelled ? 'Stopped before any note was sorted.' : 'Nothing left to sort.'
      const parts = [`Filed ${plural(filed, 'note')}`]
      if (failed > 0) parts.push(`${failed} could not be filed`)
      if (cancelled) parts.push('stopped early — the rest are still unfiled')
      return `${parts.join(' · ')}.`
    })
  }

  const handleRegenerate = (slug: string) => {
    if (!workspaceId) return
    run('rewriting', async () => {
      await window.api.kb.regenerate(workspaceId, slug)
      return null
    })
  }

  const handleRegenerateStale = () => {
    if (!workspaceId) return
    run('regenerating', async () => {
      const { regenerated, failed, cancelled } = await window.api.kb.regenerateStale(workspaceId)
      if (failed.length > 0) {
        throw new Error(`Rewrote ${regenerated}, failed on ${failed.length}: ${failed[0].error}`)
      }
      return `Rewrote ${plural(regenerated, 'doc')}${cancelled ? ' · stopped early, the rest are still stale' : ''}.`
    })
  }

  const handleRebuild = () => {
    if (!workspaceId) return
    setConfirmRebuild(false)
    run('rebuilding', async () => {
      const r = await window.api.kb.rebuild(workspaceId)
      const parts = [`Rebuilt ${plural(r.topics, 'topic')} from ${r.filed} of ${plural(r.notes, 'note')}`]
      if (r.failed > 0) parts.push(`${r.failed} could not be filed`)
      // Either the user stopped it or the filing guard tripped after three
      // consecutive failures — say so rather than leaving notes unexplained.
      if (r.filed + r.failed < r.notes) {
        parts.push(
          r.cancelled
            ? `stopped — ${r.notes - r.filed} still unfiled, use Sort to pick up where it left off`
            : `stopped early — ${r.notes - r.filed} still unfiled, use Sort once the cause is fixed`
        )
      }
      if (r.regenFailed.length > 0) {
        parts.push(`${r.regenFailed.length} document${r.regenFailed.length === 1 ? '' : 's'} failed to write`)
      }
      return `${parts.join(' · ')}.`
    })
  }

  const handleAsk = () => {
    if (!workspaceId || !question.trim()) return
    run('asking', async () => {
      setAnswer(await window.api.kb.ask(workspaceId, question))
      return null
    })
  }

  const handleCitation = async (noteId: string) => {
    if (await onOpenNote(noteId)) return
    // The doc still cites a note that has since been deleted; a rewrite drops it.
    setNotice('That note has been deleted — rewrite this topic to drop the citation.')
  }

  const markdownComponents = {
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (href?.startsWith(NOTE_LINK_PREFIX)) {
        const noteId = href.slice(NOTE_LINK_PREFIX.length)
        return <Citation onClick={() => handleCitation(noteId)}>{children}</Citation>
      }
      return (
        <a href={href} onClick={(e) => { e.preventDefault(); if (href) window.open(href) }}>
          {children}
        </a>
      )
    },
  }

  if (!aiReady) {
    const missing = !aiSettings.apiKey && !aiSettings.model
      ? 'an OpenRouter key and a model'
      : !aiSettings.apiKey ? 'an OpenRouter key' : 'a model'
    return (
      <Empty>
        <EmptyGlyph>✦</EmptyGlyph>
        <EmptyTitle>Your notes, turned into a wiki</EmptyTitle>
        <EmptyText>
          Peernotes can group your notes by theme and write a living document for each one, so the
          things that keep coming up about your team are in one place instead of scattered across
          months of entries.
        </EmptyText>
        <EmptyExample>“What do people keep saying about onboarding?”</EmptyExample>
        <EmptyText>
          {aiSettings.enabled
            ? `AI is on, but there is still ${missing} to set before anything can be built.`
            : 'Switch on AI in Settings, add an OpenRouter key and a model, and it starts building.'}
        </EmptyText>
        <Button $variant="primary" $size="sm" onClick={onOpenSettings}>
          Open Settings
        </Button>
      </Empty>
    )
  }

  return (
    <Layout>
      <Sidebar>
        <SidebarLabel>
          Topics
          {status.unfiledCount > 0 && <NoteCount>{status.unfiledCount} unfiled</NoteCount>}
        </SidebarLabel>
        {topics.length === 0 && !loading && (
          <SidebarEmpty>Topics show up here as your notes get sorted.</SidebarEmpty>
        )}
        {topics.map((topic) => (
          <TopicRow
            key={topic.slug}
            $active={topic.slug === selectedSlug}
            onClick={() => setSelectedSlug(topic.slug)}
            title={topic.stale ? `${topic.pendingCount} new note(s) not in this doc yet` : topic.topic}
          >
            {topic.stale && <StaleDot />}
            <TopicName>{topic.topic}</TopicName>
            <NoteCount>{topic.noteCount}</NoteCount>
          </TopicRow>
        ))}
      </Sidebar>

      <DocColumn>
        <ActionRow>
          {/* Nothing to ask against until at least one topic exists */}
          {topics.length > 0 ? (
            <>
              <AskInput
                value={question}
                placeholder="Ask a question…"
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && busy === null) handleAsk()
                  if (e.key === 'Escape') { setQuestion(''); setAnswer(null) }
                }}
              />
              <Button $variant="primary" $size="sm" onClick={handleAsk} disabled={busy !== null || !question.trim()}>
                {busy === 'asking' ? '✦ Asking…' : '✦ Ask'}
              </Button>
            </>
          ) : (
            <ActionSpacer />
          )}
          {/* With no topics the empty state carries this action instead */}
          {status.unfiledCount > 0 && topics.length > 0 && (
            <Button
              $variant="ghost"
              $size="sm"
              onClick={handleFileUnfiled}
              disabled={busy !== null}
              title={`Sorts every unfiled note into topics — one AI call per note (${status.unfiledCount})`}
            >
              {busy === 'filing' ? 'Sorting…' : `Sort ${status.unfiledCount} unfiled`}
            </Button>
          )}
          {status.staleCount > 0 && (
            <Button $variant="ghost" $size="sm" onClick={handleRegenerateStale} disabled={busy !== null}>
              {busy === 'regenerating' ? 'Rewriting…' : `Rewrite ${status.staleCount} stale`}
            </Button>
          )}
          {status.noteCount > 0 && (
            <Button
              $variant="ghost"
              $size="sm"
              onClick={() => { setConfirmRebuild(true); setError(null); setNotice(null) }}
              disabled={busy !== null}
              title="Discards every topic and files all notes again from scratch — the only way topics can merge or split"
            >
              {busy === 'rebuilding' ? 'Rebuilding…' : 'Rebuild…'}
            </Button>
          )}
          <Button
            $variant="ghost"
            $size="sm"
            onClick={() => workspaceId && window.api.kb.openFolder(workspaceId)}
            title={status.folder}
          >
            Folder
          </Button>
          {stoppable && (
            <Button
              $variant="ghost"
              $size="sm"
              onClick={() => window.api.kb.cancel()}
              title="Finishes the note it is on, then stops — everything filed so far is kept"
            >
              Stop
            </Button>
          )}
        </ActionRow>

        {progress && busy !== null && <HintText>{formatProgress(progress)}</HintText>}

        {confirmRebuild && (
          <ConfirmBar>
            <ConfirmText>
              Re-file all {status.noteCount} note{status.noteCount === 1 ? '' : 's'} into fresh topics? Every
              current document is discarded and written again — about {status.noteCount + status.topics.length}{' '}
              AI calls, and topics may come back merged, split or renamed.
            </ConfirmText>
            <Button $variant="primary" $size="sm" onClick={handleRebuild}>
              Rebuild
            </Button>
            <Button $variant="ghost" $size="sm" onClick={() => setConfirmRebuild(false)}>
              Cancel
            </Button>
          </ConfirmBar>
        )}

        {error && <ErrorText>{error}</ErrorText>}
        {notice && !error && <HintText>{notice}</HintText>}

        {answer && (
          <AnswerCard>
            <AnswerHeader>
              Answer
              <Button $variant="ghost" $size="sm" onClick={() => setAnswer(null)}>Dismiss</Button>
            </AnswerHeader>
            <Prose>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={urlTransform}>
                {answer.answer}
              </ReactMarkdown>
            </Prose>
            {answer.sources.length > 0 && (
              <SourceRow>
                {answer.sources.map((source) => (
                  <SourceChip key={source.slug} onClick={() => setSelectedSlug(source.slug)}>
                    {source.topic}
                  </SourceChip>
                ))}
              </SourceRow>
            )}
          </AnswerCard>
        )}

        <DocScroll>
          {doc ? (
            <>
              <DocMeta>
                <span>
                  {doc.noteIds.length} note{doc.noteIds.length === 1 ? '' : 's'} · {formatGenerated(doc.generatedAt)}
                </span>
                {doc.stale && <span>· {doc.pendingCount} not summarized yet</span>}
                <Button
                  $variant="ghost"
                  $size="sm"
                  onClick={() => handleRegenerate(doc.slug)}
                  disabled={busy !== null}
                  title="Rewrites the whole document from its notes — manual edits are not kept"
                >
                  {busy === 'rewriting' ? '✦ Rewriting…' : '✦ Rewrite'}
                </Button>
              </DocMeta>
              <Prose>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={urlTransform}>
                  {doc.body}
                </ReactMarkdown>
              </Prose>
            </>
          ) : loading ? (
            <Empty>Reading your topics…</Empty>
          ) : status.unfiledCount > 0 ? (
            <Empty>
              <EmptyGlyph>✦</EmptyGlyph>
              <EmptyTitle>
                {status.unfiledCount} note{status.unfiledCount === 1 ? '' : 's'} ready to be sorted
              </EmptyTitle>
              <EmptyText>
                Peernotes will read {status.unfiledCount === 1 ? 'it' : 'them'}, group{' '}
                {status.unfiledCount === 1 ? 'it' : 'them'} by theme, and write a document per topic —
                each point linked back to the note it came from. One AI call per note, so this takes a
                moment on a big backlog.
              </EmptyText>
              <Button $variant="primary" $size="sm" onClick={handleFileUnfiled} disabled={busy !== null}>
                {busy === 'filing'
                  ? 'Sorting…'
                  : `Sort ${status.unfiledCount} note${status.unfiledCount === 1 ? '' : 's'}`}
              </Button>
              {!aiSettings.kbAutoFile && (
                <EmptyText>
                  Automatic filing is off, so new notes will collect here until you sort them. You can turn
                  it on in Settings → Knowledge Base.
                </EmptyText>
              )}
            </Empty>
          ) : (
            <Empty>
              <EmptyGlyph>✦</EmptyGlyph>
              <EmptyTitle>Nothing to build from yet</EmptyTitle>
              <EmptyText>
                Add a few notes about your team. Each one gets filed into a topic as you save it, and the
                documents here fill in and rewrite themselves as the notes pile up.
              </EmptyText>
              <EmptyExample>Then ask things like “who has been blocked the most this month?”</EmptyExample>
              <Button $variant="primary" $size="sm" onClick={onAddNote}>
                Add a note
              </Button>
            </Empty>
          )}
        </DocScroll>
      </DocColumn>
    </Layout>
  )
}
