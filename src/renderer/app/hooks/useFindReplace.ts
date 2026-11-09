import { useMemo, useState, type RefObject } from 'react'
import { escapeRegex } from '../utils/escapeRegex'

export interface TextMatch {
  start: number
  end: number
}

export type FindReplace = ReturnType<typeof useFindReplace>

function findMatches(text: string, query: string, matchCase: boolean): TextMatch[] {
  if (!query) return []
  const pattern = new RegExp(escapeRegex(query), matchCase ? 'g' : 'gi')
  const matches: TextMatch[] = []
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    matches.push({ start: m.index, end: m.index + m[0].length })
  }
  return matches
}

function replaceEach(text: string, matches: TextMatch[], replacement: string): string {
  let out = ''
  let last = 0
  for (const m of matches) {
    out += text.slice(last, m.start) + replacement
    last = m.end
  }
  return out + text.slice(last)
}

export function useFindReplace(
  textareaRef: RefObject<HTMLTextAreaElement>,
  value: string,
  maxLength: number,
) {
  const [isOpen, setIsOpen] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [query, setQueryText] = useState('')
  const [replacement, setReplacement] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [searchFrom, setSearchFrom] = useState(0)
  const [revealSeq, setRevealSeq] = useState(0)

  const matches = useMemo(
    () => (isOpen ? findMatches(value, query, matchCase) : []),
    [isOpen, value, query, matchCase],
  )
  const firstAfter = matches.findIndex((m) => m.start >= searchFrom)
  const currentIndex = matches.length === 0 ? -1 : firstAfter === -1 ? 0 : firstAfter
  const current = currentIndex >= 0 ? matches[currentIndex] : null

  const lengthAfterReplacing = (targets: TextMatch[]) =>
    targets.reduce((len, m) => len + replacement.length - (m.end - m.start), value.length)
  const replaceOverLimit = current !== null && lengthAfterReplacing([current]) > maxLength
  const replaceAllOverLimit = matches.length > 0 && lengthAfterReplacing(matches) > maxLength

  const reveal = () => setRevealSeq((s) => s + 1)

  const goTo = (index: number) => {
    if (matches.length === 0) return
    setSearchFrom(matches[(index + matches.length) % matches.length].start)
    reveal()
  }

  const edit = (start: number, end: number, text: string) => {
    const el = textareaRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(start, end)
    // execCommand keeps the edit on the textarea's native undo stack; assigning value would wipe it.
    document.execCommand(text ? 'insertText' : 'delete', false, text)
  }

  return {
    isOpen,
    showReplace,
    query,
    replacement,
    matchCase,
    matches,
    currentIndex,
    revealSeq,
    maxLength,
    replaceOverLimit,
    replaceAllOverLimit,

    open(withReplace: boolean) {
      const el = textareaRef.current
      if (el && document.activeElement === el) {
        const selected = el.value.slice(el.selectionStart, el.selectionEnd)
        if (selected && !selected.includes('\n')) setQueryText(selected)
        setSearchFrom(el.selectionStart)
      }
      if (withReplace) setShowReplace(true)
      setIsOpen(true)
      reveal()
    },

    close() {
      setIsOpen(false)
      const el = textareaRef.current
      if (!el) return
      el.focus()
      if (current) el.setSelectionRange(current.start, current.end)
    },

    toggleReplace: () => setShowReplace((s) => !s),
    setReplacement,

    setQuery(q: string) {
      setQueryText(q)
      reveal()
    },

    toggleMatchCase() {
      setMatchCase((c) => !c)
      reveal()
    },

    next: () => goTo(currentIndex + 1),
    prev: () => goTo(currentIndex - 1),

    replace() {
      if (!current || replaceOverLimit) return
      edit(current.start, current.end, replacement)
      setSearchFrom(current.start + replacement.length)
      reveal()
    },

    replaceAll() {
      if (matches.length === 0 || replaceAllOverLimit) return
      edit(0, value.length, replaceEach(value, matches, replacement))
      setSearchFrom(0)
      reveal()
    },
  }
}
