import { useState, useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'
import type { Note, Person, Sentiment, Attachment } from '@shared/types'
import { NOTE_MAX_LENGTH, MAX_ATTACHMENTS_PER_NOTE } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { Button } from '../../atoms/Button'
import { TextArea } from '../../atoms/TextArea'
import { PersonSelector } from '../../molecules/PersonSelector'
import { SentimentPicker, PersonSentimentRow } from '../../molecules/SentimentPicker'
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
  gap: ${({ theme }) => theme.spacing['2']};
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
  flex: 1;
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

const ImageSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['2']};
`

const ThumbnailRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1.5']};
  flex-wrap: wrap;
`

const ThumbWrap = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
`

const Thumb = styled.img`
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`

const RemoveThumb = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.danger};
  color: white;
  border: none;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const AddImageBtn = styled.button`
  background: none;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.size.xs};
  padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2']};
  transition: color 0.12s, border-color 0.12s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.strong ?? theme.colors.border.default};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

interface StagedImage {
  path: string
  src: string
}

interface ExistingAttachment extends Attachment {
  src: string
}

export function AddNoteModal({ people, onClose, initialNote, initialPerson }: Props) {
  const isEditing = !!initialNote
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sentiment, setSentiment] = useState<Sentiment>(initialNote?.sentiment ?? 'neutral')
  const [note, setNote] = useState(initialNote?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Image state
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([])
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    }
  }, [])

  // In edit mode, load existing attachments with resolved paths
  useEffect(() => {
    if (!isEditing || !initialNote) return
    async function load() {
      const atts = await window.api.attachments.list(initialNote!.id)
      const resolved: ExistingAttachment[] = []
      for (const att of atts) {
        const p = await window.api.attachments.getPath(att.id)
        if (p) resolved.push({ ...att, src: `attachment://${p}` })
      }
      setExistingAttachments(resolved)
    }
    load()
  }, [isEditing, initialNote])

  const totalImageCount = existingAttachments.length + stagedImages.length

  const handlePickImages = useCallback(async () => {
    const paths = await window.api.attachments.pick()
    if (!paths) return
    const available = MAX_ATTACHMENTS_PER_NOTE - totalImageCount
    const toAdd = paths.slice(0, available)
    const newStaged: StagedImage[] = toAdd.map((p) => ({ path: p, src: `attachment://${p}` }))
    setStagedImages((prev) => [...prev, ...newStaged])
  }, [totalImageCount])

  const handleRemoveStaged = useCallback((index: number) => {
    setStagedImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleRemoveExisting = useCallback(async (id: string) => {
    await window.api.attachments.remove(id)
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    if (!isEditing && !selectedPerson) return
    const trimmedNote = note.trim()
    if (!trimmedNote) return
    setSaving(true)
    setSaveError(null)
    try {
      let noteId: string
      if (isEditing && initialNote) {
        await window.api.notes.update(initialNote.id, { sentiment, note: trimmedNote })
        noteId = initialNote.id
      } else if (selectedPerson) {
        const created = await window.api.notes.add({ personId: selectedPerson.id, sentiment, note: trimmedNote })
        noteId = created.id
      } else {
        return
      }
      // Attach staged images sequentially
      for (const img of stagedImages) {
        try {
          await window.api.attachments.add(noteId, img.path)
        } catch { /* skip failed attachment — note is saved */ }
      }
      setSaved(true)
      closeTimerRef.current = setTimeout(onClose, 600)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save.')
      setSaving(false)
    }
  }, [isEditing, initialNote, selectedPerson, sentiment, note, saving, stagedImages, onClose])

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
          <PersonSentimentRow>
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
            <SentimentPicker value={sentiment} onChange={setSentiment} compact />
          </PersonSentimentRow>

          <TextArea
            placeholder="What happened…"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={5}
            autoFocus={isEditing}
          />

          <ImageSection>
            {(existingAttachments.length > 0 || stagedImages.length > 0) && (
              <ThumbnailRow>
                {existingAttachments.map((att) => (
                  <ThumbWrap key={att.id}>
                    <Thumb src={att.src} alt={att.filename} title={att.filename} />
                    <RemoveThumb onClick={() => handleRemoveExisting(att.id)} title="Remove">×</RemoveThumb>
                  </ThumbWrap>
                ))}
                {stagedImages.map((img, i) => (
                  <ThumbWrap key={img.path + i}>
                    <Thumb src={img.src} alt="staged" />
                    <RemoveThumb onClick={() => handleRemoveStaged(i)} title="Remove">×</RemoveThumb>
                  </ThumbWrap>
                ))}
              </ThumbnailRow>
            )}
            <div>
              <AddImageBtn
                type="button"
                onClick={handlePickImages}
                disabled={totalImageCount >= MAX_ATTACHMENTS_PER_NOTE}
                title={totalImageCount >= MAX_ATTACHMENTS_PER_NOTE ? `Maximum ${MAX_ATTACHMENTS_PER_NOTE} images per note` : 'Add images'}
              >
                + Add image{totalImageCount > 0 ? ` (${totalImageCount}/${MAX_ATTACHMENTS_PER_NOTE})` : ''}
              </AddImageBtn>
            </div>
          </ImageSection>
        </Body>

        <Divider />

        <Footer>
          {saveError
            ? <SaveError>{saveError}</SaveError>
            : <CharCount $warn={note.length > NOTE_MAX_LENGTH * 0.9}>
                {note.length > 0 && `${note.length.toLocaleString()}/${NOTE_MAX_LENGTH.toLocaleString()}`}
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
