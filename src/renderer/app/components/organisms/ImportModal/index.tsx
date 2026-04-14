import { useState, useCallback } from 'react'
import styled from 'styled-components'
import type { ImportPayload, ImportResult } from '@shared/types'
import { Button } from '../../atoms/Button'
import {
  ModalBackdrop, Card, Header, Title, CloseBtn,
  Divider, Footer, Spinner, StatusRow
} from '../../molecules/ModalShell'

interface Props {
  onClose: () => void
  onImported?: () => void
}

// ─── Drop zone / open button ──────────────────────────────────────────────────

const DropZone = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['8']} ${({ theme }) => theme.spacing['6']};
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1.5px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.lg};
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
  width: 100%;
  font-family: ${({ theme }) => theme.typography.fontFamily};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.focus};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`

const DropZoneIcon = styled.span`
  font-size: 28px;
  line-height: 1;
`

const DropZoneLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`

const DropZoneSub = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

// ─── Preview ──────────────────────────────────────────────────────────────────

const Preview = styled.div`
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1']};
`

const PreviewRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const PreviewLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

const PreviewValue = styled.span`
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

const FileName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs ?? theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

// ─── Result / status ─────────────────────────────────────────────────────────

const ResultBox = styled.div`
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['1.5']};
`

const ResultLine = styled.p<{ $muted?: boolean }>`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ $muted, theme }) => ($muted ? theme.colors.text.muted : theme.colors.sentiment.positive)};
`

const ErrorText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.sentiment.negative};
`

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStatus = 'idle' | 'parsed' | 'importing' | 'done' | 'error'

interface ParsedFile {
  payload: ImportPayload
  noteCount: number
  peopleCount: number
  fileName: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFile(content: string): ImportPayload {
  const data = JSON.parse(content)
  if (!data || typeof data !== 'object') throw new Error('Invalid file format')
  if (!Array.isArray(data.notes)) throw new Error('File has no notes array')
  return data as ImportPayload
}

function countUniquePeople(payload: ImportPayload): number {
  return new Set(payload.notes.map((n) => n.person?.trim().toLowerCase()).filter(Boolean)).size
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportModal({ onClose, onImported }: Props) {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleOpen = useCallback(async () => {
    const file = await window.api.import.openFile()
    if (file === null) return // user cancelled

    try {
      const payload = parseFile(file.content)
      setParsed({
        payload,
        noteCount: payload.notes.length,
        peopleCount: countUniquePeople(payload),
        fileName: file.name
      })
      setStatus('parsed')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not read file')
      setStatus('error')
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (!parsed) return
    setStatus('importing')
    try {
      const res = await window.api.import.run(parsed.payload)
      setResult(res)
      setStatus('done')
      onImported?.()
    } catch {
      setErrorMsg('Import failed. Please try again.')
      setStatus('error')
    }
  }, [parsed, onImported])

  const isImporting = status === 'importing'

  return (
    <ModalBackdrop onClose={onClose}>
      <Card>
        <Header>
          <Title>Import Notes</Title>
          <CloseBtn onClick={onClose} aria-label="Close">×</CloseBtn>
        </Header>

        {/* Idle: show drop zone */}
        {(status === 'idle' || status === 'parsed') && (
          <DropZone onClick={handleOpen} type="button">
            <DropZoneIcon>📂</DropZoneIcon>
            <DropZoneLabel>Open export file…</DropZoneLabel>
            <DropZoneSub>Select a Peernotes JSON export</DropZoneSub>
          </DropZone>
        )}

        {/* Parsed: show preview */}
        {status === 'parsed' && parsed && (
          <Preview>
            <PreviewRow>
              <PreviewLabel>Notes in file</PreviewLabel>
              <PreviewValue>{parsed.noteCount}</PreviewValue>
            </PreviewRow>
            <PreviewRow>
              <PreviewLabel>People</PreviewLabel>
              <PreviewValue>{parsed.peopleCount}</PreviewValue>
            </PreviewRow>
            <FileName>{parsed.fileName}</FileName>
          </Preview>
        )}

        {/* Error */}
        {status === 'error' && (
          <ResultBox>
            <ErrorText>Could not import: {errorMsg}</ErrorText>
          </ResultBox>
        )}

        {/* Done */}
        {status === 'done' && result && (
          <ResultBox>
            <ResultLine>✓ {result.imported} {result.imported === 1 ? 'note' : 'notes'} imported</ResultLine>
            {result.peopleCreated > 0 && (
              <ResultLine $muted>
                {result.peopleCreated} new {result.peopleCreated === 1 ? 'person' : 'people'} created
              </ResultLine>
            )}
            {result.skipped > 0 && (
              <ResultLine $muted>
                {result.skipped} {result.skipped === 1 ? 'note' : 'notes'} skipped (duplicate or invalid)
              </ResultLine>
            )}
          </ResultBox>
        )}

        <Divider />

        <Footer>
          <StatusRow>
            {isImporting && <><Spinner /> Importing…</>}
          </StatusRow>

          {status === 'done' ? (
            <Button $size="sm" onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button $variant="ghost" $size="sm" onClick={onClose} disabled={isImporting}>
                Cancel
              </Button>
              {status === 'parsed' && (
                <Button $size="sm" onClick={handleImport} disabled={isImporting}>
                  Import {parsed?.noteCount} {parsed?.noteCount === 1 ? 'note' : 'notes'} →
                </Button>
              )}
            </>
          )}
        </Footer>
      </Card>
    </ModalBackdrop>
  )
}
