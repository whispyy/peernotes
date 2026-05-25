import { useState, useEffect, useCallback, useRef, useMemo, memo, Fragment, isValidElement, cloneElement, type ReactNode } from 'react'
import styled from 'styled-components'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SENTIMENT_LABELS } from '@shared/types'
import type { Note, Person, Attachment } from '@shared/types'
import { Badge } from '../../atoms/Badge'
import { Avatar } from '../../atoms/Avatar'

interface Props {
  note: Note
  person: Person
  showPerson?: boolean
  onDelete?: (id: string) => void
  onEdit?: (note: Note) => void
  highlight?: string
}

const Card = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['3']};
  padding: ${({ theme }) => theme.spacing['3']} ${({ theme }) => theme.spacing['4']};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  transition: border-color 0.12s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`

const Body = styled.div`
  flex: 1;
  min-width: 0;
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  margin-bottom: ${({ theme }) => theme.spacing['1.5']};
`

const Name = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

const Timestamp = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-left: auto;
`

const MarkdownWrapper = styled.div`
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  word-break: break-word;

  > *:first-child { margin-top: 0; }
  > *:last-child { margin-bottom: 0; }

  p { margin: 0 0 ${({ theme }) => theme.spacing['2']}; }

  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    margin: ${({ theme }) => theme.spacing['3']} 0 ${({ theme }) => theme.spacing['1']};
  }
  h1 { font-size: 1.2em; }
  h2 { font-size: 1.1em; }
  h3, h4, h5, h6 { font-size: 1em; }

  strong { font-weight: ${({ theme }) => theme.typography.weight.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
  em { font-style: italic; }
  del { text-decoration: line-through; }

  ul, ol {
    margin: ${({ theme }) => theme.spacing['1']} 0;
    padding-left: ${({ theme }) => theme.spacing['4']};
  }
  li { margin: 2px 0; }
  li p { margin: 0; }

  code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.85em;
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radius.sm};
    padding: 1px 5px;
  }
  pre {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radius.sm};
    padding: ${({ theme }) => theme.spacing['2']};
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
    margin: ${({ theme }) => theme.spacing['3']} 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: ${({ theme }) => theme.spacing['2']} 0;
    font-size: ${({ theme }) => theme.typography.size.sm};
  }
  th, td {
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    padding: ${({ theme }) => theme.spacing['1']} ${({ theme }) => theme.spacing['2']};
    text-align: left;
  }
  th {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`

const Mark = styled.mark`
  background: ${({ theme }) => theme.colors.accent}33;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 2px;
  padding: 0 1px;
`

const Actions = styled.div<{ $visible?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['0.5']};
  max-width: ${({ $visible }) => ($visible ? '160px' : '0')};
  overflow: hidden;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: max-width 0.15s ease, opacity 0.12s ease;

  ${Card}:hover & {
    max-width: 160px;
    opacity: 1;
  }
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
  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }
`

const DeleteBtn = styled(ActionBtn)`
  font-size: 16px;
  &:hover {
    color: ${({ theme }) => theme.colors.danger};
  }
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

const ThumbnailStrip = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1.5']};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing['2']};
`

const Thumbnail = styled.img`
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  cursor: pointer;
  transition: border-color 0.12s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightNode(node: ReactNode, query: string): ReactNode {
  if (!query.trim()) return node

  if (typeof node === 'string') {
    const parts = node.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
    if (parts.length === 1) return node
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <Mark key={i}>{part}</Mark>
        : part
    )
  }

  if (Array.isArray(node)) {
    return (node as ReactNode[]).map((child, i) => {
      const result = highlightNode(child, query)
      if (result === child) return result
      if (typeof child === 'string') return <Fragment key={i}>{result}</Fragment>
      return result
    })
  }

  if (isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode }
    if (children == null) return node
    const highlighted = highlightNode(children, query)
    if (highlighted === children) return node
    return cloneElement(node as React.ReactElement<{ children: ReactNode }>, { children: highlighted })
  }

  return node
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <Mark key={part + i}>{part}</Mark>
          : part
      )}
    </>
  )
}

const MarkdownNote = memo(function MarkdownNote({ text, query }: { text: string; query: string }) {
  const components = useMemo(() => ({
    p: ({ children }: { children?: ReactNode; node?: unknown }) =>
      <p>{highlightNode(children, query)}</p>,
    h1: ({ children }: { children?: ReactNode; node?: unknown }) =>
      <h1>{highlightNode(children, query)}</h1>,
    h2: ({ children }: { children?: ReactNode; node?: unknown }) =>
      <h2>{highlightNode(children, query)}</h2>,
    h3: ({ children }: { children?: ReactNode; node?: unknown }) =>
      <h3>{highlightNode(children, query)}</h3>,
    h4: ({ children }: { children?: ReactNode; node?: unknown }) =>
      <h4>{highlightNode(children, query)}</h4>,
    h5: ({ children }: { children?: ReactNode; node?: unknown }) =>
      <h5>{highlightNode(children, query)}</h5>,
    h6: ({ children }: { children?: ReactNode; node?: unknown }) =>
      <h6>{highlightNode(children, query)}</h6>,
    a: ({ href, children }: { href?: string; children?: ReactNode; node?: unknown }) => (
      <a href={href} onClick={(e) => { e.preventDefault(); if (href) window.open(href) }}>
        {highlightNode(children, query)}
      </a>
    ),
  }), [query])

  return (
    <MarkdownWrapper>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components as never}>
        {text}
      </ReactMarkdown>
    </MarkdownWrapper>
  )
})

export function NoteCard({ note, person, showPerson = false, onDelete, onEdit, highlight = '' }: Props) {
  const showActions = onEdit || onDelete
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [thumbPaths, setThumbPaths] = useState<Record<string, string>>({})
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.attachments.list(note.id).then(setAttachments)
    // Re-fetch when any notes:updated event fires (covers attachment add/remove via edit modal)
    return window.api.notes.onUpdated(() => {
      window.api.attachments.list(note.id).then(setAttachments)
    })
  }, [note.id])

  useEffect(() => {
    if (attachments.length === 0) return
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

  const closeLightbox = useCallback(() => setLightboxSrc(null), [])

  useEffect(() => {
    if (!confirming) return
    function handleClickOutside(e: MouseEvent) {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [confirming])

  useEffect(() => {
    if (!lightboxSrc) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxSrc, closeLightbox])

  return (
    <>
      <Card>
        {showPerson && <Avatar name={person.name} size={32} />}
        <Body>
          <Meta>
            {showPerson && (
              <Name>
                <Highlighted text={person.name} query={highlight} />
              </Name>
            )}
            <Badge $sentiment={note.sentiment}>{SENTIMENT_LABELS[note.sentiment]}</Badge>
            <Timestamp>{formatDate(note.timestamp)}</Timestamp>
            {showActions && (
              <Actions $visible={confirming}>
                {confirming ? (
                  <ConfirmRow ref={confirmRef}>
                    <ConfirmLabel>Delete?</ConfirmLabel>
                    <ConfirmYes onClick={() => { setConfirming(false); onDelete!(note.id) }}>Yes</ConfirmYes>
                    <ConfirmNo onClick={() => setConfirming(false)}>No</ConfirmNo>
                  </ConfirmRow>
                ) : (
                  <>
                    {onEdit && (
                      <EditBtn onClick={() => onEdit(note)} title="Edit">✎</EditBtn>
                    )}
                    {onDelete && (
                      <DeleteBtn onClick={() => setConfirming(true)} title="Delete">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.75 3.5h10.5M4.667 3.5V2.333a.583.583 0 0 1 .583-.583h3.5a.583.583 0 0 1 .583.583V3.5m1.75 0v7.583a.583.583 0 0 1-.583.584H3.5a.583.583 0 0 1-.583-.584V3.5h8.166Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </DeleteBtn>
                    )}
                  </>
                )}
              </Actions>
            )}
          </Meta>
          <MarkdownNote text={note.note} query={highlight} />
          {attachments.length > 0 && (
            <ThumbnailStrip>
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
            </ThumbnailStrip>
          )}
        </Body>
      </Card>
      {lightboxSrc && (
        <LightboxOverlay onClick={closeLightbox}>
          <LightboxImage
            src={lightboxSrc}
            onClick={(e) => e.stopPropagation()}
          />
        </LightboxOverlay>
      )}
    </>
  )
}
