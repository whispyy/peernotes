import styled from 'styled-components'
import type { Note, Person } from '@shared/types'
import { MonthGroup } from '../../molecules/MonthGroup'
import { groupByMonth } from '../../../utils/groupByMonth'

interface Props {
  notes: Note[]
  peopleById: Record<string, Person>
  onDelete: (id: string) => void
  searchQuery?: string
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['8']};
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing['12']};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.base};
  gap: ${({ theme }) => theme.spacing['2']};
`

export function Timeline({ notes, peopleById, onDelete, searchQuery = '' }: Props) {
  if (notes.length === 0) {
    return (
      <Empty>
        <span style={{ fontSize: 32 }}>{searchQuery ? '🔍' : '📋'}</span>
        {searchQuery
          ? <>No notes match <strong>"{searchQuery}"</strong></>
          : <>No notes yet. Press <strong>Ctrl+Cmd+⌥+Space</strong> to add one.</>
        }
      </Empty>
    )
  }

  const groups = groupByMonth(notes)

  return (
    <Wrapper>
      {groups.map((g) => (
        <MonthGroup
          key={g.label}
          label={g.label}
          notes={g.notes}
          peopleById={peopleById}
          showPerson
          onDelete={onDelete}
          highlight={searchQuery}
        />
      ))}
    </Wrapper>
  )
}
