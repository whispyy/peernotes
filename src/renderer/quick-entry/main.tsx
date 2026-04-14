import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import { QuickEntryApp } from './QuickEntryApp'
import { useThemeMode } from '../app/hooks/useThemeMode'

function Root() {
  const { resolvedTheme } = useThemeMode()
  return (
    <ThemeProvider theme={resolvedTheme}>
      <QuickEntryApp />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
