import { useRef, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'
import type { Note, Person } from '@shared/types'
import { NoteCard } from '../../molecules/NoteCard'
import { LoadMore } from '../../molecules/LoadMore'
import { TimelineInsights } from '../../molecules/TimelineInsights'
import { groupByMonth } from '../../../utils/groupByMonth'

type VirtualRow =
  | { kind: 'insights' }
  | { kind: 'header'; label: string; isFirst: boolean }
  | { kind: 'note'; note: Note }

interface Props {
  notes: Note[]
  peopleById: Record<string, Person>
  onDelete: (id: string) => void
  onEdit?: (note: Note) => void
  onExpand?: (note: Note) => void
  searchQuery?: string
  hasMore?: boolean
  onLoadMore?: () => Promise<void>
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
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

const VirtualMonthLabel = styled.h3<{ $isFirst: boolean }>`
  margin: 0;
  padding: ${({ $isFirst }) => ($isFirst ? '0' : '32px')} 0 8px;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const VirtualNoteWrapper = styled.div`
  padding-bottom: ${({ theme }) => theme.spacing['2']};
`

export function Timeline({ notes, peopleById, onDelete, onEdit, onExpand, searchQuery = '', hasMore, onLoadMore }: Props) {
  const [loadingMore, setLoadingMore] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return
    setLoadingMore(true)
    await onLoadMore()
    setLoadingMore(false)
  }

  const groups = useMemo(() => groupByMonth(notes), [notes])

  const rows = useMemo<VirtualRow[]>(() => {
    const result: VirtualRow[] = []
    if (!searchQuery) result.push({ kind: 'insights' })
    groups.forEach((g, i) => {
      result.push({ kind: 'header', label: g.label, isFirst: i === 0 })
      g.notes.forEach((note) => result.push({ kind: 'note', note }))
    })
    return result
  }, [groups, searchQuery])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => wrapperRef.current,
    estimateSize: (i) => {
      const row = rows[i]
      if (row.kind === 'insights') return 72
      if (row.kind === 'header') return 56
      return 120
    },
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  })

  if (notes.length === 0) {
    return (
      <Wrapper>
        <Empty>
          <span style={{ fontSize: 32 }}>{searchQuery ? '🔍' : '📋'}</span>
          {searchQuery
            ? <>No notes match <strong>"{searchQuery}"</strong></>
            : <>No notes yet. Press <strong>Ctrl+Cmd+⌥+Space</strong> to add one.</>
          }
        </Empty>
      </Wrapper>
    )
  }

  return (
    <Wrapper ref={wrapperRef}>
      <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index]
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {row.kind === 'insights' && (
                <TimelineInsights notes={notes} hasMore={hasMore} />
              )}
              {row.kind === 'header' && (
                <VirtualMonthLabel $isFirst={row.isFirst}>
                  {row.label}
                </VirtualMonthLabel>
              )}
              {row.kind === 'note' && (() => {
                const person = peopleById[row.note.personId]
                if (!person) return null
                return (
                  <VirtualNoteWrapper>
                    <NoteCard
                      note={row.note}
                      person={person}
                      showPerson
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onExpand={onExpand}
                      highlight={searchQuery}
                    />
                  </VirtualNoteWrapper>
                )
              })()}
            </div>
          )
        })}
      </div>
      {hasMore && <LoadMore loading={loadingMore} onClick={handleLoadMore} />}
    </Wrapper>
  )
}
