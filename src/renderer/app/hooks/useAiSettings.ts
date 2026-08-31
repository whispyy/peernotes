import { useState, useEffect, useCallback } from 'react'
import type { AiSettings } from '@shared/types'

const DEFAULT: AiSettings = {
  enabled: false,
  apiKey: '',
  model: '',
  purposes: [],
  kbAutoFile: true,
  kbRegenThreshold: 3,
  kbClassifierModel: '',
}

export function useAiSettings() {
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT)

  const refresh = useCallback(async () => {
    const s = await window.api.ai.settings.get()
    setAiSettings(s)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { aiSettings, refresh }
}
