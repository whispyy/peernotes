import { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import type { Note, Person, AiPurposePreset } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { Button } from '../../atoms/Button'
import { MonthGroup } from '../../molecules/MonthGroup'
import { groupByMonth } from '../../../utils/groupByMonth'
import { useAiSettings } from '../../../hooks/useAiSettings'

interface Props {
  people: Person[]
  notes: Note[]
  peopleById: Record<string, Person>
  onDelete: (id: string) => void
  onAddNote: (payload: { personId: string; sentiment: 'positive' | 'neutral' | 'negative'; note: string }) => Promise<Note>
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: ${({ theme }) => theme.spacing['6']};
  height: 100%;
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

const Feed = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['4']};
  overflow-y: auto;
`

const FeedHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
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

const SummarizePanel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.lg};
  flex-wrap: wrap;
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

// ─── Animated dots ───────────────────────────────────────────────────────────

const WaveDots = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-left: 2px;
`

const WaveDot = styled.span<{ $delay: number }>`
  @keyframes wave {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-3px); }
  }

  display: inline-block;
  animation: wave 1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}ms;
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

const BannerText = styled.p`
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  user-select: text;
`

const BannerActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['2']};
  justify-content: flex-end;
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PersonView({ people, notes, peopleById, onDelete, onAddNote }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { aiSettings } = useAiSettings()

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

  // Reset panel when switching person
  useEffect(() => {
    setPanelOpen(false)
    setSummary(null)
    setGenError(null)
  }, [selectedId])

  // Auto-select first purpose when presets load
  useEffect(() => {
    if (aiSettings.purposes.length > 0 && !purposeId) {
      setPurposeId(aiSettings.purposes[0].id)
    }
  }, [aiSettings.purposes, purposeId])

  const noteCountByPerson = useMemo(
    () => Object.fromEntries(
      people.map((p) => [p.id, notes.filter((n) => n.personId === p.id).length])
    ),
    [people, notes]
  )

  const personNotes = notes.filter((n) => n.personId === selectedId)
  const groups = groupByMonth(personNotes)

  const selectedPerson = people.find((p) => p.id === selectedId)

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

    const rangeNotes = personNotes.filter((n) => {
      const t = n.timestamp.slice(0, 10)
      return t >= from && t <= to
    })

    if (rangeNotes.length === 0) {
      setGenError('No notes found in this date range.')
      return
    }

    setGenerating(true)
    try {
      const result = await window.api.ai.summarize({
        personName: selectedPerson.name,
        notes: rangeNotes.map((n) => ({ sentiment: n.sentiment, note: n.note, timestamp: n.timestamp })),
        from: formatDateLabel(from),
        to: formatDateLabel(to),
        systemPrompt: purpose?.systemPrompt ?? 'Summarize the following notes about this person.',
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
      })
      setSummary({ text: result.text, dateLabel: `${formatDateLabel(from)} – ${formatDateLabel(to)}` })
      setPanelOpen(false)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveAsNote = async () => {
    if (!summary || !selectedId) return
    setSaving(true)
    const noteText = `[AI Summary: ${summary.dateLabel}]\n\n${summary.text}`
    await onAddNote({ personId: selectedId, sentiment: 'neutral', note: noteText })
    setSummary(null)
    setSaving(false)
  }

  return (
    <Layout>
      <Sidebar>
        {people.map((p) => (
          <PersonRow key={p.id} $active={p.id === selectedId} onClick={() => setSelectedId(p.id)}>
            <Avatar name={p.name} size={28} />
            <PersonName>{p.name}</PersonName>
            <NoteCount>{noteCountByPerson[p.id] ?? 0}</NoteCount>
          </PersonRow>
        ))}
      </Sidebar>

      <Feed>
        {/* Summarize button — only shown when AI enabled and person has notes */}
        {aiSettings.enabled && personNotes.length > 0 && !summary && (
          <FeedHeader>
            <Button $variant="ghost" $size="sm" onClick={() => { setPanelOpen((o) => !o); setGenError(null) }}>
              {panelOpen ? 'Cancel' : '✦ Summarize'}
            </Button>
          </FeedHeader>
        )}

        {/* Summarize panel */}
        {panelOpen && aiSettings.enabled && (
          <SummarizePanel>
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
            <Button $variant="primary" $size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <>Generating<WaveDots><WaveDot $delay={0}>.</WaveDot><WaveDot $delay={150}>.</WaveDot><WaveDot $delay={300}>.</WaveDot></WaveDots></> : '✦ Generate'}
            </Button>
            {genError && <ErrorText>{genError}</ErrorText>}
          </SummarizePanel>
        )}

        {/* Summary banner */}
        {summary && (
          <SummaryBanner>
            <BannerHeader>
              <BannerTitle>AI Summary · {summary.dateLabel}</BannerTitle>
              <Button $variant="ghost" $size="sm" onClick={() => setSummary(null)}>Dismiss</Button>
            </BannerHeader>
            <BannerText>{summary.text}</BannerText>
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

        {personNotes.length === 0 ? (
          <Empty>No notes for this person yet.</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {groups.map((g) => (
              <MonthGroup
                key={g.label}
                label={g.label}
                notes={g.notes}
                peopleById={peopleById}
                showPerson={false}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </Feed>
    </Layout>
  )
}
