import { useState, useEffect } from 'react'
import styled, { css } from 'styled-components'
import type { ThemeMode } from '../../../hooks/useThemeMode'
import type { AiPurposePreset, AiSettings } from '@shared/types'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { TextArea } from '../../atoms/TextArea'

interface Props {
  mode: ThemeMode
  setThemeMode: (m: ThemeMode) => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
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

// ─── Theme options ────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; icon: string; label: string }[] = [
  { value: 'system', icon: '◐', label: 'Auto' },
  { value: 'light',  icon: '○', label: 'Light' },
  { value: 'dark',   icon: '●', label: 'Dark' }
]

type ResetState = 'idle' | 'confirm' | 'deleting' | 'error'

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

export function Settings({ mode, setThemeMode, onExport, onImport, onReset }: Props) {
  const [resetState, setResetState] = useState<ResetState>('idle')

  // AI settings state
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    enabled: false, apiKey: '', model: '', purposes: []
  })
  const [editingPurposeId, setEditingPurposeId] = useState<string | 'new' | null>(null)

  useEffect(() => {
    window.api.ai.settings.get().then(setAiSettings)
  }, [])

  const handleReset = async () => {
    setResetState('deleting')
    try {
      await window.api.data.reset()
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
            <KbdGroup>
              <Kbd>⌃</Kbd>
              <Kbd>⌘</Kbd>
              <Kbd>⌥</Kbd>
              <Kbd>Space</Kbd>
            </KbdGroup>
          </Row>
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

      {/* ── Danger zone ────────────────────────────────────────────── */}
      <Section>
        <SectionLabel>Danger Zone</SectionLabel>
        <DangerCard>
          {resetState === 'idle' && (
            <Row>
              <RowMeta>
                <RowTitle>Reset all data</RowTitle>
                <RowDesc>Permanently removes all notes and people. Cannot be undone.</RowDesc>
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
                <RowDesc>All notes and people will be deleted. This cannot be undone.</RowDesc>
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
