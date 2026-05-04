import styled, { css } from 'styled-components'
import { VALID_SENTIMENTS, SENTIMENT_LABELS } from '@shared/types'
import type { Sentiment } from '@shared/types'

interface Props {
  value: Sentiment
  onChange: (s: Sentiment) => void
  compact?: boolean
}

const options = VALID_SENTIMENTS.map((value) => ({ value, label: SENTIMENT_LABELS[value] }))

// ── Shared layout helper ──────────────────────────────────────────────────────

/** Row that places a PersonSelector and a compact SentimentPicker side-by-side. */
export const PersonSentimentRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${({ theme }) => theme.spacing['2']};
`

// ── Full segmented variant ────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 3px;
  gap: 2px;
`

const Dot = styled.span<{ $sentiment: Sentiment; $active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.12s ease;
  ${({ $sentiment, $active, theme }) => css`
    background: ${$active
      ? theme.colors.sentiment[$sentiment]
      : theme.colors.text.muted};
  `}
`

const Segment = styled.button<{ $sentiment: Sentiment; $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['3']};
  border: none;
  border-radius: calc(${({ theme }) => theme.radius.md} - 2px);
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;

  ${({ $sentiment, $active, theme }) => {
    const color = theme.colors.sentiment[$sentiment]
    return $active
      ? css`
          background: ${theme.colors.bg.secondary};
          color: ${color};
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.muted};
          &:hover {
            background: ${theme.colors.bg.tertiary};
            color: ${theme.colors.text.primary};
          }
        `
  }}
`

// ── Compact dots-only variant ─────────────────────────────────────────────────

const CompactWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  flex-shrink: 0;
`

const CompactSegment = styled.button<{ $sentiment: Sentiment; $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  border: none;
  border-radius: calc(${({ theme }) => theme.radius.md} - 2px);
  cursor: pointer;
  padding: 0;
  align-self: stretch;
  transition: background 0.12s ease;

  ${({ $active, theme }) => $active
    ? css`background: ${theme.colors.bg.secondary}; box-shadow: 0 1px 3px rgba(0,0,0,0.2);`
    : css`background: transparent; &:hover { background: ${theme.colors.bg.tertiary}; }`
  }
`

const CompactDot = styled.span<{ $sentiment: Sentiment; $active: boolean }>`
  width: ${({ $active }) => $active ? '10px' : '8px'};
  height: ${({ $active }) => $active ? '10px' : '8px'};
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.12s ease;
  ${({ $sentiment, $active, theme }) => css`
    background: ${$active
      ? theme.colors.sentiment[$sentiment]
      : `${theme.colors.sentiment[$sentiment]}55`};
    box-shadow: ${$active
      ? `0 0 0 2px ${theme.colors.sentiment[$sentiment]}44`
      : 'none'};
  `}
`

// ── Component ─────────────────────────────────────────────────────────────────

export function SentimentPicker({ value, onChange, compact = false }: Props) {
  if (compact) {
    return (
      <CompactWrapper>
        {options.map((o) => (
          <CompactSegment
            key={o.value}
            type="button"
            $sentiment={o.value}
            $active={value === o.value}
            onClick={() => onChange(o.value)}
            title={o.label}
          >
            <CompactDot $sentiment={o.value} $active={value === o.value} />
          </CompactSegment>
        ))}
      </CompactWrapper>
    )
  }

  return (
    <Wrapper>
      {options.map((o) => (
        <Segment
          key={o.value}
          type="button"
          $sentiment={o.value}
          $active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          <Dot $sentiment={o.value} $active={value === o.value} />
          {o.label}
        </Segment>
      ))}
    </Wrapper>
  )
}
