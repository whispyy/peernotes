import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Person } from '@shared/types'

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await window.api.people.list()
    setPeople(list.sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addPerson = useCallback(async (name: string) => {
    const p = await window.api.people.add(name)
    setPeople((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)))
    return p
  }, [])

  const removePerson = useCallback(async (id: string) => {
    await window.api.people.remove(id)
    setPeople((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people]
  )

  return { people, peopleById, loading, addPerson, removePerson, refresh }
}
