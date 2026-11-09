import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import styled from 'styled-components'
import { NOTE_MAX_LENGTH } from '@shared/types'
import { TextArea, textAreaMetrics } from '../../atoms/TextArea'
import { FindReplaceBar } from '../../molecules/FindReplaceBar'
import { useFindReplace, type TextMatch } from '../../../hooks/useFindReplace'
import { useHtmlPaste } from '../../../hooks/useHtmlPaste'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  autoFocus?: boolean
  className?: string
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1.5']};
  min-height: 0;
`

const Field = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`

const Editor = styled(TextArea)`
  flex: 1;
  /* Reserved even without overflow so the highlight layer wraps lines at the same width. */
  scrollbar-gutter: stable;
`

const Highlights = styled.div`
  ${textAreaMetrics}
  position: absolute;
  inset: 0;
  overflow: hidden;
  scrollbar-gutter: stable;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  color: transparent;
  pointer-events: none;
`

const Mark = styled.mark<{ $current: boolean }>`
  color: transparent;
  background: ${({ $current, theme }) => `${theme.colors.accent}${$current ? '80' : '33'}`};
  border-radius: 2px;
`

function isShortcut(e: globalThis.KeyboardEvent, letter: string): boolean {
  if (!(e.metaKey || e.ctrlKey)) return false
  // With Option held, macOS puts a symbol in e.key (ƒ for F), so match the physical key instead.
  return e.key.toLowerCase() === letter || (e.altKey && e.code === `Key${letter.toUpperCase()}`)
}

function renderHighlights(
  text: string,
  matches: TextMatch[],
  currentIndex: number,
  currentRef: RefObject<HTMLElement>,
): ReactNode[] {
  const parts: ReactNode[] = []
  let last = 0
  matches.forEach((m, i) => {
    parts.push(text.slice(last, m.start))
    parts.push(
      <Mark key={m.start} $current={i === currentIndex} ref={i === currentIndex ? currentRef : undefined}>
        {text.slice(m.start, m.end)}
      </Mark>,
    )
    last = m.end
  })
  // The trailing space gives a final empty line height, as the textarea does.
  parts.push(text.slice(last) + ' ')
  return parts
}

export function NoteEditor({ value, onChange, placeholder, rows, autoFocus, className }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightsRef = useRef<HTMLDivElement>(null)
  const currentMarkRef = useRef<HTMLElement>(null)
  const findInputRef = useRef<HTMLInputElement>(null)
  const [focusFindSeq, setFocusFindSeq] = useState(0)

  const handlePaste = useHtmlPaste(value, onChange, NOTE_MAX_LENGTH)
  const find = useFindReplace(textareaRef, value, NOTE_MAX_LENGTH)

  const syncScroll = () => {
    if (highlightsRef.current && textareaRef.current) {
      highlightsRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  useLayoutEffect(syncScroll)

  useLayoutEffect(() => {
    const el = textareaRef.current
    const mark = currentMarkRef.current
    if (!el || !mark) return
    const top = mark.offsetTop
    if (top < el.scrollTop || top + mark.offsetHeight > el.scrollTop + el.clientHeight) {
      el.scrollTop = top - el.clientHeight / 3
      syncScroll()
    }
  }, [find.revealSeq])

  useEffect(() => {
    if (focusFindSeq === 0) return
    findInputRef.current?.focus()
    findInputRef.current?.select()
  }, [focusFindSeq])

  useEffect(() => {
    const handleShortcut = (e: globalThis.KeyboardEvent) => {
      if (isShortcut(e, 'f')) {
        e.preventDefault()
        find.open(e.altKey)
        setFocusFindSeq((s) => s + 1)
      } else if (find.isOpen && isShortcut(e, 'g')) {
        e.preventDefault()
        if (e.shiftKey) find.prev()
        else find.next()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !find.isOpen) return
    e.preventDefault()
    e.stopPropagation()
    find.close()
  }

  return (
    <Root className={className} onKeyDown={handleKeyDown}>
      {find.isOpen && <FindReplaceBar find={find} findInputRef={findInputRef} />}
      <Field>
        <Editor
          ref={textareaRef}
          value={value}
          placeholder={placeholder}
          rows={rows}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value.slice(0, NOTE_MAX_LENGTH))}
          onPaste={handlePaste}
          onScroll={syncScroll}
        />
        {find.matches.length > 0 && (
          <Highlights ref={highlightsRef} aria-hidden>
            {renderHighlights(value, find.matches, find.currentIndex, currentMarkRef)}
          </Highlights>
        )}
      </Field>
    </Root>
  )
}
