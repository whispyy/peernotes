import styled, { css } from 'styled-components'
import type { Sentiment } from '@shared/types'

interface BadgeProps {
  $sentiment: Sentiment
}

export const Badge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  letter-spacing: 0.02em;
  text-transform: uppercase;

  ${({ $sentiment, theme }) =>
    $sentiment === 'positive'
      ? css`
          background: ${theme.colors.sentiment.positiveSubtle};
          color: ${theme.colors.sentiment.positive};
        `
      : $sentiment === 'negative'
      ? css`
          background: ${theme.colors.sentiment.negativeSubtle};
          color: ${theme.colors.sentiment.negative};
        `
      : css`
          background: ${theme.colors.sentiment.neutralSubtle};
          color: ${theme.colors.sentiment.neutral};
        `}
`

