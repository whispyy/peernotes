import styled, { css } from 'styled-components'
import { VALID_SENTIMENTS, SENTIMENT_LABELS } from '@shared/types'
import type { Sentiment } from '@shared/types'

interface Props {
  value: Sentiment
  onChange: (s: Sentiment) => void
}

const options = VALID_SENTIMENTS.map((value) => ({ value, label: SENTIMENT_LABELS[value] }))

const Wrapper = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing['1.5']};
`

const Pill = styled.button<{ $sentiment: Sentiment; $active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing['1.5']} 0;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid transparent;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.12s ease;

  ${({ $sentiment, $active, theme }) => {
    const map = {
      positive: { color: theme.colors.sentiment.positive, bg: theme.colors.sentiment.positiveSubtle },
      neutral: { color: theme.colors.sentiment.neutral, bg: theme.colors.sentiment.neutralSubtle },
      negative: { color: theme.colors.sentiment.negative, bg: theme.colors.sentiment.negativeSubtle }
    }
    const { color, bg } = map[$sentiment]
    return $active
      ? css`
          background: ${bg};
          border-color: ${color};
          color: ${color};
        `
      : css`
          background: ${theme.colors.bg.secondary};
          color: ${theme.colors.text.muted};
          &:hover {
            background: ${bg};
            color: ${color};
          }
        `
  }}
`

export function SentimentPicker({ value, onChange }: Props) {
  return (
    <Wrapper>
      {options.map((o) => (
        <Pill
          key={o.value}
          type="button"
          $sentiment={o.value}
          $active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Pill>
      ))}
    </Wrapper>
  )
}
