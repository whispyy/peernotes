import { useState, useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'
import type { Person, Sentiment } from '@shared/types'
import { NOTE_MAX_LENGTH } from '@shared/types'
import { Button } from '../../atoms/Button'
import { TextArea } from '../../atoms/TextArea'
import { PersonSelector } from '../../molecules/PersonSelector'
import { SentimentPicker } from '../../molecules/SentimentPicker'
import {
  ModalBackdrop, Card, Header, Title, CloseBtn,
  Divider, Footer
} from '../../molecules/ModalShell'

interface Props {
  people: Person[]
  onClose: () => void
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['3']};
`

const CharCount = styled.span<{ $warn: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ $warn, theme }) => ($warn ? theme.colors.danger : theme.colors.text.muted)};
  margin-right: auto;
`

export function AddNoteModal({ people, onClose }: Props) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sentiment, setSentiment] = useState<Sentiment>('positive')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cancel the auto-close timer if the modal is dismissed manually
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedPerson || !note.trim() || saving) return
    setSaving(true)
    try {
      await window.api.notes.add({ personId: selectedPerson.id, sentiment, note: note.trim() })
      setSaved(true)
      closeTimerRef.current = setTimeout(onClose, 600)
    } catch {
      setSaving(false)
    }
  }, [selectedPerson, sentiment, note, saving, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
  }

  const canSave = !!selectedPerson && !!note.trim() && !saving

  return (
    <ModalBackdrop onClose={onClose} onKeyDown={handleKeyDown}>
      <Card>
        <Header>
          <Title>New Note</Title>
          <CloseBtn onClick={onClose} aria-label="Close">×</CloseBtn>
        </Header>

        <Body>
          <PersonSelector
            people={people}
            value={selectedPerson}
            onChange={setSelectedPerson}
            autoFocus
          />

          <SentimentPicker value={sentiment} onChange={setSentiment} />

          <TextArea
            placeholder="What happened…"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={4}
          />
        </Body>

        <Divider />

        <Footer>
          <CharCount $warn={note.length > NOTE_MAX_LENGTH * 0.9}>
            {note.length > 0 && `${note.length}/${NOTE_MAX_LENGTH}`}
          </CharCount>
          <Button $variant="ghost" $size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button $size="sm" onClick={handleSave} disabled={!canSave}>
            {saved ? 'Saved ✓' : '⌘↵ Save'}
          </Button>
        </Footer>
      </Card>
    </ModalBackdrop>
  )
}
