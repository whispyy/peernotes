import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Person } from '@shared/types'

export function usePeople(workspaceId: string | null) {
  const [people, setPeople] = useState<Person[]>([])
  const [archivedPeople, setArchivedPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!workspaceId) { setPeople([]); setArchivedPeople([]); setLoading(false); return }
    const [list, archived] = await Promise.all([
      window.api.people.list(workspaceId),
      window.api.people.listArchived(workspaceId),
    ])
    setPeople(list.sort((a, b) => a.name.localeCompare(b.name)))
    setArchivedPeople(archived)
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => window.api.people.onUpdated(refresh), [refresh])

  const addPerson = useCallback(async (name: string) => {
    if (!workspaceId) throw new Error('No active workspace')
    const p = await window.api.people.add(workspaceId, name)
    setPeople((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)))
    return p
  }, [workspaceId])

  const renamePerson = useCallback(async (id: string, name: string) => {
    await window.api.people.rename(id, name)
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
          .sort((a, b) => a.name.localeCompare(b.name))
    )
  }, [])

  const archivePerson = useCallback(async (id: string) => {
    await window.api.people.archive(id)
    setPeople((prev) => {
      const moved = prev.find((p) => p.id === id)
      if (moved) {
        setArchivedPeople((arch) =>
          [{ ...moved, archivedAt: new Date().toISOString() }, ...arch])
      }
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const restorePerson = useCallback(async (id: string) => {
    await window.api.people.restore(id)
    setArchivedPeople((prev) => {
      const moved = prev.find((p) => p.id === id)
      if (moved) {
        setPeople((active) =>
          [...active, { ...moved, archivedAt: null }].sort((a, b) => a.name.localeCompare(b.name)))
      }
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const removePerson = useCallback(async (id: string) => {
    await window.api.people.remove(id)
    setPeople((prev) => prev.filter((p) => p.id !== id))
    setArchivedPeople((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const peopleById = useMemo(
    () => Object.fromEntries([...people, ...archivedPeople].map((p) => [p.id, p])),
    [people, archivedPeople]
  )

  return { people, archivedPeople, peopleById, loading, addPerson, renamePerson, archivePerson, restorePerson, removePerson, refresh }
}
