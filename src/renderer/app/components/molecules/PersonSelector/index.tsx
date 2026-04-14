import { useState, useRef, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import type { Person } from '@shared/types'
import { Avatar } from '../../atoms/Avatar'
import { Input } from '../../atoms/Input'

interface Props {
  people: Person[]
  value: Person | null
  onChange: (p: Person) => void
  autoFocus?: boolean
}

const Wrapper = styled.div`
  position: relative;
`

const SearchInput = styled(Input)`
  padding-left: 36px;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 14px;
  pointer-events: none;
`

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => theme.spacing['1']} 0;
  z-index: 100;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
`

const DropdownItem = styled.li<{ $highlighted: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2.5']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ $highlighted, theme }) =>
    $highlighted ? theme.colors.bg.tertiary : 'transparent'};
  transition: background 0.08s ease;

  &:hover { background: ${({ theme }) => theme.colors.bg.tertiary}; }
`

const EmptyState = styled.li`
  padding: ${({ theme }) => theme.spacing['3']};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.size.sm};
  text-align: center;
`

export function PersonSelector({ people, value, onChange, autoFocus }: Props) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    setCursor(0)
  }, [query])

  const select = useCallback(
    (p: Person) => {
      onChange(p)
      setQuery(p.name)
      setOpen(false)
    },
    [onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[cursor]) select(filtered[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[cursor] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  return (
    <Wrapper>
      <SearchIcon>⌕</SearchIcon>
      <SearchInput
        ref={inputRef}
        value={query}
        placeholder="Search person…"
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <Dropdown ref={listRef}>
          {filtered.length === 0 ? (
            <EmptyState>No match</EmptyState>
          ) : (
            filtered.map((p, i) => (
              <DropdownItem
                key={p.id}
                $highlighted={i === cursor}
                onMouseDown={() => select(p)}
                onMouseEnter={() => setCursor(i)}
              >
                <Avatar name={p.name} size={24} />
                {p.name}
              </DropdownItem>
            ))
          )}
        </Dropdown>
      )}
    </Wrapper>
  )
}
