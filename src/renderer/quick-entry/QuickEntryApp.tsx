import { useState, useEffect, useCallback, useRef } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import type { Person, Sentiment, Workspace } from '@shared/types'
import { NOTE_MAX_LENGTH } from '@shared/types'
import { PersonSelector } from '../app/components/molecules/PersonSelector'
import { SentimentPicker } from '../app/components/molecules/SentimentPicker'
import { Button } from '../app/components/atoms/Button'
import { TextArea } from '../app/components/atoms/TextArea'

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; }
  body {
    background: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: ${({ theme }) => theme.typography.size.base};
    overflow: hidden;
  }

  /* All interactive elements must opt out of the drag region */
  button, input, textarea, select, a, [role="button"], [role="listbox"], [role="option"] {
    -webkit-app-region: no-drag;
  }
`

const Card = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['3']};
  padding: ${({ theme }) => theme.spacing['4']};
  box-shadow: 0 24px 48px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
  -webkit-app-region: drag;
  cursor: default;
`

const DragHint = styled.div`
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  background: ${({ theme }) => theme.colors.border.default};
  border-radius: 2px;
  pointer-events: none;
`

const CardInner = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['3']};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing['2']};
`

const Title = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  -webkit-app-region: no-drag;
  user-select: none;
  flex: 1;
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.1s;
  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`

const StyledTextArea = styled(TextArea)`
  flex: 1;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  -webkit-app-region: no-drag;
`

const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
`

const Hint = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  user-select: none;
`

const CharCount = styled.span<{ $warn: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ $warn, theme }) => ($warn ? theme.colors.danger : theme.colors.text.muted)};
`

// ── Workspace picker ──────────────────────────────────────────────────────────

const WorkspaceWrapper = styled.div`
  position: relative;
  -webkit-app-region: no-drag;
`

const WorkspaceChip = styled.button<{ $clickable: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['1']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.full};
  padding: ${({ theme }) => theme.spacing['0.5']} ${({ theme }) => theme.spacing['1.5']};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  pointer-events: ${({ $clickable }) => ($clickable ? 'auto' : 'none')};
  color: ${({ theme }) => theme.colors.text.muted};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.xs};
  max-width: 150px;
  transition: background 0.1s, border-color 0.1s, color 0.1s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const WorkspaceChipName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
`

const WorkspaceDropdown = styled.div`
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.spacing['1']});
  right: 0;
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  z-index: 10;
  min-width: 160px;
  max-height: 200px;
  overflow-y: auto;
`

const WorkspaceOption = styled.button<{ $active: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  background: ${({ $active, theme }) => ($active ? theme.colors.bg.tertiary : 'transparent')};
  border: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.weight.medium : theme.typography.weight.regular};
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.1s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }
`

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickEntryApp() {
  const [people, setPeople] = useState<Person[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sentiment, setSentiment] = useState<Sentiment>('neutral')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [wsPickerOpen, setWsPickerOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const loadPeople = useCallback((workspaceId?: string | null) => {
    const fetch = (id: string | null) => {
      if (id) {
        window.api.people.list(id).then((list) => {
          setPeople(list)
          setSelectedPerson((prev) => (list.some((p) => p.id === prev?.id) ? prev : null))
        })
      } else {
        setPeople([])
        setSelectedPerson(null)
      }
    }
    if (workspaceId !== undefined) {
      fetch(workspaceId)
    } else {
      window.api.workspace.getActive().then(fetch)
    }
  }, [])

  const loadWorkspaces = useCallback(async () => {
    const [id, list] = await Promise.all([
      window.api.workspace.getActive(),
      window.api.workspace.list(),
    ])
    setActiveWorkspaceId(id)
    setWorkspaces(list)
    loadPeople(id)
  }, [loadPeople])

  useEffect(() => {
    loadWorkspaces()
    const unsubPeople = window.api.people.onUpdated(() => loadPeople())
    const unsubWorkspace = window.api.workspace.onChanged(loadWorkspaces)
    return () => { unsubPeople(); unsubWorkspace() }
  }, [loadWorkspaces, loadPeople])

  // Close workspace picker when clicking outside
  useEffect(() => {
    if (!wsPickerOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setWsPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [wsPickerOpen])

  const handleSwitchWorkspace = useCallback(async (id: string) => {
    setWsPickerOpen(false)
    if (id === activeWorkspaceId) return
    await window.api.workspace.setActive(id)
    setSelectedPerson(null)
    // loadWorkspaces + loadPeople fire automatically via workspace:changed
  }, [activeWorkspaceId])

  const handleSave = useCallback(async () => {
    if (!selectedPerson || !note.trim()) return
    setSaving(true)
    try {
      await window.api.notes.add({ personId: selectedPerson.id, sentiment, note: note.trim() })
      setSaved(true)
      setTimeout(() => window.close(), 600)
    } catch {
      setSaving(false)
    }
  }, [selectedPerson, sentiment, note])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      if (wsPickerOpen) { setWsPickerOpen(false); return }
      if (!saving) window.close()
    }
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null
  const isMultiWorkspace = workspaces.length > 1

  return (
    <>
      <GlobalStyle />
      <Card onKeyDown={handleKeyDown}>
        <DragHint />
        <CardInner>
          <Header>
            <Title>New Note</Title>

            <WorkspaceWrapper ref={wrapperRef}>
              <WorkspaceChip
                $clickable={isMultiWorkspace}
                onClick={() => setWsPickerOpen((o) => !o)}
                title={activeWorkspace?.name ?? undefined}
              >
                <WorkspaceChipName>{activeWorkspace?.name ?? '—'}</WorkspaceChipName>
                {isMultiWorkspace && <span>▾</span>}
              </WorkspaceChip>

              {wsPickerOpen && (
                <WorkspaceDropdown>
                  {workspaces.map((ws) => (
                    <WorkspaceOption
                      key={ws.id}
                      $active={ws.id === activeWorkspaceId}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                    >
                      {ws.name}
                    </WorkspaceOption>
                  ))}
                </WorkspaceDropdown>
              )}
            </WorkspaceWrapper>

            <CloseBtn onClick={() => { if (!saving) window.close() }}>×</CloseBtn>
          </Header>

          <PersonSelector
            people={people}
            value={selectedPerson}
            onChange={setSelectedPerson}
            autoFocus
          />

          <SentimentPicker value={sentiment} onChange={setSentiment} />

          <StyledTextArea
            placeholder="What happened…"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={4}
          />

          <Footer>
            <Hint>{saved ? '✓ Saved' : '⌘↵ to save · Esc to close'}</Hint>
            <FooterActions>
              <CharCount $warn={note.length > NOTE_MAX_LENGTH * 0.9}>
                {note.length.toLocaleString()}/{NOTE_MAX_LENGTH.toLocaleString()}
              </CharCount>
              <Button
                $size="sm"
                onClick={handleSave}
                disabled={!selectedPerson || !note.trim() || saving}
              >
                {saved ? 'Saved ✓' : 'Save'}
              </Button>
            </FooterActions>
          </Footer>
        </CardInner>
      </Card>
    </>
  )
}
