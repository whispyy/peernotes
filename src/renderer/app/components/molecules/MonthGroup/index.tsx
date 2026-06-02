import styled from 'styled-components'
import type { Note, Person } from '@shared/types'
import { NoteCard } from '../NoteCard'

interface Props {
  label: string
  notes: Note[]
  peopleById: Record<string, Person>
  showPerson?: boolean
  onDelete?: (id: string) => void
  onEdit?: (note: Note) => void
  onExpand?: (note: Note) => void
  highlight?: string
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['2']};
  padding-bottom: ${({ theme }) => theme.spacing['8']};
`

const Label = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing['2']};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.bg.primary};
  padding: ${({ theme }) => theme.spacing['6']} 0 ${({ theme }) => theme.spacing['2']};
`

export function MonthGroup({ label, notes, peopleById, showPerson, onDelete, onEdit, onExpand, highlight }: Props) {
  return (
    <Wrapper>
      <Label>{label}</Label>
      {notes.map((note) => {
        const person = peopleById[note.personId]
        if (!person) return null
        return (
          <NoteCard
            key={note.id}
            note={note}
            person={person}
            showPerson={showPerson}
            onDelete={onDelete}
            onEdit={onEdit}
            onExpand={onExpand}
            highlight={highlight}
          />
        )
      })}
    </Wrapper>
  )
}
