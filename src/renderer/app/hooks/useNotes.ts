import { useState, useEffect, useRef, useCallback } from 'react'
import type { Note, Sentiment } from '@shared/types'

const PAGE_SIZE = 100

export function useNotes(workspaceId: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [total, setTotal] = useState(0)
  const [countByPerson, setCountByPerson] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // Tracks how many rows have actually been fetched from the DB.
  // Kept independent of notes.length so optimistic add/remove mutations
  // don't shift the offset for the next loadMore call.
  const dbOffsetRef = useRef(0)
  // Mirror of current notes state accessible without closure capture,
  // so removeNote can look up personId without listing notes in its dep array.
  const notesRef = useRef<Note[]>([])

  // Eagerly clear stale data when workspace changes so the UI shows a loading
  // state immediately instead of holding the previous workspace's notes.
  // Runs only on workspaceId change, not on onUpdated calls.
  useEffect(() => {
    setNotes([])
    notesRef.current = []
    setTotal(0)
    setCountByPerson({})
    dbOffsetRef.current = 0
    setLoading(true)
  }, [workspaceId])

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setNotes([])
      notesRef.current = []
      setTotal(0)
      setCountByPerson({})
      dbOffsetRef.current = 0
      setLoading(false)
      return
    }
    const [list, count, byPerson] = await Promise.all([
      window.api.notes.list(workspaceId, 0, PAGE_SIZE),
      window.api.notes.count(workspaceId),
      window.api.notes.countByPerson(workspaceId),
    ])
    setNotes(list)
    notesRef.current = list
    setTotal(count)
    setCountByPerson(byPerson)
    dbOffsetRef.current = list.length
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => window.api.notes.onUpdated(refresh), [refresh])

  const loadMore = useCallback(async () => {
    if (!workspaceId) return
    const nextPage = await window.api.notes.list(workspaceId, dbOffsetRef.current, PAGE_SIZE)
    setNotes((prev) => {
      const next = [...prev, ...nextPage]
      notesRef.current = next
      return next
    })
    dbOffsetRef.current += nextPage.length
  }, [workspaceId])

  const addNote = useCallback(
    async (payload: { personId: string; sentiment: Sentiment; note: string }) => {
      const n = await window.api.notes.add(payload)
      setNotes((prev) => {
        const next = [n, ...prev]
        notesRef.current = next
        return next
      })
      setTotal((t) => t + 1)
      setCountByPerson((prev) => ({ ...prev, [n.personId]: (prev[n.personId] ?? 0) + 1 }))
      return n
    },
    []
  )

  const removeNote = useCallback(async (id: string) => {
    // Read personId before the async gap — the note exists until we delete it.
    // Reading from notesRef avoids both stale-closure and dep-array issues.
    const removed = notesRef.current.find((n) => n.id === id)
    await window.api.notes.remove(id)
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id)
      notesRef.current = next
      return next
    })
    if (removed) {
      setTotal((t) => t - 1)
      setCountByPerson((c) => ({
        ...c,
        [removed.personId]: Math.max(0, (c[removed.personId] ?? 1) - 1),
      }))
    }
  }, [])

  const hasMore = notes.length < total

  return { notes, loading, hasMore, loadMore, total, countByPerson, addNote, removeNote, refresh }
}
