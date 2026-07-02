import { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import type { Person } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'

interface Props {
  people: Person[]
  archivedPeople: Person[]
  noteCountById: Record<string, number>
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['6']};
  padding-top: ${({ theme }) => theme.spacing['6']};
`

const AddRow = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.spacing['2']};
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['2']};
`

const PersonRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['3']};
  padding: ${({ theme }) => theme.spacing['2.5']} ${({ theme }) => theme.spacing['3']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`

const PersonName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
`

const NoteCount = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1.5']};
  flex-shrink: 0;
`

const SectionTitle = styled.h2<{ $mb?: boolean }>`
  margin: 0;
  margin-bottom: ${({ $mb, theme }) => ($mb ? theme.spacing['3'] : '0')};
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

const Empty = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.base};
  padding: ${({ theme }) => theme.spacing['4']} 0;
`

const RenameError = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs ?? theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.danger};
  padding: 2px ${({ theme }) => theme.spacing['3']};
`

const ConfirmRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['3']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 0 0 ${({ theme }) => theme.radius.md} ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-top: none;
`

const ConfirmText = styled.span<{ $error?: boolean }>`
  flex: 1;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ $error, theme }) => $error ? theme.colors.danger : theme.colors.text.muted};
`

const ArchiveToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  margin-bottom: ${({ theme }) => theme.spacing['3']};
  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  font-size: 11px;
  transition: transform 0.12s ease;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
`

const ArchivedMeta = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

// ─── Component ───────────────────────────────────────────────────────────────

function formatArchivedDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PeopleManager({ people, archivedPeople, noteCountById, onAdd, onRename, onArchive, onRestore, onRemove }: Props) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renaming, setRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const handleRemove = async (id: string) => {
    setRemoving(true)
    setRemoveError('')
    try {
      await onRemove(id)
      setConfirmRemoveId(null)
    } catch {
      setRemoveError('Could not remove person. Please try again.')
    } finally {
      setRemoving(false)
    }
  }

  const handleArchive = async (id: string) => {
    setArchivingId(id)
    try {
      await onArchive(id)
    } finally {
      setArchivingId(null)
    }
  }

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      await onRestore(id)
    } finally {
      setRestoringId(null)
    }
  }

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await onAdd(trimmed)
      setName('')
    } finally {
      setSubmitting(false)
    }
  }

  const startRename = (p: Person) => {
    setRenamingId(p.id)
    setRenameValue(p.name)
    setRenameError('')
    setConfirmRemoveId(null)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
    setRenameError('')
  }

  const submitRename = async (id: string, originalName: string) => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === originalName) { cancelRename(); return }
    setRenaming(true)
    try {
      await onRename(id, trimmed)
      cancelRename()
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Could not rename')
    } finally {
      setRenaming(false)
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string, originalName: string) => {
    if (e.key === 'Enter') { e.preventDefault(); submitRename(id, originalName) }
    if (e.key === 'Escape') cancelRename()
  }

  return (
    <Wrapper>
      <div>
        <SectionTitle>Add person</SectionTitle>
      </div>
      <AddRow onSubmit={handleSubmit}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name…"
          autoFocus
        />
        <Button type="submit" disabled={!name.trim() || submitting}>
          Add
        </Button>
      </AddRow>

      <div>
        <SectionTitle $mb>Team</SectionTitle>
        {people.length === 0 ? (
          <Empty>No people added yet.</Empty>
        ) : (
          <List>
            {people.map((p) => (
              <div key={p.id}>
                <PersonRow>
                  <Avatar name={renamingId === p.id ? renameValue || p.name : p.name} size={32} />

                  {renamingId === p.id ? (
                    <Input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => { setRenameValue(e.target.value); setRenameError('') }}
                      onKeyDown={(e) => handleRenameKeyDown(e, p.id, p.name)}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <>
                      <PersonName>{p.name}</PersonName>
                      <NoteCount>{noteCountById[p.id] ?? 0} notes</NoteCount>
                    </>
                  )}

                  <Actions>
                    {renamingId === p.id ? (
                      <>
                        <Button
                          $size="sm"
                          onClick={() => submitRename(p.id, p.name)}
                          disabled={renaming || !renameValue.trim()}
                        >
                          Save
                        </Button>
                        <Button $variant="ghost" $size="sm" onClick={cancelRename} disabled={renaming}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button $variant="ghost" $size="sm" onClick={() => startRename(p)}>
                          Rename
                        </Button>
                        <Button
                          $variant="ghost"
                          $size="sm"
                          onClick={() => handleArchive(p.id)}
                          disabled={archivingId === p.id}
                        >
                          Archive
                        </Button>
                        <Button $variant="danger" $size="sm" onClick={() => setConfirmRemoveId(p.id)}>
                          Remove
                        </Button>
                      </>
                    )}
                  </Actions>
                </PersonRow>
                {renamingId === p.id && renameError && (
                  <RenameError>{renameError}</RenameError>
                )}
                {confirmRemoveId === p.id && (
                  <ConfirmRow>
                    <ConfirmText $error={!!removeError}>
                      {removeError || `Remove ${p.name} and all ${noteCountById[p.id] ?? 0} note${(noteCountById[p.id] ?? 0) !== 1 ? 's' : ''}? This cannot be undone.`}
                    </ConfirmText>
                    <Button $variant="danger" $size="sm" onClick={() => handleRemove(p.id)} disabled={removing}>
                      Confirm
                    </Button>
                    <Button $variant="ghost" $size="sm" onClick={() => { setConfirmRemoveId(null); setRemoveError('') }} disabled={removing}>
                      Cancel
                    </Button>
                  </ConfirmRow>
                )}
              </div>
            ))}
          </List>
        )}
      </div>

      {archivedPeople.length > 0 && (
        <div>
          <ArchiveToggle onClick={() => setShowArchived((s) => !s)}>
            <Chevron $open={showArchived}>▶</Chevron>
            Archived ({archivedPeople.length})
          </ArchiveToggle>
          {showArchived && (
            <List>
              {archivedPeople.map((p) => (
                <div key={p.id}>
                  <PersonRow>
                    <Avatar name={p.name} size={32} />
                    <PersonName>{p.name}</PersonName>
                    <ArchivedMeta>
                      {p.archivedAt ? `Archived ${formatArchivedDate(p.archivedAt)}` : 'Archived'}
                    </ArchivedMeta>
                    <Actions>
                      <Button
                        $size="sm"
                        onClick={() => handleRestore(p.id)}
                        disabled={restoringId === p.id}
                      >
                        Restore
                      </Button>
                      <Button $variant="danger" $size="sm" onClick={() => setConfirmRemoveId(p.id)}>
                        Remove
                      </Button>
                    </Actions>
                  </PersonRow>
                  {confirmRemoveId === p.id && (
                    <ConfirmRow>
                      <ConfirmText $error={!!removeError}>
                        {removeError || `Permanently delete ${p.name} and all their notes? This cannot be undone.`}
                      </ConfirmText>
                      <Button $variant="danger" $size="sm" onClick={() => handleRemove(p.id)} disabled={removing}>
                        Confirm
                      </Button>
                      <Button $variant="ghost" $size="sm" onClick={() => { setConfirmRemoveId(null); setRemoveError('') }} disabled={removing}>
                        Cancel
                      </Button>
                    </ConfirmRow>
                  )}
                </div>
              ))}
            </List>
          )}
        </div>
      )}
    </Wrapper>
  )
}
