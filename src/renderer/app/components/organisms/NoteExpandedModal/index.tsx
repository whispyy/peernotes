import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Note, Person } from '@shared/types'
import { SENTIMENT_LABELS } from '@shared/types'
import { Badge } from '../../atoms/Badge'
import { Avatar } from '../../atoms/Avatar'

interface Props {
  note: Note
  person: Person
  onClose: () => void
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing['6']};
`

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 760px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

const Body = styled.div`
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing['5']};
  flex: 1;
`

const MarkdownWrapper = styled.div`
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  word-break: break-word;
  user-select: text;

  > *:first-child { margin-top: 0; }
  > *:last-child { margin-bottom: 0; }

  p { margin: 0 0 ${({ theme }) => theme.spacing['2']}; }

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
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
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

export function NoteExpandedModal({ note, person, onClose }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (dropdownOpen) { setDropdownOpen(false); return }
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, dropdownOpen])

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
      <Panel onClick={(e) => e.stopPropagation()}>
        <Header>
          <Avatar name={person.name} size={28} />
          <PersonName>{person.name}</PersonName>
          <Badge $sentiment={note.sentiment}>{SENTIMENT_LABELS[note.sentiment]}</Badge>
          <Timestamp>{formatDate(note.timestamp)}</Timestamp>
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
          <CloseBtn onClick={onClose} title="Close (Esc)">×</CloseBtn>
        </Header>
        <Body>
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
        </Body>
      </Panel>
    </Overlay>
  )
}
