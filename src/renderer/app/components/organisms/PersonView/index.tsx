import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import styled, { createGlobalStyle, css, keyframes } from 'styled-components'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Note, Person, AiPurposePreset } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { Button } from '../../atoms/Button'
import { NoteCard } from '../../molecules/NoteCard'
import { LoadMore } from '../../molecules/LoadMore'
import { groupByMonth } from '../../../utils/groupByMonth'
import { useAiSettings } from '../../../hooks/useAiSettings'

const PAGE_SIZE = 100

type VirtualRow =
  | { kind: 'header'; label: string; isFirst: boolean }
  | { kind: 'note'; note: Note }

interface Props {
  people: Person[]
  workspaceId: string | null
  countByPerson: Record<string, number>
  peopleById: Record<string, Person>
  onDelete: (id: string) => Promise<void>
  onAddNote: (payload: { personId: string; sentiment: 'positive' | 'neutral' | 'negative'; note: string }) => Promise<Note>
  onEdit?: (note: Note) => void
  onExpand?: (note: Note) => void
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: ${({ theme }) => theme.spacing['6']};
  height: 100%;
  padding-top: ${({ theme }) => theme.spacing['6']};
`

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1']};
`

const PersonRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2.5']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.bg.tertiary : 'transparent')};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }
`

const PersonName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`

const NoteCount = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.full};
`

const FeedColumn = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
`

const FeedControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['4']};
  flex-shrink: 0;
`

const Feed = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
`

const FeedHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: ${({ theme }) => theme.spacing['2']};
`

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.base};
`


// ─── Summarize panel ─────────────────────────────────────────────────────────

// #0A84FF → 10, 132, 255  |  teal #32D4A0 → 50, 212, 160
const ACCENT_RGB = '10, 132, 255'
const TEAL_RGB   = '50, 212, 160'

// Register --arc as an animatable <angle> so the conic-gradient start
// interpolates smoothly without rotating the element (no layout overflow).
const ArcProperty = createGlobalStyle`
  @property --arc {
    syntax: '<angle>';
    inherits: false;
    initial-value: 270deg;
  }
`

// 270° → 630° = one full clockwise turn, starting at the same frame as arcGlow
const arcSpin = keyframes`
  from { --arc: 270deg }
  to   { --arc: 630deg }
`

// Directional glow that tracks the arc head as it orbits the panel
const arcGlow = keyframes`
  0%   { box-shadow: -3px  5px  9px rgba(${ACCENT_RGB},.28),  -5px  10px 18px rgba(${ACCENT_RGB},.10); }
  25%  { box-shadow: -5px -3px  9px rgba(${TEAL_RGB},.28),   -10px  -5px 18px rgba(${TEAL_RGB},.10);   }
  50%  { box-shadow:  3px -5px  9px rgba(${TEAL_RGB},.28),     5px -10px 18px rgba(${TEAL_RGB},.10);   }
  75%  { box-shadow:  5px  3px  9px rgba(${ACCENT_RGB},.28),  10px   5px 18px rgba(${ACCENT_RGB},.10); }
  100% { box-shadow: -3px  5px  9px rgba(${ACCENT_RGB},.28),  -5px  10px 18px rgba(${ACCENT_RGB},.10); }
`

const PanelSpinWrapper = styled.div<{ $generating: boolean }>`
  position: relative;
  border-radius: calc(${({ theme }) => theme.radius.lg} + 2px);
  margin: 2px 2px ${({ theme }) => theme.spacing['3']};

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: conic-gradient(
      from var(--arc),
      transparent 0deg,
      transparent 235deg,
      rgba(${ACCENT_RGB}, 0.3) 255deg,
      #0A84FF 272deg,
      #32D4A0 318deg,
      rgba(${TEAL_RGB}, 0.3) 338deg,
      transparent 360deg
    );
    opacity: ${({ $generating }) => ($generating ? 1 : 0)};
    transition: opacity 0.35s;
    ${({ $generating }) =>
      $generating &&
      css`
        animation: ${arcSpin} 2.2s linear infinite;
      `}
  }
`

const SummarizePanel = styled.div<{ $generating: boolean }>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.lg};
  flex-wrap: wrap;
  transition: background 0.3s, border-color 0.3s;
  ${({ $generating }) =>
    $generating &&
    css`
      animation: ${arcGlow} 2.2s linear infinite;
    `}
`

const PanelLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`

const DateInput = styled.input`
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['2']};
  outline: none;
  transition: border-color 0.12s ease;
  cursor: pointer;

  &:focus {
    border-color: ${({ theme }) => theme.colors.border.focus};
  }

  &::-webkit-calendar-picker-indicator {
    opacity: 0.5;
    cursor: pointer;
  }
`

const PurposeSelect = styled.select`
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['2']};
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${({ theme }) => theme.colors.border.focus};
  }
`

const PanelSpacer = styled.div`
  flex: 1;
`

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.danger};
  width: 100%;
`


// ─── Summary banner ──────────────────────────────────────────────────────────

const SummaryBanner = styled.div`
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing['4']};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['3']};
`

const BannerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing['2']};
`

const BannerTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const BannerText = styled.div`
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  user-select: text;
  word-break: break-word;
  max-height: 260px;
  overflow-y: auto;

  > *:first-child { margin-top: 0; }
  > *:last-child { margin-bottom: 0; }

  p { margin: 0 0 ${({ theme }) => theme.spacing['2']}; }

  h1, h2, h3, h4, h5, h6 {
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    margin: ${({ theme }) => theme.spacing['3']} 0 ${({ theme }) => theme.spacing['1']};
  }
  h1 { font-size: 1.2em; }
  h2 { font-size: 1.1em; }
  h3, h4, h5, h6 { font-size: 1em; }

  strong { font-weight: ${({ theme }) => theme.typography.weight.semibold}; }
  em { font-style: italic; }

  ul, ol {
    margin: ${({ theme }) => theme.spacing['1']} 0;
    padding-left: ${({ theme }) => theme.spacing['4']};
  }
  li { margin: 2px 0; }
`

const BannerActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['2']};
  justify-content: flex-end;
`

// ─── Virtual list styled components ──────────────────────────────────────────

const VirtualMonthLabel = styled.h3<{ $isFirst: boolean }>`
  margin: 0;
  padding: ${({ $isFirst }) => ($isFirst ? '0' : '32px')} 0 8px;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const VirtualNoteWrapper = styled.div`
  padding-bottom: ${({ theme }) => theme.spacing['2']};
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PersonView({ people, workspaceId, countByPerson, peopleById, onDelete, onAddNote, onEdit, onExpand }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { aiSettings } = useAiSettings()

  // Per-person paginated notes
  const [personNotes, setPersonNotes] = useState<Note[]>([])
  const [personTotal, setPersonTotal] = useState(0)
  const [personLoading, setPersonLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const personDbOffsetRef = useRef(0)

  // Summarize panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(todayIso)
  const [purposeId, setPurposeId] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Summary banner state
  const [summary, setSummary] = useState<{ text: string; dateLabel: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const feedRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Set initial selection when people list first loads
  useEffect(() => {
    if (selectedId === null && people.length > 0) setSelectedId(people[0].id)
  }, [people, selectedId])

  // Fall back to first person when the selected person is deleted
  useEffect(() => {
    if (selectedId !== null && !people.find((p) => p.id === selectedId)) {
      setSelectedId(people[0]?.id ?? null)
    }
  }, [people, selectedId])

  // Fetch notes for selected person
  useEffect(() => {
    if (!selectedId) {
      setPersonNotes([])
      setPersonTotal(0)
      setPersonLoading(false)
      personDbOffsetRef.current = 0
      return
    }
    let cancelled = false
    setPersonLoading(true)
    setPersonNotes([])
    personDbOffsetRef.current = 0
    window.api.notes.listForPerson(selectedId, 0, PAGE_SIZE).then((list) => {
      if (cancelled) {
        setPersonLoading(false)
        return
      }
      setPersonNotes(list)
      personDbOffsetRef.current = list.length
      setPersonLoading(false)
    })
    setPanelOpen(false)
    setSummary(null)
    setGenError(null)
    feedRef.current?.scrollTo({ top: 0 })
    return () => { cancelled = true }
  }, [selectedId, workspaceId])

  // Re-fetch first page for selected person whenever an external change lands
  useEffect(() => {
    if (!selectedId) return
    return window.api.notes.onUpdated(() => {
      window.api.notes.listForPerson(selectedId, 0, PAGE_SIZE).then((list) => {
        setPersonNotes(list)
        personDbOffsetRef.current = list.length
      })
    })
  }, [selectedId])

  // Keep personTotal in sync whenever countByPerson updates
  useEffect(() => {
    if (selectedId) setPersonTotal(countByPerson[selectedId] ?? 0)
  }, [selectedId, countByPerson])

  // Auto-select first purpose when presets load
  useEffect(() => {
    if (aiSettings.purposes.length > 0 && !purposeId) {
      setPurposeId(aiSettings.purposes[0].id)
    }
  }, [aiSettings.purposes, purposeId])

  const personHasMore = personNotes.length < personTotal

  const handleLoadMore = useCallback(async () => {
    if (!selectedId || loadingMore) return
    setLoadingMore(true)
    const nextPage = await window.api.notes.listForPerson(selectedId, personDbOffsetRef.current, PAGE_SIZE)
    setPersonNotes((prev) => [...prev, ...nextPage])
    personDbOffsetRef.current += nextPage.length
    setLoadingMore(false)
  }, [selectedId, loadingMore])

  const handleDelete = useCallback(async (id: string) => {
    await onDelete(id)
    setPersonNotes((prev) => prev.filter((n) => n.id !== id))
  }, [onDelete])

  const handleAddNote = useCallback(
    async (payload: { personId: string; sentiment: 'positive' | 'neutral' | 'negative'; note: string }) => {
      const newNote = await onAddNote(payload)
      if (payload.personId === selectedId) {
        setPersonNotes((prev) => [newNote, ...prev])
      }
      return newNote
    },
    [onAddNote, selectedId]
  )

  const selectedPerson = people.find((p) => p.id === selectedId)
  const groups = useMemo(() => groupByMonth(personNotes), [personNotes])

  const rows = useMemo<VirtualRow[]>(() => {
    const result: VirtualRow[] = []
    groups.forEach((g, i) => {
      result.push({ kind: 'header', label: g.label, isFirst: i === 0 })
      g.notes.forEach((note) => result.push({ kind: 'note', note }))
    })
    return result
  }, [groups])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => feedRef.current,
    estimateSize: (i) => (rows[i].kind === 'header' ? 56 : 120),
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  })

  const handleGenerate = async () => {
    if (!selectedId || !selectedPerson) return
    setGenError(null)

    const purpose = aiSettings.purposes.find((p: AiPurposePreset) => p.id === purposeId)
    if (!purpose && aiSettings.purposes.length > 0) {
      setGenError('Please select a purpose.')
      return
    }
    if (!aiSettings.apiKey) {
      setGenError('No API key configured. Set it in Settings → AI Summaries.')
      return
    }
    if (!aiSettings.model) {
      setGenError('No model configured. Set it in Settings → AI Summaries.')
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)

    try {
      const rangeNotes = await window.api.notes.listForPersonInRange(selectedId, from, to)

      if (controller.signal.aborted) return

      if (rangeNotes.length === 0) {
        setGenError('No notes found in this date range.')
        return
      }

      const notesText = rangeNotes
        .map((n) => `[${new Date(n.timestamp).toLocaleDateString()} · ${n.sentiment}] ${n.note}`)
        .join('\n\n')

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiSettings.apiKey}`,
          'HTTP-Referer': 'https://peernotes.app',
          'X-Title': 'Peernotes',
        },
        body: JSON.stringify({
          model: aiSettings.model,
          messages: [
            { role: 'system', content: purpose?.systemPrompt ?? 'Summarize the following notes about this person.' },
            { role: 'user', content: `Person: ${selectedPerson.name}\nDate range: ${formatDateLabel(from)} to ${formatDateLabel(to)}\n\nNotes:\n${notesText}` },
          ],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(errorData?.error?.message ?? `OpenRouter error: ${response.status}`)
      }

      const data = (await response.json()) as { choices: Array<{ message: { content: string } }> }
      setSummary({ text: data.choices[0]?.message?.content ?? '', dateLabel: `${formatDateLabel(from)} – ${formatDateLabel(to)}` })
      setPanelOpen(false)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setGenError(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setGenerating(false)
      abortRef.current = null
    }
  }

  const handleSaveAsNote = async () => {
    if (!summary || !selectedId) return
    setSaving(true)
    const noteText = `[AI Summary: ${summary.dateLabel}]\n\n${summary.text}`
    await handleAddNote({ personId: selectedId, sentiment: 'neutral', note: noteText })
    setSummary(null)
    setSaving(false)
  }

  const showControls =
    (aiSettings.enabled && personNotes.length > 0 && !summary) ||
    (panelOpen && aiSettings.enabled) ||
    !!summary

  return (
    <>
    <ArcProperty />
    <Layout>
      <Sidebar>
        {people.map((p) => (
          <PersonRow key={p.id} $active={p.id === selectedId} onClick={() => setSelectedId(p.id)}>
            <Avatar name={p.name} size={28} />
            <PersonName>{p.name}</PersonName>
            <NoteCount>{countByPerson[p.id] ?? 0}</NoteCount>
          </PersonRow>
        ))}
      </Sidebar>

      <FeedColumn>
        {showControls && (
          <FeedControls>
            {/* Summarize button */}
            {aiSettings.enabled && personNotes.length > 0 && !summary && !panelOpen && (
              <FeedHeader>
                <Button $variant="ghost" $size="sm" onClick={() => { setPanelOpen(true); setGenError(null) }}>
                  ✦ Summarize
                </Button>
              </FeedHeader>
            )}

            {/* Summarize panel */}
            {panelOpen && aiSettings.enabled && (
              <PanelSpinWrapper $generating={generating}>
                <SummarizePanel $generating={generating}>
                  <PanelLabel>From</PanelLabel>
                  <DateInput type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                  <PanelLabel>to</PanelLabel>
                  <DateInput type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} />
                  {aiSettings.purposes.length > 0 && (
                    <PurposeSelect value={purposeId} onChange={(e) => setPurposeId(e.target.value)}>
                      {aiSettings.purposes.map((p: AiPurposePreset) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </PurposeSelect>
                  )}
                  <PanelSpacer />
                  <Button $variant="ghost" $size="sm" onClick={() => { abortRef.current?.abort(); setPanelOpen(false); setGenError(null) }}>
                    Cancel
                  </Button>
                  {!generating && (
                    <Button $variant="primary" $size="sm" onClick={handleGenerate}>
                      ✦ Generate
                    </Button>
                  )}
                  {genError && <ErrorText>{genError}</ErrorText>}
                </SummarizePanel>
              </PanelSpinWrapper>
            )}

            {/* Summary banner */}
            {summary && (
              <SummaryBanner>
                <BannerHeader>
                  <BannerTitle>AI Summary · {summary.dateLabel}</BannerTitle>
                  <Button $variant="ghost" $size="sm" onClick={() => setSummary(null)}>Dismiss</Button>
                </BannerHeader>
                <BannerText>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.text}</ReactMarkdown>
                </BannerText>
                <BannerActions>
                  <Button $variant="ghost" $size="sm" onClick={() => { setSummary(null); setPanelOpen(true) }}>
                    Regenerate
                  </Button>
                  <Button $variant="primary" $size="sm" onClick={handleSaveAsNote} disabled={saving}>
                    {saving ? 'Saving…' : 'Save as note'}
                  </Button>
                </BannerActions>
              </SummaryBanner>
            )}
          </FeedControls>
        )}

        <Feed ref={feedRef}>
          {personLoading ? (
            <Empty>Loading…</Empty>
          ) : personNotes.length === 0 ? (
            <Empty>No notes for this person yet.</Empty>
          ) : (
            <>
              <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((vi) => {
                  const row = rows[vi.index]
                  return (
                    <div
                      key={vi.key}
                      data-index={vi.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      {row.kind === 'header' && (
                        <VirtualMonthLabel $isFirst={row.isFirst}>
                          {row.label}
                        </VirtualMonthLabel>
                      )}
                      {row.kind === 'note' && (() => {
                        const person = peopleById[row.note.personId]
                        if (!person) return null
                        return (
                          <VirtualNoteWrapper>
                            <NoteCard
                              note={row.note}
                              person={person}
                              showPerson={false}
                              onDelete={handleDelete}
                              onEdit={onEdit}
                              onExpand={onExpand}
                            />
                          </VirtualNoteWrapper>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
              {personHasMore && (
                <LoadMore loading={loadingMore} onClick={handleLoadMore} compact />
              )}
            </>
          )}
        </Feed>
      </FeedColumn>
    </Layout>
    </>
  )
}
