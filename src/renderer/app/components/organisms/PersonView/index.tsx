import { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import type { Note, Person } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { MonthGroup } from '../../molecules/MonthGroup'
import { groupByMonth } from '../../../utils/groupByMonth'

interface Props {
  people: Person[]
  notes: Note[]
  peopleById: Record<string, Person>
  onDelete: (id: string) => void
}

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: ${({ theme }) => theme.spacing['6']};
  height: 100%;
`

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1']};
`

const PersonRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2.5']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.bg.tertiary : 'transparent')};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }
`

const PersonName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`

const NoteCount = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.full};
`

const Feed = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['8']};
  overflow-y: auto;
`

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.base};
`

export function PersonView({ people, notes, peopleById, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Set initial selection when people list first loads
  useEffect(() => {
    if (selectedId === null && people.length > 0) setSelectedId(people[0].id)
  }, [people, selectedId])

  // Fall back to first person when the selected person is deleted
  useEffect(() => {
    if (selectedId !== null && !people.find((p) => p.id === selectedId)) {
      setSelectedId(people[0]?.id ?? null)
    }
  }, [people, selectedId])

  const noteCountByPerson = useMemo(
    () => Object.fromEntries(
      people.map((p) => [p.id, notes.filter((n) => n.personId === p.id).length])
    ),
    [people, notes]
  )

  const personNotes = notes.filter((n) => n.personId === selectedId)
  const groups = groupByMonth(personNotes)

  return (
    <Layout>
      <Sidebar>
        {people.map((p) => (
          <PersonRow key={p.id} $active={p.id === selectedId} onClick={() => setSelectedId(p.id)}>
            <Avatar name={p.name} size={28} />
            <PersonName>{p.name}</PersonName>
            <NoteCount>{noteCountByPerson[p.id] ?? 0}</NoteCount>
          </PersonRow>
        ))}
      </Sidebar>

      <Feed>
        {personNotes.length === 0 ? (
          <Empty>No notes for this person yet.</Empty>
        ) : (
          groups.map((g) => (
            <MonthGroup
              key={g.label}
              label={g.label}
              notes={g.notes}
              peopleById={peopleById}
              showPerson={false}
              onDelete={onDelete}
            />
          ))
        )}
      </Feed>
    </Layout>
  )
}
