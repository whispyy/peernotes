import { useCallback } from 'react'
import TurndownService from 'turndown'

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

export function useHtmlPaste(
  note: string,
  setNote: (v: string) => void,
  maxLength: number,
) {
  return useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html = e.clipboardData.getData('text/html')
      if (!html) return

      e.preventDefault()
      const md = td.turndown(html)
      const el = e.currentTarget
      const start = el.selectionStart ?? note.length
      const end = el.selectionEnd ?? note.length
      const next = (note.slice(0, start) + md + note.slice(end)).slice(0, maxLength)
      setNote(next)

      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = Math.min(start + md.length, maxLength)
      })
    },
    [note, setNote, maxLength],
  )
}
