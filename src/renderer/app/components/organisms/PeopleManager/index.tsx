import { useState } from 'react'
import styled from 'styled-components'
import type { Person } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'

interface Props {
  people: Person[]
  noteCountById: Record<string, number>
  onAdd: (name: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

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

export function PeopleManager({ people, noteCountById, onAdd, onRemove }: Props) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
              <PersonRow key={p.id}>
                <Avatar name={p.name} size={32} />
                <PersonName>{p.name}</PersonName>
                <NoteCount>{noteCountById[p.id] ?? 0} notes</NoteCount>
                <Button
                  $variant="danger"
                  $size="sm"
                  onClick={() => onRemove(p.id)}
                >
                  Remove
                </Button>
              </PersonRow>
            ))}
          </List>
        )}
      </div>
    </Wrapper>
  )
}
