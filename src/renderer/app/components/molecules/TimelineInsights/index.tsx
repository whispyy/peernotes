import styled, { useTheme } from 'styled-components'
import type { Note } from '@shared/types'

interface Props {
  notes: Note[]
  hasMore?: boolean
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['4']};
  padding: ${({ theme }) => theme.spacing['2.5']} ${({ theme }) => theme.spacing['4']};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.lg};
  margin: ${({ theme }) => theme.spacing['4']} 0;
`

const Section = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
`

const MonthLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

const Count = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`

const Trend = styled.span<{ $direction: 'up' | 'down' | 'flat' }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ $direction, theme }) =>
    $direction === 'up'
      ? theme.colors.sentiment.positive
      : $direction === 'down'
      ? theme.colors.sentiment.negative
      : theme.colors.text.muted};
`

const Divider = styled.div`
  width: 1px;
  height: 14px;
  background: ${({ theme }) => theme.colors.border.default};
  flex-shrink: 0;
`

const SentimentDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const SentimentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`

const SentimentCount = styled.span`
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`

function getMonthBounds(year: number, month: number) {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1)
  }
}

function formatMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' })
}

export function TimelineInsights({ notes, hasMore }: Props) {
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()

  const { start: thisStart, end: thisEnd } = getMonthBounds(thisYear, thisMonth)
  const { start: prevStart, end: prevEnd } = getMonthBounds(thisYear, thisMonth - 1)

  const thisMonthNotes = notes.filter(n => {
    const d = new Date(n.timestamp)
    return d >= thisStart && d < thisEnd
  })
  const prevMonthNotes = notes.filter(n => {
    const d = new Date(n.timestamp)
    return d >= prevStart && d < prevEnd
  })

  const thisCount = thisMonthNotes.length
  const prevCount = prevMonthNotes.length

  const delta = thisCount - prevCount
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const trendArrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '='
  const prevMonthName = formatMonth(thisYear, thisMonth - 1)

  const positive = thisMonthNotes.filter(n => n.sentiment === 'positive').length
  const neutral = thisMonthNotes.filter(n => n.sentiment === 'neutral').length
  const negative = thisMonthNotes.filter(n => n.sentiment === 'negative').length

  const showTrend = !hasMore || prevCount > 0

  const theme = useTheme()

  if (thisCount === 0) return null

  return (
    <Bar>
      <Section>
        <MonthLabel>{formatMonth(thisYear, thisMonth)}</MonthLabel>
        <Count>{thisCount} {thisCount === 1 ? 'note' : 'notes'}</Count>
        {showTrend && prevCount > 0 && (
          <Trend $direction={direction}>
            {trendArrow} {Math.abs(delta)} vs {prevMonthName}
          </Trend>
        )}
        {showTrend && prevCount === 0 && (
          <Trend $direction="flat">first notes this month</Trend>
        )}
      </Section>

      <Divider />

      <Section>
        <SentimentItem>
          <SentimentDot $color={theme.colors.sentiment.positive} />
          <SentimentCount>{positive}</SentimentCount>
          positive
        </SentimentItem>
        <SentimentItem>
          <SentimentDot $color={theme.colors.sentiment.neutral} />
          <SentimentCount>{neutral}</SentimentCount>
          neutral
        </SentimentItem>
        <SentimentItem>
          <SentimentDot $color={theme.colors.sentiment.negative} />
          <SentimentCount>{negative}</SentimentCount>
          negative
        </SentimentItem>
      </Section>
    </Bar>
  )
}
