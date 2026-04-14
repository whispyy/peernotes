import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import { App } from './App'
import { useThemeMode } from './hooks/useThemeMode'

function Root() {
  const { resolvedTheme, mode, setThemeMode } = useThemeMode()
  return (
    <ThemeProvider theme={resolvedTheme}>
      <App mode={mode} setThemeMode={setThemeMode} />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
