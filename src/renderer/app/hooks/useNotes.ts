import { useState, useEffect, useCallback } from 'react'
import type { Note, Sentiment } from '@shared/types'

export function useNotes(workspaceId: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!workspaceId) { setNotes([]); setLoading(false); return }
    const list = await window.api.notes.list(workspaceId)
    setNotes(list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)))
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { refresh() }, [refresh])

  // Refresh whenever the quick-entry window saves a note
  useEffect(() => window.api.notes.onUpdated(refresh), [refresh])

  const addNote = useCallback(
    async (payload: { personId: string; sentiment: Sentiment; note: string }) => {
      const n = await window.api.notes.add(payload)
      setNotes((prev) => [n, ...prev])
      return n
    },
    []
  )

  const removeNote = useCallback(async (id: string) => {
    await window.api.notes.remove(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return { notes, loading, addNote, removeNote, refresh }
}
