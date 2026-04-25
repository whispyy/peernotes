import { useState, useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'
import type { Note, Person, Sentiment } from '@shared/types'
import { NOTE_MAX_LENGTH } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
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
  initialNote?: Note
  initialPerson?: Person
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

const SaveError = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.danger};
  margin-right: auto;
`

const LockedPerson = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['2.5']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.md};
`

const LockedPersonName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`

export function AddNoteModal({ people, onClose, initialNote, initialPerson }: Props) {
  const isEditing = !!initialNote
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sentiment, setSentiment] = useState<Sentiment>(initialNote?.sentiment ?? 'positive')
  const [note, setNote] = useState(initialNote?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    if (!isEditing && !selectedPerson) return
    const trimmedNote = note.trim()
    if (!trimmedNote) return
    setSaving(true)
    setSaveError(null)
    try {
      if (isEditing && initialNote) {
        await window.api.notes.update(initialNote.id, { sentiment, note: trimmedNote })
      } else if (selectedPerson) {
        await window.api.notes.add({ personId: selectedPerson.id, sentiment, note: trimmedNote })
      }
      setSaved(true)
      closeTimerRef.current = setTimeout(onClose, 600)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save.')
      setSaving(false)
    }
  }, [isEditing, initialNote, selectedPerson, sentiment, note, saving, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
  }

  const canSave = !!note.trim() && !saving && (isEditing || !!selectedPerson)

  return (
    <ModalBackdrop onClose={onClose} onKeyDown={handleKeyDown}>
      <Card>
        <Header>
          <Title>{isEditing ? 'Edit Note' : 'New Note'}</Title>
          <CloseBtn onClick={onClose} aria-label="Close">×</CloseBtn>
        </Header>

        <Body>
          {isEditing && initialPerson ? (
            <LockedPerson>
              <Avatar name={initialPerson.name} size={24} />
              <LockedPersonName>{initialPerson.name}</LockedPersonName>
            </LockedPerson>
          ) : (
            <PersonSelector
              people={people}
              value={selectedPerson}
              onChange={setSelectedPerson}
              autoFocus
            />
          )}

          <SentimentPicker value={sentiment} onChange={setSentiment} />

          <TextArea
            placeholder="What happened…"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={4}
            autoFocus={isEditing}
          />
        </Body>

        <Divider />

        <Footer>
          {saveError
            ? <SaveError>{saveError}</SaveError>
            : <CharCount $warn={note.length > NOTE_MAX_LENGTH * 0.9}>
                {note.length > 0 && `${note.length}/${NOTE_MAX_LENGTH}`}
              </CharCount>
          }
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
