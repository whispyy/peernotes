import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Person } from '@shared/types'

export function usePeople(workspaceId: string | null) {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!workspaceId) { setPeople([]); setLoading(false); return }
    const list = await window.api.people.list(workspaceId)
    setPeople(list.sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { refresh() }, [refresh])

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

  const removePerson = useCallback(async (id: string) => {
    await window.api.people.remove(id)
    setPeople((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people]
  )

  return { people, peopleById, loading, addPerson, renamePerson, removePerson, refresh }
}
