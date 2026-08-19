import { useState, useEffect, useCallback } from 'react'
import type { KbStatus } from '@shared/types'

const EMPTY: KbStatus = { topics: [], noteCount: 0, unfiledCount: 0, staleCount: 0, folder: '' }

export function useKb(workspaceId: string | null) {
  const [status, setStatus] = useState<KbStatus>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setStatus(EMPTY)
    setLoading(true)
  }, [workspaceId])

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setStatus(EMPTY)
      setLoading(false)
      return
    }
    setStatus(await window.api.kb.status(workspaceId))
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { refresh() }, [refresh])

  // Filing and regeneration happen in the main process, off note saves
  useEffect(() => window.api.kb.onUpdated(refresh), [refresh])
  useEffect(() => window.api.notes.onUpdated(refresh), [refresh])

  return { status, loading, refresh }
}
