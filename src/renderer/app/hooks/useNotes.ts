import { useState, useEffect, useCallback } from 'react'
import type { Note, Sentiment } from '@shared/types'

const PAGE_SIZE = 100

export function useNotes(workspaceId: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [total, setTotal] = useState(0)
  const [countByPerson, setCountByPerson] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setNotes([])
      setTotal(0)
      setCountByPerson({})
      setLoading(false)
      return
    }
    const [list, count, byPerson] = await Promise.all([
      window.api.notes.list(workspaceId, 0, PAGE_SIZE),
      window.api.notes.count(workspaceId),
      window.api.notes.countByPerson(workspaceId),
    ])
    setNotes(list)
    setTotal(count)
    setCountByPerson(byPerson)
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => window.api.notes.onUpdated(refresh), [refresh])

  const loadMore = useCallback(async () => {
    if (!workspaceId) return
    const nextPage = await window.api.notes.list(workspaceId, notes.length, PAGE_SIZE)
    setNotes((prev) => [...prev, ...nextPage])
  }, [workspaceId, notes.length])

  const addNote = useCallback(
    async (payload: { personId: string; sentiment: Sentiment; note: string }) => {
      const n = await window.api.notes.add(payload)
      setNotes((prev) => [n, ...prev])
      setTotal((t) => t + 1)
      setCountByPerson((prev) => ({ ...prev, [n.personId]: (prev[n.personId] ?? 0) + 1 }))
      return n
    },
    []
  )

  const removeNote = useCallback(async (id: string) => {
    const removed = notes.find((n) => n.id === id)
    await window.api.notes.remove(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (removed) {
      setTotal((t) => t - 1)
      setCountByPerson((prev) => ({
        ...prev,
        [removed.personId]: Math.max(0, (prev[removed.personId] ?? 1) - 1),
      }))
    }
  }, [notes])

  const hasMore = notes.length < total

  return { notes, loading, hasMore, loadMore, total, countByPerson, addNote, removeNote, refresh }
}
