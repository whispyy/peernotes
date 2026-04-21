import { useState, useEffect, useCallback } from 'react'
import type { Workspace } from '@shared/types'

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null)

  useEffect(() => {
    Promise.all([window.api.workspace.list(), window.api.workspace.getActive()]).then(
      ([list, activeId]) => {
        setWorkspaces(list)
        const active = (activeId ? list.find((w) => w.id === activeId) : null) ?? list[0] ?? null
        setActiveWorkspaceState(active)
        if (active) window.api.workspace.setActive(active.id)
      }
    )
  }, [])

  const setActiveWorkspace = useCallback(async (ws: Workspace) => {
    setActiveWorkspaceState(ws)
    await window.api.workspace.setActive(ws.id)
  }, [])

  const addWorkspace = useCallback(async (name: string): Promise<Workspace> => {
    const ws = await window.api.workspace.add(name)
    setWorkspaces((prev) => [...prev, ws])
    return ws
  }, [])

  const renameWorkspace = useCallback(async (id: string, name: string): Promise<void> => {
    await window.api.workspace.rename(id, name)
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)))
    setActiveWorkspaceState((prev) => (prev?.id === id ? { ...prev, name } : prev))
  }, [])

  const removeWorkspace = useCallback(async (id: string): Promise<void> => {
    await window.api.workspace.remove(id)
    setWorkspaces((prev) => {
      const next = prev.filter((w) => w.id !== id)
      // If we removed the active workspace, switch to the first available
      setActiveWorkspaceState((active) => {
        if (active?.id !== id) return active
        const fallback = next[0] ?? null
        if (fallback) window.api.workspace.setActive(fallback.id)
        return fallback
      })
      return next
    })
  }, [])

  return { workspaces, activeWorkspace, setActiveWorkspace, addWorkspace, renameWorkspace, removeWorkspace }
}
