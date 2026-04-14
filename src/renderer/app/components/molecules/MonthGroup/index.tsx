import styled from 'styled-components'
import type { Note, Person } from '@shared/types'
import { NoteCard } from '../NoteCard'

interface Props {
  label: string
  notes: Note[]
  peopleById: Record<string, Person>
  showPerson?: boolean
  onDelete?: (id: string) => void
  highlight?: string
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['2']};
`

const Label = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing['2']};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

export function MonthGroup({ label, notes, peopleById, showPerson, onDelete, highlight }: Props) {
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
            highlight={highlight}
          />
        )
      })}
    </Wrapper>
  )
}
