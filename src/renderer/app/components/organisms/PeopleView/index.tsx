import { useState, useEffect } from 'react'
import styled from 'styled-components'
import type { Note, Person } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { PersonFeed } from '../PersonFeed'
import { PeopleManager } from '../PeopleManager'

type Mode = 'notes' | 'manage'

interface Props {
  people: Person[]
  archivedPeople: Person[]
  workspaceId: string | null
  countByPerson: Record<string, number>
  peopleById: Record<string, Person>
  searchQuery: string
  isSearching: boolean
  onDelete: (id: string) => Promise<void>
  onAddNote: (payload: { personId: string; sentiment: 'positive' | 'neutral' | 'negative'; note: string }) => Promise<Note>
  onEdit?: (note: Note) => void
  onExpand?: (note: Note, list: Note[]) => void
  onAdd: (name: string) => Promise<unknown>
  onRename: (id: string, name: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: ${({ theme }) => theme.spacing['6']};
  height: 100%;
  padding-top: ${({ theme }) => theme.spacing['6']};
`

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1']};
  overflow-y: auto;
  min-height: 0;
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
  flex-shrink: 0;
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

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.subtle};
  margin: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  flex-shrink: 0;
`

const ManageIcon = styled.span`
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.muted};
  line-height: 1;
`

const RightPane = styled.div<{ $scroll: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: ${({ $scroll }) => ($scroll ? 'auto' : 'hidden')};
`

// ─── Component ───────────────────────────────────────────────────────────────

export function PeopleView({
  people,
  archivedPeople,
  workspaceId,
  countByPerson,
  peopleById,
  searchQuery,
  isSearching,
  onDelete,
  onAddNote,
  onEdit,
  onExpand,
  onAdd,
  onRename,
  onArchive,
  onRestore,
  onRemove,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('notes')

  // Set initial selection when people list first loads
  useEffect(() => {
    if (selectedId === null && people.length > 0) setSelectedId(people[0].id)
  }, [people, selectedId])

  // Fall back to first person when the selected person is archived or deleted
  useEffect(() => {
    if (selectedId !== null && !people.find((p) => p.id === selectedId)) {
      setSelectedId(people[0]?.id ?? null)
    }
  }, [people, selectedId])

  // Nothing to show a feed for — adding someone is the only useful action
  useEffect(() => {
    if (people.length === 0) setMode('manage')
  }, [people])

  // Searching from the title bar only affects the feed, so surface it
  useEffect(() => {
    if (isSearching) setMode('notes')
  }, [isSearching])

  const selectPerson = (id: string) => {
    setSelectedId(id)
    setMode('notes')
  }

  return (
    <Layout>
      <Sidebar>
        {people.map((p) => (
          <PersonRow
            key={p.id}
            $active={mode === 'notes' && p.id === selectedId}
            onClick={() => selectPerson(p.id)}
          >
            <Avatar name={p.name} size={28} />
            <PersonName>{p.name}</PersonName>
            <NoteCount>{countByPerson[p.id] ?? 0}</NoteCount>
          </PersonRow>
        ))}

        {people.length > 0 && <Divider />}

        <PersonRow $active={mode === 'manage'} onClick={() => setMode('manage')}>
          <ManageIcon>⚙</ManageIcon>
          <PersonName>Manage team</PersonName>
          {archivedPeople.length > 0 && <NoteCount>{archivedPeople.length}</NoteCount>}
        </PersonRow>
      </Sidebar>

      <RightPane $scroll={mode === 'manage'}>
        {mode === 'manage' ? (
          <PeopleManager
            people={people}
            archivedPeople={archivedPeople}
            noteCountById={countByPerson}
            onAdd={onAdd}
            onRename={onRename}
            onArchive={onArchive}
            onRestore={onRestore}
            onRemove={onRemove}
          />
        ) : (
          <PersonFeed
            selectedId={selectedId}
            selectedPerson={people.find((p) => p.id === selectedId)}
            workspaceId={workspaceId}
            countByPerson={countByPerson}
            peopleById={peopleById}
            onDelete={onDelete}
            onAddNote={onAddNote}
            onEdit={onEdit}
            onExpand={onExpand}
            searchQuery={searchQuery}
            isSearching={isSearching}
          />
        )}
      </RightPane>
    </Layout>
  )
}
