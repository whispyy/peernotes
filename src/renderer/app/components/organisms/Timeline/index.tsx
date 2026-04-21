import { useState } from 'react'
import styled from 'styled-components'
import type { Note, Person } from '@shared/types'
import { MonthGroup } from '../../molecules/MonthGroup'
import { groupByMonth } from '../../../utils/groupByMonth'

interface Props {
  notes: Note[]
  peopleById: Record<string, Person>
  onDelete: (id: string) => void
  searchQuery?: string
  hasMore?: boolean
  onLoadMore?: () => Promise<void>
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

const LoadMoreRow = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing['4']} 0;
`

const LoadMoreBtn = styled.button`
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['5']};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.muted};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  cursor: pointer;
  transition: all 0.1s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled { opacity: 0.5; cursor: default; }
`

export function Timeline({ notes, peopleById, onDelete, searchQuery = '', hasMore, onLoadMore }: Props) {
  const [loadingMore, setLoadingMore] = useState(false)

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return
    setLoadingMore(true)
    await onLoadMore()
    setLoadingMore(false)
  }

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
      {hasMore && (
        <LoadMoreRow>
          <LoadMoreBtn onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </LoadMoreBtn>
        </LoadMoreRow>
      )}
    </Wrapper>
  )
}
