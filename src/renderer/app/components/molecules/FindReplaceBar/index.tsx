import { useRef, type KeyboardEvent, type RefObject } from 'react'
import styled from 'styled-components'
import { Input } from '../../atoms/Input'
import type { FindReplace } from '../../../hooks/useFindReplace'

interface Props {
  find: FindReplace
  findInputRef: RefObject<HTMLInputElement>
}

const Bar = styled.div`
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['1']};
  -webkit-app-region: no-drag;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['0.5']};
`

const BarInput = styled(Input)`
  min-width: 0;
  height: 26px;
  padding: 0 ${({ theme }) => theme.spacing['2']};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.typography.size.sm};
`

const Count = styled.span`
  min-width: 64px;
  padding: 0 ${({ theme }) => theme.spacing['1']};
  text-align: right;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.muted};
`

const BarButton = styled.button<{ $active?: boolean }>`
  flex-shrink: 0;
  min-width: 24px;
  height: 24px;
  padding: 0 ${({ theme }) => theme.spacing['1']};
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ $active, theme }) => ($active ? `${theme.colors.accent}33` : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  line-height: 1;
  cursor: pointer;
  transition: color 0.1s, background 0.1s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

function isPlainEnter(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && !e.metaKey && !e.ctrlKey
}

export function FindReplaceBar({ find, findInputRef }: Props) {
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const hasMatch = find.matches.length > 0
  const limitHint = `Would exceed the ${find.maxLength.toLocaleString()}-character limit`

  const count = !find.query
    ? ''
    : hasMatch
      ? `${find.currentIndex + 1} of ${find.matches.length}`
      : 'No results'

  const replace = () => {
    find.replace()
    replaceInputRef.current?.focus()
  }

  const replaceAll = () => {
    find.replaceAll()
    replaceInputRef.current?.focus()
  }

  const handleFindKeyDown = (e: KeyboardEvent) => {
    if (!isPlainEnter(e)) return
    e.preventDefault()
    if (e.shiftKey) find.prev()
    else find.next()
  }

  const handleReplaceKeyDown = (e: KeyboardEvent) => {
    if (!isPlainEnter(e)) return
    e.preventDefault()
    replace()
  }

  return (
    <Bar>
      <BarButton
        type="button"
        onClick={find.toggleReplace}
        aria-label="Toggle replace"
        aria-expanded={find.showReplace}
        title="Toggle replace (⌥⌘F)"
      >
        {find.showReplace ? '▾' : '▸'}
      </BarButton>
      <BarInput
        ref={findInputRef}
        value={find.query}
        placeholder="Find"
        spellCheck={false}
        onChange={(e) => find.setQuery(e.target.value)}
        onKeyDown={handleFindKeyDown}
      />
      <Actions>
        <Count>{count}</Count>
        <BarButton
          type="button"
          $active={find.matchCase}
          aria-pressed={find.matchCase}
          onClick={find.toggleMatchCase}
          title="Match case"
        >
          Aa
        </BarButton>
        <BarButton type="button" onClick={find.prev} disabled={!hasMatch} aria-label="Previous match" title="Previous match (⇧↵)">
          ↑
        </BarButton>
        <BarButton type="button" onClick={find.next} disabled={!hasMatch} aria-label="Next match" title="Next match (↵)">
          ↓
        </BarButton>
        <BarButton type="button" onClick={find.close} aria-label="Close find" title="Close (Esc)">
          ×
        </BarButton>
      </Actions>

      {find.showReplace && (
        <>
          <span />
          <BarInput
            ref={replaceInputRef}
            value={find.replacement}
            placeholder="Replace"
            spellCheck={false}
            onChange={(e) => find.setReplacement(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
          />
          <Actions>
            <BarButton
              type="button"
              onClick={replace}
              disabled={!hasMatch || find.replaceOverLimit}
              title={find.replaceOverLimit ? limitHint : 'Replace (↵)'}
            >
              Replace
            </BarButton>
            <BarButton
              type="button"
              onClick={replaceAll}
              disabled={!hasMatch || find.replaceAllOverLimit}
              title={find.replaceAllOverLimit ? limitHint : 'Replace all'}
            >
              All
            </BarButton>
          </Actions>
        </>
      )}
    </Bar>
  )
}
