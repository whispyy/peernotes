import { useState, useEffect, useRef } from 'react'
import styled, { css } from 'styled-components'
import type { ThemeMode } from '../../../hooks/useThemeMode'
import type { AiPurposePreset, AiSettings, SyncSettings, SyncDirection } from '@shared/types'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { TextArea } from '../../atoms/TextArea'

interface Props {
  mode: ThemeMode
  setThemeMode: (m: ThemeMode) => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
  workspaceId?: string | null
  workspaceName?: string | null
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const Page = styled.div`
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['8']};
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['3']};
`

const SectionLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0 ${({ theme }) => theme.spacing['1']};
`

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
`

const DangerCard = styled(Card)`
  border-color: ${({ theme }) => theme.colors.dangerBorder};
`

const RowDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.subtle};
  margin: 0 ${({ theme }) => theme.spacing['4']};
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['4']};
  padding: ${({ theme }) => theme.spacing['4']};
`

const RowMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RowTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`

const RowDesc = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

// ─── Segmented control ────────────────────────────────────────────────────────

const SegmentedControl = styled.div`
  display: flex;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 3px;
  gap: 2px;
`

const Segment = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['1.5']};
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']};
  border: none;
  border-radius: calc(${({ theme }) => theme.radius.md} - 2px);
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s ease, color 0.1s ease;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.bg.secondary};
          color: ${theme.colors.text.primary};
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.muted};
          &:hover {
            color: ${theme.colors.text.primary};
            background: ${theme.colors.bg.tertiary};
          }
        `}
`

// ─── Keyboard shortcut ───────────────────────────────────────────────────────

const RecordingArea = styled.div`
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']};
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  outline: none;
  cursor: default;
  user-select: none;
  min-width: 160px;
  text-align: center;
`

const ShortcutError = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.danger};
`

const KbdGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['1']};
`

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2']};
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-style: normal;
  color: ${({ theme }) => theme.colors.text.muted};
  line-height: 1;
  white-space: nowrap;
`

// ─── Danger zone ─────────────────────────────────────────────────────────────

const ConfirmRow = styled(Row)`
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing['3']};
`

const ConfirmActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['2']};
`

const ErrorDesc = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.danger};
`

// ─── Toggle ──────────────────────────────────────────────────────────────────

const ToggleLabel = styled.label`
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
`

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;

  &:checked + span {
    background: ${({ theme }) => theme.colors.accent};
  }

  &:checked + span::before {
    transform: translateX(16px);
  }
`

const ToggleSlider = styled.span`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.full};
  transition: background 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    height: 14px;
    width: 14px;
    left: 3px;
    top: 3px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s ease;
  }
`

// ─── AI settings inline inputs ───────────────────────────────────────────────

const InputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['4']};
`

const InputLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const BackupPathPreview = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 ${({ theme }) => theme.spacing['4']};
  margin-top: -${({ theme }) => theme.spacing['2']};
`

// ─── Purpose presets ─────────────────────────────────────────────────────────

const PurposeList = styled.div`
  display: flex;
  flex-direction: column;
`

const PurposeRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['3']};
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
`

const PurposeMeta = styled.div`
  flex: 1;
  min-width: 0;
`

const PurposeName = styled.div`
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`

const PurposePromptPreview = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PurposeActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1.5']};
  flex-shrink: 0;
`

const PurposeEditArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['4']};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`

const EditActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['2']};
  justify-content: flex-end;
`

const AddPresetRow = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  background: none;
  border: none;
  text-align: left;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.accent};
  cursor: pointer;
  transition: color 0.1s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.accentHover};
  }
`

// ─── Sync status ─────────────────────────────────────────────────────────────

const SyncStatusText = styled.span<{ $variant?: 'success' | 'error' }>`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ $variant, theme }) =>
    $variant === 'success' ? theme.colors.sentiment.positive :
    $variant === 'error' ? theme.colors.danger :
    theme.colors.text.muted};
`

const SyncActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  margin-left: auto;
`

// ─── Sync constants ───────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 1440, label: '24 hours' },
]

const DIRECTION_OPTIONS: { value: SyncDirection; label: string }[] = [
  { value: 'push', label: 'Push only' },
  { value: 'pull', label: 'Pull only' },
  { value: 'both', label: 'Both' },
]

function formatLastSynced(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

// ─── Theme options ────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; icon: string; label: string }[] = [
  { value: 'system', icon: '◐', label: 'Auto' },
  { value: 'light',  icon: '○', label: 'Light' },
  { value: 'dark',   icon: '●', label: 'Dark' }
]

type ResetState = 'idle' | 'confirm' | 'deleting' | 'error'
type ShortcutState = 'idle' | 'recording' | 'preview'

function acceleratorToKeys(acc: string): string[] {
  return acc.split('+').map((p) => {
    if (p === 'Cmd' || p === 'Command') return '⌘'
    if (p === 'Ctrl' || p === 'Control') return '⌃'
    if (p === 'Alt' || p === 'Option') return '⌥'
    if (p === 'Shift') return '⇧'
    if (p === 'Space') return 'Space'
    return p.length === 1 ? p.toUpperCase() : p
  })
}

function eventToAccelerator(e: React.KeyboardEvent<HTMLDivElement>): string | null {
  const modifiers: string[] = []
  if (e.ctrlKey) modifiers.push('Ctrl')
  if (e.metaKey) modifiers.push('Cmd')
  if (e.altKey) modifiers.push('Alt')
  if (e.shiftKey) modifiers.push('Shift')
  if (modifiers.length === 0) return null

  const key = e.key
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(key)) return null

  let mainKey: string
  // Use e.code for Space — e.key is ' ' (space char) when modifiers are held,
  // which produces an invalid Electron accelerator string.
  if (e.code === 'Space') {
    mainKey = 'Space'
  } else {
    switch (key) {
      case 'ArrowLeft': mainKey = 'Left'; break
      case 'ArrowRight': mainKey = 'Right'; break
      case 'ArrowUp': mainKey = 'Up'; break
      case 'ArrowDown': mainKey = 'Down'; break
      case 'Enter': mainKey = 'Return'; break
      default: mainKey = key.length === 1 ? key.toUpperCase() : key
    }
  }

  return [...modifiers, mainKey].join('+')
}

// ─── Purpose editor sub-component ────────────────────────────────────────────

interface PurposeEditorProps {
  initial: { name: string; systemPrompt: string }
  onSave: (name: string, systemPrompt: string) => Promise<void>
  onCancel: () => void
}

function PurposeEditor({ initial, onSave, onCancel }: PurposeEditorProps) {
  const [name, setName] = useState(initial.name)
  const [prompt, setPrompt] = useState(initial.systemPrompt)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !prompt.trim()) return
    setSaving(true)
    await onSave(name.trim(), prompt.trim())
    setSaving(false)
  }

  return (
    <PurposeEditArea>
      <Input
        value={name}
        placeholder="Preset name (e.g. Review Prep)"
        onChange={(e) => setName(e.target.value)}
      />
      <TextArea
        rows={4}
        value={prompt}
        placeholder="System prompt — describe how the summary should be written and what to focus on."
        onChange={(e) => setPrompt(e.target.value)}
      />
      <EditActions>
        <Button $variant="ghost" $size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button $variant="primary" $size="sm" onClick={handleSave} disabled={saving || !name.trim() || !prompt.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </EditActions>
    </PurposeEditArea>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Settings({ mode, setThemeMode, onExport, onImport, onReset, workspaceId, workspaceName }: Props) {
  const [resetState, setResetState] = useState<ResetState>('idle')

  // Shortcut state
  const [shortcut, setShortcut] = useState('')
  const [shortcutState, setShortcutState] = useState<ShortcutState>('idle')
  const [pendingShortcut, setPendingShortcut] = useState('')
  const [shortcutError, setShortcutError] = useState('')
  const [shortcutSaving, setShortcutSaving] = useState(false)
  const recordingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.shortcut.get().then(setShortcut)
  }, [])

  useEffect(() => {
    if (shortcutState === 'recording') recordingRef.current?.focus()
  }, [shortcutState])

  const handleRecordKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.key === 'Escape') { setShortcutState('idle'); return }
    const acc = eventToAccelerator(e)
    if (acc) { setPendingShortcut(acc); setShortcutState('preview'); setShortcutError('') }
  }

  const saveShortcut = async () => {
    setShortcutSaving(true)
    try {
      const result = await window.api.shortcut.set(pendingShortcut)
      if (result.ok) {
        setShortcut(pendingShortcut)
        setShortcutState('idle')
        setShortcutError('')
      } else {
        setShortcutError(result.error ?? 'Could not set shortcut')
        setShortcutState('preview')
      }
    } catch {
      setShortcutError('Could not set shortcut')
      setShortcutState('preview')
    } finally {
      setShortcutSaving(false)
    }
  }

  // AI settings state
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    enabled: false, apiKey: '', model: '', purposes: []
  })
  const [editingPurposeId, setEditingPurposeId] = useState<string | 'new' | null>(null)

  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    githubToken: null, githubTokenSet: false, repo: null, branch: 'main',
    filePath: 'peernotes', lastSyncedAt: null, lastSyncError: null,
    autoSyncEnabled: false, autoSyncIntervalMinutes: 15, autoSyncDirection: 'both',
  })
  const [tokenDraft, setTokenDraft] = useState<string | null>(null)
  const [repoDraft, setRepoDraft] = useState('')
  const [branchDraft, setBranchDraft] = useState('main')
  const [filePathDraft, setFilePathDraft] = useState('peernotes')
  const [pushState, setPushState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [pushMsg, setPushMsg] = useState('')
  const [pullState, setPullState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [pullMsg, setPullMsg] = useState('')

  useEffect(() => {
    window.api.ai.settings.get().then(setAiSettings)
  }, [])

  useEffect(() => {
    window.api.sync.getSettings().then(s => {
      setSyncSettings(s)
      setRepoDraft(s.repo ?? '')
      setBranchDraft(s.branch)
      setFilePathDraft(s.filePath)
    })
    return window.api.sync.onUpdated(() => {
      window.api.sync.getSettings().then(setSyncSettings)
    })
  }, [])

  const handleReset = async () => {
    setResetState('deleting')
    try {
      await window.api.data.reset(workspaceId ?? undefined)
      onReset()
      setResetState('idle')
    } catch {
      setResetState('error')
    }
  }

  const setAiEnabled = async (enabled: boolean) => {
    await window.api.ai.settings.set({ enabled })
    setAiSettings((s) => ({ ...s, enabled }))
  }

  const setApiKey = async (apiKey: string) => {
    await window.api.ai.settings.set({ apiKey })
    setAiSettings((s) => ({ ...s, apiKey }))
  }

  const setModel = async (model: string) => {
    await window.api.ai.settings.set({ model })
    setAiSettings((s) => ({ ...s, model }))
  }

  const handleAddPurpose = async (name: string, systemPrompt: string) => {
    const preset = await window.api.ai.purposes.add({ name, systemPrompt })
    setAiSettings((s) => ({ ...s, purposes: [...s.purposes, preset] }))
    setEditingPurposeId(null)
  }

  const handleUpdatePurpose = async (id: string, name: string, systemPrompt: string) => {
    await window.api.ai.purposes.update({ id, name, systemPrompt })
    setAiSettings((s) => ({
      ...s,
      purposes: s.purposes.map((p) => p.id === id ? { ...p, name, systemPrompt } : p)
    }))
    setEditingPurposeId(null)
  }

  const handleRemovePurpose = async (id: string) => {
    await window.api.ai.purposes.remove(id)
    setAiSettings((s) => ({ ...s, purposes: s.purposes.filter((p) => p.id !== id) }))
  }

  const setSyncField = async <K extends keyof SyncSettings>(key: K, value: SyncSettings[K]) => {
    setSyncSettings(s => ({ ...s, [key]: value }))
    await window.api.sync.setSettings({ [key]: value } as Partial<SyncSettings>)
  }

  const handlePush = async () => {
    if (!workspaceId) return
    setPushState('loading'); setPushMsg('')
    try {
      const r = await window.api.sync.push(workspaceId)
      setPushState('done'); setPushMsg(`${r.total} notes pushed`)
      setSyncSettings(s => ({ ...s, lastSyncedAt: Date.now(), lastSyncError: null }))
    } catch (err) {
      setPushState('error'); setPushMsg(err instanceof Error ? err.message : 'Push failed')
    }
  }

  const handlePull = async () => {
    if (!workspaceId) return
    setPullState('loading'); setPullMsg('')
    try {
      const r = await window.api.sync.pull(workspaceId)
      setPullState('done'); setPullMsg(`${r.imported} imported, ${r.skipped} skipped`)
      setSyncSettings(s => ({ ...s, lastSyncedAt: Date.now(), lastSyncError: null }))
    } catch (err) {
      setPullState('error'); setPullMsg(err instanceof Error ? err.message : 'Pull failed')
    }
  }

  return (
    <Page>

      {/* ── Appearance ─────────────────────────────────────────────── */}
      <Section>
        <SectionLabel>Appearance</SectionLabel>
        <Card>
          <Row>
            <RowMeta>
              <RowTitle>Theme</RowTitle>
              <RowDesc>Choose how Peernotes looks on your screen</RowDesc>
            </RowMeta>
            <SegmentedControl>
              {THEME_OPTIONS.map(({ value, icon, label }) => (
                <Segment
                  key={value}
                  $active={mode === value}
                  onClick={() => setThemeMode(value)}
                >
                  {icon} {label}
                </Segment>
              ))}
            </SegmentedControl>
          </Row>
        </Card>
      </Section>

      {/* ── Shortcuts ──────────────────────────────────────────────── */}
      <Section>
        <SectionLabel>Shortcuts</SectionLabel>
        <Card>
          <Row>
            <RowMeta>
              <RowTitle>Quick entry</RowTitle>
              <RowDesc>Open the note panel from anywhere on your Mac</RowDesc>
            </RowMeta>

            {shortcutState === 'idle' && shortcut && (
              <>
                <KbdGroup>
                  {acceleratorToKeys(shortcut).map((k) => <Kbd key={k}>{k}</Kbd>)}
                </KbdGroup>
                <Button $variant="ghost" $size="sm" onClick={() => setShortcutState('recording')}>
                  Change
                </Button>
              </>
            )}

            {shortcutState === 'recording' && (
              <RecordingArea
                ref={recordingRef}
                tabIndex={0}
                onKeyDown={handleRecordKeyDown}
                onBlur={() => setShortcutState('idle')}
              >
                Press keys…
              </RecordingArea>
            )}

            {shortcutState === 'preview' && (
              <>
                <KbdGroup>
                  {acceleratorToKeys(pendingShortcut).map((k) => <Kbd key={k}>{k}</Kbd>)}
                </KbdGroup>
                <Button $variant="primary" $size="sm" onClick={saveShortcut} disabled={shortcutSaving}>
                  {shortcutSaving ? 'Saving…' : 'Save'}
                </Button>
                <Button $variant="ghost" $size="sm" onClick={() => setShortcutState('idle')} disabled={shortcutSaving}>
                  Cancel
                </Button>
              </>
            )}
          </Row>
          {shortcutError && (
            <Row style={{ paddingTop: 0 }}>
              <ShortcutError>{shortcutError}</ShortcutError>
            </Row>
          )}
        </Card>
      </Section>

      {/* ── AI Summaries ───────────────────────────────────────────── */}
      <Section>
        <SectionLabel>AI Summaries</SectionLabel>
        <Card>
          <Row>
            <RowMeta>
              <RowTitle>Enable AI Summaries</RowTitle>
              <RowDesc>Generate smart summaries of notes using an AI model via OpenRouter</RowDesc>
            </RowMeta>
            <ToggleLabel>
              <ToggleInput
                type="checkbox"
                checked={aiSettings.enabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
              />
              <ToggleSlider />
            </ToggleLabel>
          </Row>

          {aiSettings.enabled && (
            <>
              <RowDivider />
              <InputRow>
                <InputLabel>OpenRouter API Key</InputLabel>
                <Input
                  type="password"
                  value={aiSettings.apiKey}
                  placeholder="sk-or-…"
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </InputRow>
              <RowDivider />
              <InputRow>
                <InputLabel>Model</InputLabel>
                <Input
                  value={aiSettings.model}
                  placeholder="e.g. anthropic/claude-3.5-sonnet"
                  onChange={(e) => setModel(e.target.value)}
                />
              </InputRow>
            </>
          )}
        </Card>

        {aiSettings.enabled && (
          <Card>
            <PurposeList>
              {aiSettings.purposes.map((p: AiPurposePreset) => (
                editingPurposeId === p.id ? (
                  <PurposeEditor
                    key={p.id}
                    initial={{ name: p.name, systemPrompt: p.systemPrompt }}
                    onSave={(name, systemPrompt) => handleUpdatePurpose(p.id, name, systemPrompt)}
                    onCancel={() => setEditingPurposeId(null)}
                  />
                ) : (
                  <PurposeRow key={p.id}>
                    <PurposeMeta>
                      <PurposeName>{p.name}</PurposeName>
                      <PurposePromptPreview>{p.systemPrompt}</PurposePromptPreview>
                    </PurposeMeta>
                    <PurposeActions>
                      <Button $variant="ghost" $size="sm" onClick={() => setEditingPurposeId(p.id)}>
                        Edit
                      </Button>
                      <Button $variant="danger" $size="sm" onClick={() => handleRemovePurpose(p.id)}>
                        Delete
                      </Button>
                    </PurposeActions>
                  </PurposeRow>
                )
              ))}

              {editingPurposeId === 'new' ? (
                <PurposeEditor
                  initial={{ name: '', systemPrompt: '' }}
                  onSave={handleAddPurpose}
                  onCancel={() => setEditingPurposeId(null)}
                />
              ) : (
                <AddPresetRow onClick={() => setEditingPurposeId('new')}>
                  + Add purpose preset
                </AddPresetRow>
              )}
            </PurposeList>
          </Card>
        )}
      </Section>

      {/* ── Data ───────────────────────────────────────────────────── */}
      <Section>
        <SectionLabel>Data</SectionLabel>
        <Card>
          <Row>
            <RowMeta>
              <RowTitle>Export notes</RowTitle>
              <RowDesc>Download all notes as a JSON file</RowDesc>
            </RowMeta>
            <Button $size="sm" $variant="ghost" onClick={onExport}>
              ↑ Export
            </Button>
          </Row>
          <RowDivider />
          <Row>
            <RowMeta>
              <RowTitle>Import notes</RowTitle>
              <RowDesc>Restore from a Peernotes export file</RowDesc>
            </RowMeta>
            <Button $size="sm" $variant="ghost" onClick={onImport}>
              ↓ Import
            </Button>
          </Row>
        </Card>
      </Section>

      {/* ── GitHub Sync ────────────────────────────────────────────── */}
      <Section>
        <SectionLabel>GitHub Sync</SectionLabel>
        <Card>
          <InputRow>
            <InputLabel>GitHub Token</InputLabel>
            <Input
              type="password"
              value={tokenDraft !== null ? tokenDraft : (syncSettings.githubTokenSet ? '••••••••••••' : '')}
              placeholder="ghp_…"
              onFocus={() => setTokenDraft('')}
              onChange={(e) => setTokenDraft(e.target.value)}
              onBlur={() => {
                if (tokenDraft) setSyncField('githubToken', tokenDraft)
                setTokenDraft(null)
              }}
            />
          </InputRow>
          <RowDivider />
          <InputRow>
            <InputLabel>Repository</InputLabel>
            <Input
              value={repoDraft}
              placeholder="owner/repo"
              onChange={(e) => setRepoDraft(e.target.value)}
              onBlur={() => setSyncField('repo', repoDraft || null)}
            />
          </InputRow>
          <RowDivider />
          <InputRow>
            <InputLabel>Branch</InputLabel>
            <Input
              value={branchDraft}
              placeholder="main"
              onChange={(e) => setBranchDraft(e.target.value)}
              onBlur={() => setSyncField('branch', branchDraft || 'main')}
            />
          </InputRow>
          <RowDivider />
          <InputRow>
            <InputLabel>Backup Folder</InputLabel>
            <Input
              value={filePathDraft}
              placeholder="peernotes"
              onChange={(e) => setFilePathDraft(e.target.value)}
              onBlur={() => setSyncField('filePath', filePathDraft || 'peernotes')}
            />
          </InputRow>
          {workspaceName && (
            <BackupPathPreview>
              Saves to: {(filePathDraft || 'peernotes').replace(/\/+$/, '')}/{workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default'}.json
            </BackupPathPreview>
          )}
          <RowDivider />
          <Row>
            <RowMeta>
              <RowTitle>Auto-sync</RowTitle>
              <RowDesc>Push and pull automatically in the background</RowDesc>
            </RowMeta>
            <ToggleLabel>
              <ToggleInput
                type="checkbox"
                checked={syncSettings.autoSyncEnabled}
                onChange={(e) => setSyncField('autoSyncEnabled', e.target.checked)}
              />
              <ToggleSlider />
            </ToggleLabel>
          </Row>
          {syncSettings.autoSyncEnabled && (
            <>
              <RowDivider />
              <Row>
                <RowMeta>
                  <RowTitle>Interval</RowTitle>
                </RowMeta>
                <SegmentedControl>
                  {INTERVAL_OPTIONS.map(({ value, label }) => (
                    <Segment
                      key={value}
                      $active={syncSettings.autoSyncIntervalMinutes === value}
                      onClick={() => setSyncField('autoSyncIntervalMinutes', value)}
                    >
                      {label}
                    </Segment>
                  ))}
                </SegmentedControl>
              </Row>
              <RowDivider />
              <Row>
                <RowMeta>
                  <RowTitle>Direction</RowTitle>
                </RowMeta>
                <SegmentedControl>
                  {DIRECTION_OPTIONS.map(({ value, label }) => (
                    <Segment
                      key={value}
                      $active={syncSettings.autoSyncDirection === value}
                      onClick={() => setSyncField('autoSyncDirection', value)}
                    >
                      {label}
                    </Segment>
                  ))}
                </SegmentedControl>
              </Row>
            </>
          )}
          <RowDivider />
          <Row>
            <SyncStatusText $variant={syncSettings.lastSyncError ? 'error' : undefined}>
              {syncSettings.lastSyncError ?? `Last synced: ${formatLastSynced(syncSettings.lastSyncedAt)}`}
            </SyncStatusText>
            <SyncActions>
              <Button
                $size="sm"
                $variant="ghost"
                onClick={handlePull}
                disabled={pullState === 'loading' || !workspaceId || !syncSettings.repo || !syncSettings.githubTokenSet}
                title={pullMsg || undefined}
              >
                {pullState === 'loading' ? 'Pulling…' : pullState === 'done' ? `↓ ${pullMsg}` : pullState === 'error' ? '↓ Error' : '↓ Pull'}
              </Button>
              <Button
                $size="sm"
                onClick={handlePush}
                disabled={pushState === 'loading' || !workspaceId || !syncSettings.repo || !syncSettings.githubTokenSet}
                title={pushMsg || undefined}
              >
                {pushState === 'loading' ? 'Pushing…' : pushState === 'done' ? `↑ ${pushMsg}` : pushState === 'error' ? '↑ Error' : '↑ Push'}
              </Button>
            </SyncActions>
          </Row>
        </Card>
      </Section>

      {/* ── Danger zone ────────────────────────────────────────────── */}
      <Section>
        <SectionLabel>Danger Zone</SectionLabel>
        <DangerCard>
          {resetState === 'idle' && (
            <Row>
              <RowMeta>
                <RowTitle>Reset workspace data</RowTitle>
                <RowDesc>Removes all people and notes in the current workspace. Settings and other workspaces are unaffected.</RowDesc>
              </RowMeta>
              <Button $variant="danger" $size="sm" onClick={() => setResetState('confirm')}>
                Delete everything
              </Button>
            </Row>
          )}

          {resetState === 'confirm' && (
            <ConfirmRow>
              <RowMeta>
                <RowTitle>Are you sure?</RowTitle>
                <RowDesc>All people and notes in this workspace will be permanently deleted. This cannot be undone.</RowDesc>
              </RowMeta>
              <ConfirmActions>
                <Button $variant="ghost" $size="sm" onClick={() => setResetState('idle')}>
                  Cancel
                </Button>
                <Button $variant="danger" $size="sm" onClick={handleReset}>
                  Yes, delete everything
                </Button>
              </ConfirmActions>
            </ConfirmRow>
          )}

          {resetState === 'deleting' && (
            <Row>
              <RowMeta>
                <RowTitle>Deleting…</RowTitle>
                <RowDesc>Removing all notes and people.</RowDesc>
              </RowMeta>
              <Button $variant="danger" $size="sm" disabled>Deleting…</Button>
            </Row>
          )}

          {resetState === 'error' && (
            <Row>
              <RowMeta>
                <RowTitle>Reset failed</RowTitle>
                <ErrorDesc>An unexpected error occurred. Please try again.</ErrorDesc>
              </RowMeta>
              <Button $variant="ghost" $size="sm" onClick={() => setResetState('idle')}>
                Dismiss
              </Button>
            </Row>
          )}
        </DangerCard>
      </Section>

    </Page>
  )
}
