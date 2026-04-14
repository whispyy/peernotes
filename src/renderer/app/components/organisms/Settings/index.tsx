import { useState } from 'react'
import styled, { css } from 'styled-components'
import type { ThemeMode } from '../../../hooks/useThemeMode'
import { Button } from '../../atoms/Button'

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

// ─── Theme options ────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; icon: string; label: string }[] = [
  { value: 'system', icon: '◐', label: 'Auto' },
  { value: 'light',  icon: '○', label: 'Light' },
  { value: 'dark',   icon: '●', label: 'Dark' }
]

type ResetState = 'idle' | 'confirm' | 'deleting' | 'error'

// ─── Component ───────────────────────────────────────────────────────────────

export function Settings({ mode, setThemeMode, onExport, onImport, onReset }: Props) {
  const [resetState, setResetState] = useState<ResetState>('idle')

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
