import { useState, useEffect, useCallback } from 'react'
import { darkTheme, lightTheme } from '../theme'
import type { AppTheme } from '../theme'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme-mode'
const CYCLE: ThemeMode[] = ['system', 'light', 'dark']

function readMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  return CYCLE.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(readMode)
  const [isDark, setIsDark] = useState(systemPrefersDark)

  // Track OS-level changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const effectiveDark = mode === 'system' ? isDark : mode === 'dark'
  const resolvedTheme = effectiveDark ? darkTheme : lightTheme

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, newMode)
    setMode(newMode)
  }, [])

  return { mode, resolvedTheme, setThemeMode }
}
