import { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import type { Person } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'

interface Props {
  people: Person[]
  noteCountById: Record<string, number>
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['6']};
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

// ─── Component ───────────────────────────────────────────────────────────────

export function PeopleManager({ people, noteCountById, onAdd, onRename, onRemove }: Props) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renaming, setRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

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
                        <Button $variant="danger" $size="sm" onClick={() => onRemove(p.id)}>
                          Remove
                        </Button>
                      </>
                    )}
                  </Actions>
                </PersonRow>
                {renamingId === p.id && renameError && (
                  <RenameError>{renameError}</RenameError>
                )}
              </div>
            ))}
          </List>
        )}
      </div>
    </Wrapper>
  )
}
