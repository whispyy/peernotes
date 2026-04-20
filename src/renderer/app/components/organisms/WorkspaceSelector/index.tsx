import { useState, useRef, useEffect, useCallback } from 'react'
import styled, { css } from 'styled-components'
import type { Workspace } from '@shared/types'
import { Input } from '../../atoms/Input'
import { Button } from '../../atoms/Button'

interface Props {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  onSelect: (ws: Workspace) => void
  onAdd: (name: string) => Promise<Workspace>
  onRename: (id: string, name: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

// ─── Trigger button ───────────────────────────────────────────────────────────

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['1.5']};
  padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2.5']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  white-space: nowrap;
  max-width: 160px;
  -webkit-app-region: no-drag;
  transition: background 0.1s ease, border-color 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`

const TriggerName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`

const Chevron = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 10px;
`

// ─── Dropdown ─────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  -webkit-app-region: no-drag;
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  z-index: 200;
  overflow: hidden;
`

const DropSection = styled.div`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
`

const DropItem = styled.button<{ $active?: boolean; $danger?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  background: none;
  border: none;
  text-align: left;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.regular};
  cursor: pointer;
  transition: background 0.1s ease;

  ${({ $active, theme }) =>
    $active
      ? css`color: ${theme.colors.text.primary}; font-weight: ${theme.typography.weight.medium};`
      : css`color: ${theme.colors.text.secondary};`}

  ${({ $danger, theme }) => $danger && css`color: ${theme.colors.danger};`}

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const CheckMark = styled.span`
  width: 14px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 12px;
`

// ─── Inline form ─────────────────────────────────────────────────────────────

const InlineForm = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1.5']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
`

const InlineInput = styled(Input)`
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2']};
  height: 28px;
`

// ─── Delete confirm ───────────────────────────────────────────────────────────

const ConfirmRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1.5']};
  padding: ${({ theme }) => theme.spacing['2.5']} ${({ theme }) => theme.spacing['3']};
`

const ConfirmText = styled.p`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`

const ConfirmActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1.5']};
  justify-content: flex-end;
`

// ─── Component ───────────────────────────────────────────────────────────────

type Mode = 'list' | 'add' | 'rename' | 'delete'

export function WorkspaceSelector({ workspaces, activeWorkspace, onSelect, onAdd, onRename, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  const [inputValue, setInputValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setMode('list')
        setError(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus input when entering add/rename mode
  useEffect(() => {
    if (mode === 'add' || mode === 'rename') {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [mode])

  const openWith = useCallback((m: Mode) => {
    setMode(m)
    setError(null)
    setInputValue(m === 'rename' ? (activeWorkspace?.name ?? '') : '')
    setOpen(true)
  }, [activeWorkspace])

  const handleSelect = (ws: Workspace) => {
    onSelect(ws)
    setOpen(false)
    setMode('list')
  }

  const handleAdd = async () => {
    const name = inputValue.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      const ws = await onAdd(name)
      onSelect(ws)
      setOpen(false)
      setMode('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async () => {
    const name = inputValue.trim()
    if (!name || !activeWorkspace) return
    setBusy(true)
    setError(null)
    try {
      await onRename(activeWorkspace.id, name)
      setOpen(false)
      setMode('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!activeWorkspace) return
    setBusy(true)
    try {
      await onRemove(activeWorkspace.id)
      setOpen(false)
      setMode('list')
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action()
    if (e.key === 'Escape') { setOpen(false); setMode('list') }
  }

  return (
    <Wrapper ref={wrapperRef}>
      <Trigger onClick={() => { setOpen((o) => !o); setMode('list'); setError(null) }}>
        <TriggerName>{activeWorkspace?.name ?? 'Workspace'}</TriggerName>
        <Chevron>▾</Chevron>
      </Trigger>

      {open && (
        <Dropdown>
          {/* Workspace list */}
          <DropSection>
            {workspaces.map((ws) => (
              <DropItem key={ws.id} $active={ws.id === activeWorkspace?.id} onClick={() => handleSelect(ws)}>
                <CheckMark>{ws.id === activeWorkspace?.id ? '✓' : ''}</CheckMark>
                {ws.name}
              </DropItem>
            ))}
          </DropSection>

          {/* Actions */}
          {mode === 'list' && (
            <DropSection>
              <DropItem onClick={() => openWith('add')}>
                <CheckMark />+ New workspace
              </DropItem>
              {activeWorkspace && (
                <DropItem onClick={() => openWith('rename')}>
                  <CheckMark />✎ Rename…
                </DropItem>
              )}
              {activeWorkspace && workspaces.length > 1 && (
                <DropItem $danger onClick={() => openWith('delete')}>
                  <CheckMark />⊘ Delete…
                </DropItem>
              )}
            </DropSection>
          )}

          {/* Add form */}
          {mode === 'add' && (
            <DropSection>
              <InlineForm>
                <InlineInput
                  ref={inputRef}
                  value={inputValue}
                  placeholder="Workspace name"
                  onChange={(e) => { setInputValue(e.target.value); setError(null) }}
                  onKeyDown={(e) => handleKeyDown(e, handleAdd)}
                />
                <Button $size="sm" $variant="primary" onClick={handleAdd} disabled={busy || !inputValue.trim()}>
                  Add
                </Button>
              </InlineForm>
              {error && <ConfirmText style={{ padding: '0 12px 8px', color: 'var(--danger)' }}>{error}</ConfirmText>}
            </DropSection>
          )}

          {/* Rename form */}
          {mode === 'rename' && (
            <DropSection>
              <InlineForm>
                <InlineInput
                  ref={inputRef}
                  value={inputValue}
                  placeholder="New name"
                  onChange={(e) => { setInputValue(e.target.value); setError(null) }}
                  onKeyDown={(e) => handleKeyDown(e, handleRename)}
                />
                <Button $size="sm" $variant="primary" onClick={handleRename} disabled={busy || !inputValue.trim()}>
                  Save
                </Button>
              </InlineForm>
              {error && <ConfirmText style={{ padding: '0 12px 8px', color: 'var(--danger)' }}>{error}</ConfirmText>}
            </DropSection>
          )}

          {/* Delete confirm */}
          {mode === 'delete' && activeWorkspace && (
            <DropSection>
              <ConfirmRow>
                <ConfirmText>
                  Delete <strong>{activeWorkspace.name}</strong>? All its people and notes will be removed.
                </ConfirmText>
                <ConfirmActions>
                  <Button $size="sm" $variant="ghost" onClick={() => setMode('list')} disabled={busy}>
                    Cancel
                  </Button>
                  <Button $size="sm" $variant="danger" onClick={handleRemove} disabled={busy}>
                    Delete
                  </Button>
                </ConfirmActions>
              </ConfirmRow>
            </DropSection>
          )}
        </Dropdown>
      )}
    </Wrapper>
  )
}
