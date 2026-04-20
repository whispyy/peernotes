import { useState, useMemo, useRef } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import { usePeople } from './hooks/usePeople'
import { useNotes } from './hooks/useNotes'
import { Timeline } from './components/organisms/Timeline'
import { PersonView } from './components/organisms/PersonView'
import { PeopleManager } from './components/organisms/PeopleManager'
import { Settings } from './components/organisms/Settings'
import { ExportModal } from './components/organisms/ExportModal'
import { ImportModal } from './components/organisms/ImportModal'
import { AddNoteModal } from './components/organisms/AddNoteModal'
import type { ThemeMode } from './hooks/useThemeMode'

type Tab = 'timeline' | 'person' | 'people' | 'settings'

interface Props {
  mode: ThemeMode
  setThemeMode: (m: ThemeMode) => void
}

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${({ theme }) => theme.colors.bg.primary};
    color: ${({ theme }) => theme.colors.text.primary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: ${({ theme }) => theme.typography.size.base};
    overflow: hidden;
    user-select: none;
  }
  p, textarea, input { user-select: text; }
`

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`

const TitleBar = styled.div`
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 ${({ theme }) => theme.spacing['6']};
  padding-left: 80px;
  -webkit-app-region: drag;
  flex-shrink: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  gap: ${({ theme }) => theme.spacing['2']};
`

const TabBar = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1']};
  flex: 1;
`

const Tab = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']};
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.bg.secondary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.weight.semibold : theme.typography.weight.regular};
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: all 0.1s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.secondary};
  }
`

const SearchWrapper = styled.div`
  position: relative;
  width: 180px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 13px;
  pointer-events: none;
  line-height: 1;
`

const SearchInput = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']};
  padding-left: 28px;
  padding-right: 24px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.12s ease;
  height: 28px;

  text-overflow: ellipsis;
  &::placeholder { color: ${({ theme }) => theme.colors.text.muted}; text-overflow: ellipsis; }
  &:focus { border-color: ${({ theme }) => theme.colors.border.focus}; }
`

const ClearBtn = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  display: flex;
  align-items: center;
  transition: color 0.1s;
  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`

const AddNoteBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['1.5']};
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']};
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ theme }) => theme.colors.accent};
  color: #fff;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: background 0.1s ease;
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 28px;

  &:hover { background: ${({ theme }) => theme.colors.accentHover}; }
  &:active { background: ${({ theme }) => theme.colors.accentActive}; }
`

const Content = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing['6']};
`

export function App({ mode, setThemeMode }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('timeline')
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { people, peopleById, addPerson, renamePerson, removePerson, refresh: refreshPeople } = usePeople()
  const { notes, addNote, removeNote, refresh: refreshNotes } = useNotes()

  const noteCountById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, notes.filter((n) => n.personId === p.id).length])),
    [people, notes]
  )

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => {
      const person = peopleById[n.personId]
      return n.note.toLowerCase().includes(q) || person?.name.toLowerCase().includes(q)
    })
  }, [notes, searchQuery, peopleById])

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchQuery('')
      searchRef.current?.blur()
    }
  }

  const showSearch = activeTab !== 'settings'

  return (
    <>
      <GlobalStyle />
      <Shell>
        <TitleBar>
          <TabBar>
            <Tab $active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')}>
              Timeline
            </Tab>
            <Tab $active={activeTab === 'person'} onClick={() => setActiveTab('person')}>
              By Person
            </Tab>
            <Tab $active={activeTab === 'people'} onClick={() => setActiveTab('people')}>
              Team
            </Tab>
            <Tab $active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
              Settings
            </Tab>
          </TabBar>

          {showSearch && (
            <SearchWrapper>
              <SearchIcon>⌕</SearchIcon>
              <SearchInput
                ref={searchRef}
                value={searchQuery}
                placeholder="Search notes…"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKey}
              />
              {searchQuery && (
                <ClearBtn onClick={() => setSearchQuery('')} tabIndex={-1}>×</ClearBtn>
              )}
            </SearchWrapper>
          )}

          <AddNoteBtn onClick={() => setAddNoteOpen(true)}>
            + Note
          </AddNoteBtn>
        </TitleBar>

        <Content>
          {activeTab === 'timeline' && (
            <Timeline notes={filteredNotes} peopleById={peopleById} onDelete={removeNote} searchQuery={searchQuery} />
          )}
          {activeTab === 'person' && (
            <PersonView
              people={people}
              notes={filteredNotes}
              peopleById={peopleById}
              onDelete={removeNote}
              onAddNote={addNote}
            />
          )}
          {activeTab === 'people' && (
            <PeopleManager
              people={people}
              noteCountById={noteCountById}
              onAdd={addPerson}
              onRename={renamePerson}
              onRemove={removePerson}
            />
          )}
          {activeTab === 'settings' && (
            <Settings
              mode={mode}
              setThemeMode={setThemeMode}
              onExport={() => setExportOpen(true)}
              onImport={() => setImportOpen(true)}
              onReset={() => { refreshPeople(); refreshNotes() }}
            />
          )}
        </Content>
      </Shell>

      {addNoteOpen && (
        <AddNoteModal people={people} onClose={() => setAddNoteOpen(false)} />
      )}
      {exportOpen && (
        <ExportModal notes={notes} onClose={() => setExportOpen(false)} />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={refreshPeople}
        />
      )}
    </>
  )
}
