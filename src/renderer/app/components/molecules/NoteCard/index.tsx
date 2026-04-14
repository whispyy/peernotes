import styled from 'styled-components'
import { SENTIMENT_LABELS } from '@shared/types'
import type { Note, Person } from '@shared/types'
import { Badge } from '../../atoms/Badge'
import { Avatar } from '../../atoms/Avatar'

interface Props {
  note: Note
  person: Person
  showPerson?: boolean
  onDelete?: (id: string) => void
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

const NoteText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  word-break: break-word;
`

const Mark = styled.mark`
  background: ${({ theme }) => theme.colors.accent}33;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 2px;
  padding: 0 1px;
`

const DeleteBtn = styled.button`
  opacity: 0;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  align-self: flex-start;
  transition: opacity 0.12s ease, color 0.12s ease;

  ${Card}:hover & {
    opacity: 1;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.danger};
  }
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

export function NoteCard({ note, person, showPerson = false, onDelete, highlight = '' }: Props) {
  return (
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
        </Meta>
        <NoteText>
          <Highlighted text={note.note} query={highlight} />
        </NoteText>
      </Body>
      {onDelete && (
        <DeleteBtn onClick={() => onDelete(note.id)} title="Delete">×</DeleteBtn>
      )}
    </Card>
  )
}
