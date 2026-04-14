import { useState, useEffect, useCallback } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import type { Person, Sentiment } from '@shared/types'
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
`

const Title = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  -webkit-app-region: no-drag;
  user-select: none;
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

const Hint = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  user-select: none;
`

const CharCount = styled.span<{ $warn: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ $warn, theme }) => ($warn ? theme.colors.danger : theme.colors.text.muted)};
`

export function QuickEntryApp() {
  const [people, setPeople] = useState<Person[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sentiment, setSentiment] = useState<Sentiment>('positive')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.people.list().then(setPeople)
  }, [])

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
    if (e.key === 'Escape') window.close()
  }

  return (
    <>
      <GlobalStyle />
      <Card onKeyDown={handleKeyDown}>
        <DragHint />
        <CardInner>
          <Header>
            <Title>New Note</Title>
            <CloseBtn onClick={() => window.close()}>×</CloseBtn>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CharCount $warn={note.length > NOTE_MAX_LENGTH * 0.9}>
                {note.length}/{NOTE_MAX_LENGTH}
              </CharCount>
              <Button
                $size="sm"
                onClick={handleSave}
                disabled={!selectedPerson || !note.trim() || saving}
              >
                {saved ? 'Saved ✓' : 'Save'}
              </Button>
            </div>
          </Footer>
        </CardInner>
      </Card>
    </>
  )
}
