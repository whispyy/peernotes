import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Attachment, Note, Person } from '@shared/types'
import { SENTIMENT_LABELS } from '@shared/types'
import { Badge } from '../../atoms/Badge'
import { Avatar } from '../../atoms/Avatar'

interface Props {
  note: Note
  peopleById: Record<string, Person>
  notes?: Note[]
  onClose: () => void
  onNavigate?: (note: Note) => void
  onEdit?: (note: Note) => void
  onDelete?: (id: string) => void
}

// ─── Motion ──────────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const riseIn = keyframes`
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`

// ─── Layout ──────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing['6']};
  animation: ${fadeIn} 0.15s ease;
`

const sentimentColor = (theme: any, sentiment: Note['sentiment']) =>
  sentiment === 'positive'
    ? theme.colors.sentiment.positive
    : sentiment === 'negative'
    ? theme.colors.sentiment.negative
    : theme.colors.sentiment.neutral

const Panel = styled.div<{ $sentiment: Note['sentiment'] }>`
  position: relative;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-top: 3px solid ${({ theme, $sentiment }) => sentimentColor(theme, $sentiment)};
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 820px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${riseIn} 0.16s cubic-bezier(0.2, 0.8, 0.3, 1);
`

const NavBtn = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 12px;' : 'right: 12px;')}
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.bg.elevated};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  opacity: 0.55;
  transition: opacity 0.12s ease, color 0.12s ease;

  &:hover:not(:disabled) {
    opacity: 1;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0;
    pointer-events: none;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  padding: ${({ theme }) => theme.spacing['4']} ${({ theme }) => theme.spacing['5']};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  flex-shrink: 0;
`

const PersonName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

const Timestamp = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-left: auto;
  white-space: nowrap;
`

const Position = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['0.5']};
`

const ActionBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing['0.5']} ${({ theme }) => theme.spacing['1']};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 14px;
  line-height: 1;
  transition: color 0.12s ease;
`

const EditBtn = styled(ActionBtn)`
  &:hover { color: ${({ theme }) => theme.colors.accent}; }
`

const DeleteBtn = styled(ActionBtn)`
  font-size: 16px;
  &:hover { color: ${({ theme }) => theme.colors.danger}; }
`

const ConfirmRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['1']};
`

const ConfirmLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.danger};
  white-space: nowrap;
  line-height: 1;
`

const confirmBtnBase = `
  border-radius: 4px;
  padding: 0 8px;
  height: 22px;
  font-size: 11px;
  cursor: pointer;
  line-height: 1;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
`

const ConfirmYes = styled.button`
  ${confirmBtnBase}
  background: ${({ theme }) => theme.colors.danger};
  color: #fff;
  border: none;
`

const ConfirmNo = styled.button`
  ${confirmBtnBase}
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.muted};
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: ${({ theme }) => theme.spacing['0.5']} ${({ theme }) => theme.spacing['1']};
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: color 0.12s ease;
  margin-left: ${({ theme }) => theme.spacing['1']};
  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`

const BodyWrapper = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const Body = styled.div`
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing['6']} ${({ theme }) => theme.spacing['5']};
  flex: 1;
`

const ScrollFade = styled.div<{ $visible: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 36px;
  background: linear-gradient(to bottom, transparent, ${({ theme }) => theme.colors.bg.primary});
  pointer-events: none;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s ease;
`

const ContentColumn = styled.div`
  max-width: 640px;
  margin: 0 auto;
`

const MarkdownWrapper = styled.div`
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  word-break: break-word;
  user-select: text;

  > *:first-child { margin-top: 0; }
  > *:last-child { margin-bottom: 0; }

  p { margin: 0 0 ${({ theme }) => theme.spacing['3']}; }

  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    margin: ${({ theme }) => theme.spacing['4']} 0 ${({ theme }) => theme.spacing['1']};
  }
  h1 { font-size: 1.4em; }
  h2 { font-size: 1.25em; }
  h3 { font-size: 1.1em; }
  h4, h5, h6 { font-size: 1em; }

  strong { font-weight: ${({ theme }) => theme.typography.weight.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
  em { font-style: italic; }
  del { text-decoration: line-through; }

  ul, ol {
    margin: ${({ theme }) => theme.spacing['1']} 0;
    padding-left: ${({ theme }) => theme.spacing['5']};
  }
  li { margin: 4px 0; }
  li p { margin: 0; }

  code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8em;
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radius.sm};
    padding: 1px 5px;
  }
  pre {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radius.sm};
    padding: ${({ theme }) => theme.spacing['3']};
    overflow-x: auto;
    margin: ${({ theme }) => theme.spacing['2']} 0;
    code { background: none; border: none; padding: 0; }
  }

  blockquote {
    border-left: 3px solid ${({ theme }) => theme.colors.border.default};
    margin: ${({ theme }) => theme.spacing['2']} 0;
    padding-left: ${({ theme }) => theme.spacing['3']};
    color: ${({ theme }) => theme.colors.text.muted};
    p { margin: 0; }
  }

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-decoration: underline;
    cursor: pointer;
    &:hover { opacity: 0.8; }
  }

  hr {
    border: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    margin: ${({ theme }) => theme.spacing['4']} 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: ${({ theme }) => theme.spacing['2']} 0;
    font-size: ${({ theme }) => theme.typography.size.sm};
  }
  th, td {
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['2']};
    text-align: left;
  }
  th {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`

// ─── Attachments ─────────────────────────────────────────────────────────────

const AttachmentsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing['5']};
  padding-top: ${({ theme }) => theme.spacing['4']};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`

const AttachmentsLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: ${({ theme }) => theme.spacing['2']};
`

const ThumbnailGrid = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['2']};
  flex-wrap: wrap;
`

const Thumbnail = styled.img`
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  cursor: pointer;
  transition: border-color 0.12s ease;
  &:hover { border-color: ${({ theme }) => theme.colors.border.default}; }
`

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 700;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
`

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`

const LightboxClose = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255, 255, 255, 0.25); }
`

// ─── Export dropdown ─────────────────────────────────────────────────────────

const ExportWrapper = styled.div`
  position: relative;
`

const ExportBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.xs};
  padding: 3px ${({ theme }) => theme.spacing['2']};
  transition: color 0.12s, border-color 0.12s;
  white-space: nowrap;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.focus};
  }
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  min-width: 140px;
  z-index: 10;
  overflow: hidden;
`

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  width: 100%;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  text-align: left;
  transition: background 0.1s;
  &:hover { background: ${({ theme }) => theme.colors.bg.secondary}; }
`

const DropdownLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']} 2px;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

function safeFilename(person: string, date: string): string {
  return `${person.replace(/[^a-z0-9]/gi, '_')}_${date.replace(/[^a-z0-9]/gi, '_')}`
}

function buildTxt(note: Note, person: Person): string {
  const date = formatDate(note.timestamp)
  return [
    `Person:    ${person.name}`,
    `Date:      ${date}`,
    `Sentiment: ${note.sentiment}`,
    '',
    '─'.repeat(40),
    '',
    note.note,
  ].join('\n')
}

function buildMarkdown(note: Note, person: Person): string {
  const date = formatDate(note.timestamp)
  return [
    '---',
    `person: ${person.name}`,
    `date: ${date}`,
    `sentiment: ${note.sentiment}`,
    '---',
    '',
    note.note,
  ].join('\n')
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NoteExpandedModal({ note, peopleById, notes, onClose, onNavigate, onEdit, onDelete }: Props) {
  const person = peopleById[note.personId]
  const list = notes && notes.length > 0 ? notes : [note]
  const index = list.findIndex((n) => n.id === note.id)
  const prevNote = index > 0 ? list[index - 1] : null
  const nextNote = index !== -1 && index < list.length - 1 ? list[index + 1] : null

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [thumbPaths, setThumbPaths] = useState<Record<string, string>>({})
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [showFade, setShowFade] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const goPrev = useCallback(() => {
    if (prevNote) onNavigate?.(prevNote)
  }, [prevNote, onNavigate])

  const goNext = useCallback(() => {
    if (nextNote) onNavigate?.(nextNote)
  }, [nextNote, onNavigate])

  const closeLightbox = useCallback(() => setLightboxSrc(null), [])

  const updateFade = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  // Reset transient UI state and scroll position when the displayed note changes
  useEffect(() => {
    setDropdownOpen(false)
    setConfirmingDelete(false)
    setLightboxSrc(null)
    bodyRef.current?.scrollTo({ top: 0 })
  }, [note.id])

  useEffect(() => {
    window.api.attachments.list(note.id).then(setAttachments)
    return window.api.notes.onUpdated(() => {
      window.api.attachments.list(note.id).then(setAttachments)
    })
  }, [note.id])

  useEffect(() => {
    if (attachments.length === 0) { setThumbPaths({}); return }
    let cancelled = false
    async function resolvePaths() {
      const entries: Record<string, string> = {}
      for (const att of attachments) {
        const p = await window.api.attachments.getPath(att.id)
        if (p && !cancelled) entries[att.id] = `attachment://${p}`
      }
      if (!cancelled) setThumbPaths(entries)
    }
    resolvePaths()
    return () => { cancelled = true }
  }, [attachments])

  useEffect(() => {
    updateFade()
  }, [note.id, attachments, updateFade])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxSrc) {
        if (e.key === 'Escape') closeLightbox()
        return
      }
      if (e.key === 'Escape') {
        if (dropdownOpen) { setDropdownOpen(false); return }
        if (confirmingDelete) { setConfirmingDelete(false); return }
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, dropdownOpen, confirmingDelete, lightboxSrc, closeLightbox, goPrev, goNext])

  useEffect(() => {
    if (!dropdownOpen) return
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [dropdownOpen])

  useEffect(() => {
    if (!confirmingDelete) return
    function onClickOutside(e: MouseEvent) {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setConfirmingDelete(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [confirmingDelete])

  if (!person) return null

  const base = safeFilename(person.name, formatDate(note.timestamp))

  const handleExportTxt = async () => {
    setDropdownOpen(false)
    await window.api.export.saveText(
      buildTxt(note, person),
      `${base}.txt`,
      [{ name: 'Plain Text', extensions: ['txt'] }]
    )
  }

  const handleExportMd = async () => {
    setDropdownOpen(false)
    await window.api.export.saveText(
      buildMarkdown(note, person),
      `${base}.md`,
      [{ name: 'Markdown', extensions: ['md'] }]
    )
  }

  return (
    <Overlay onClick={onClose}>
      <Panel $sentiment={note.sentiment} onClick={(e) => e.stopPropagation()}>
        <NavBtn $side="left" onClick={goPrev} disabled={!prevNote} title="Previous note (←)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.5 2.5 3.5 7l5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </NavBtn>
        <NavBtn $side="right" onClick={goNext} disabled={!nextNote} title="Next note (→)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 2.5 10.5 7l-5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </NavBtn>

        <Header>
          <Avatar name={person.name} size={28} />
          <PersonName>{person.name}</PersonName>
          <Badge $sentiment={note.sentiment}>{SENTIMENT_LABELS[note.sentiment]}</Badge>
          <Timestamp title={formatDateTime(note.timestamp)}>{formatDate(note.timestamp)}</Timestamp>
          {list.length > 1 && index !== -1 && <Position>{index + 1} / {list.length}</Position>}

          <HeaderActions>
            {confirmingDelete ? (
              <ConfirmRow ref={confirmRef}>
                <ConfirmLabel>Delete?</ConfirmLabel>
                <ConfirmYes onClick={() => { setConfirmingDelete(false); onDelete?.(note.id) }}>Yes</ConfirmYes>
                <ConfirmNo onClick={() => setConfirmingDelete(false)}>No</ConfirmNo>
              </ConfirmRow>
            ) : (
              <>
                {onEdit && <EditBtn onClick={() => onEdit(note)} title="Edit">✎</EditBtn>}
                {onDelete && (
                  <DeleteBtn onClick={() => setConfirmingDelete(true)} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1.75 3.5h10.5M4.667 3.5V2.333a.583.583 0 0 1 .583-.583h3.5a.583.583 0 0 1 .583.583V3.5m1.75 0v7.583a.583.583 0 0 1-.583.584H3.5a.583.583 0 0 1-.583-.584V3.5h8.166Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </DeleteBtn>
                )}
              </>
            )}
            <ExportWrapper ref={dropdownRef}>
              <ExportBtn onClick={() => setDropdownOpen((o) => !o)}>
                Export ↓
              </ExportBtn>
              {dropdownOpen && (
                <Dropdown>
                  <DropdownLabel>Export as</DropdownLabel>
                  <DropdownItem onClick={handleExportTxt}>Plain text (.txt)</DropdownItem>
                  <DropdownItem onClick={handleExportMd}>Markdown (.md)</DropdownItem>
                </Dropdown>
              )}
            </ExportWrapper>
          </HeaderActions>
          <CloseBtn onClick={onClose} title="Close (Esc)">×</CloseBtn>
        </Header>

        <BodyWrapper>
          <Body ref={bodyRef} onScroll={updateFade}>
            <ContentColumn>
              <MarkdownWrapper>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} onClick={(e) => { e.preventDefault(); if (href) window.open(href) }}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {note.note}
                </ReactMarkdown>
              </MarkdownWrapper>

              {attachments.length > 0 && (
                <AttachmentsSection>
                  <AttachmentsLabel>Attachments</AttachmentsLabel>
                  <ThumbnailGrid>
                    {attachments.map((att) =>
                      thumbPaths[att.id] ? (
                        <Thumbnail
                          key={att.id}
                          src={thumbPaths[att.id]}
                          alt={att.filename}
                          title={att.filename}
                          onClick={() => setLightboxSrc(thumbPaths[att.id])}
                        />
                      ) : null
                    )}
                  </ThumbnailGrid>
                </AttachmentsSection>
              )}
            </ContentColumn>
          </Body>
          <ScrollFade $visible={showFade} />
        </BodyWrapper>
      </Panel>

      {lightboxSrc && createPortal(
        <LightboxOverlay onClick={(e) => { e.stopPropagation(); closeLightbox() }}>
          <LightboxClose onClick={closeLightbox} title="Close">✕</LightboxClose>
          <LightboxImage src={lightboxSrc} onClick={(e) => e.stopPropagation()} />
        </LightboxOverlay>,
        document.body
      )}
    </Overlay>
  )
}
