import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import type { ExportResult } from '@shared/types'
import { Button } from '../../atoms/Button'
import {
  ModalBackdrop, Card, Header, Title, CloseBtn,
  Divider, Footer, Spinner, StatusRow
} from '../../molecules/ModalShell'

interface Props {
  workspaceId: string
  onClose: () => void
}

// ─── Date range ───────────────────────────────────────────────────────────────

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing['3']};
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1.5']};
`

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.muted};
`

const DateInput = styled.input`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.base};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.12s;
  color-scheme: ${({ theme }) => theme.colorScheme};

  &:focus { border-color: ${({ theme }) => theme.colors.border.focus}; }
  &::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
`

// ─── Preview ──────────────────────────────────────────────────────────────────

const Preview = styled.div`
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const PreviewLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

const PreviewCount = styled.span`
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

const SuccessText = styled.span`
  color: ${({ theme }) => theme.colors.sentiment.positive};
  font-size: ${({ theme }) => theme.typography.size.sm};
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilename(from: string, to: string): string {
  const parts = ['team-notes']
  if (from) parts.push(`from-${from}`)
  if (to) parts.push(`to-${to}`)
  return parts.join('_') + '.json'
}

type ExportStatus = 'idle' | 'loading' | 'done' | 'error'

// ─── Component ───────────────────────────────────────────────────────────────

export function ExportModal({ workspaceId, onClose }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [lastResult, setLastResult] = useState<ExportResult | null>(null)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.notes.count(workspaceId, from || undefined, to || undefined).then((n) => {
      if (!cancelled) setCount(n)
    })
    return () => { cancelled = true }
  }, [workspaceId, from, to])

  const runExport = useCallback(async (): Promise<ExportResult | null> => {
    setStatus('loading')
    try {
      const result = await window.api.export.run({
        workspaceId,
        from: from || undefined,
        to: to || undefined
      })
      setLastResult(result)
      setStatus('done')
      return result
    } catch {
      setStatus('error')
      return null
    }
  }, [from, to])

  const handleCopy = useCallback(async () => {
    const result = await runExport()
    if (!result) return
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
  }, [runExport])

  const handleSave = useCallback(async () => {
    const result = await runExport()
    if (!result) return
    const filename = buildFilename(from, to)
    await window.api.export.saveFile(JSON.stringify(result, null, 2), filename)
  }, [runExport, from, to])

  const isLoading = status === 'loading'
  const isDone = status === 'done'
  const isError = status === 'error'

  return (
    <ModalBackdrop onClose={onClose}>
      <Card>
        <Header>
          <Title>Export Notes</Title>
          <CloseBtn onClick={onClose} aria-label="Close">×</CloseBtn>
        </Header>

        <FieldRow>
          <Field>
            <Label htmlFor="export-from">From</Label>
            <DateInput
              id="export-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => { setFrom(e.target.value); setStatus('idle') }}
            />
          </Field>
          <Field>
            <Label htmlFor="export-to">To</Label>
            <DateInput
              id="export-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => { setTo(e.target.value); setStatus('idle') }}
            />
          </Field>
        </FieldRow>

        <Preview>
          <PreviewLabel>
            {from || to
              ? `Notes in selected range`
              : `All notes`}
          </PreviewLabel>
          <PreviewCount>
            {count === null ? '…' : `${count} ${count === 1 ? 'note' : 'notes'}`}
          </PreviewCount>
        </Preview>

        <Divider />

        <Footer>
          <StatusRow>
            {isLoading && <><Spinner /> Preparing export…</>}
            {isDone && lastResult && (
              <SuccessText>✓ {lastResult.total} notes exported</SuccessText>
            )}
            {isError && <span style={{ color: 'inherit', opacity: 0.5 }}>Export failed. Try again.</span>}
          </StatusRow>

          <Button $variant="ghost" $size="sm" onClick={handleCopy} disabled={isLoading || count === 0 || count === null}>
            Copy JSON
          </Button>
          <Button $size="sm" onClick={handleSave} disabled={isLoading || count === 0 || count === null}>
            Save to file…
          </Button>
        </Footer>
      </Card>
    </ModalBackdrop>
  )
}
