import styled from 'styled-components'

const Row = styled.div<{ $compact?: boolean }>`
  display: flex;
  justify-content: center;
  padding: ${({ $compact, theme }) =>
    $compact ? `${theme.spacing['2']} 0` : `${theme.spacing['4']} 0`};
`

const Btn = styled.button`
  padding: ${({ theme }) => theme.spacing['1.5']} ${({ theme }) => theme.spacing['4']};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.muted};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.sm};
  cursor: pointer;
  transition: all 0.1s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled { opacity: 0.5; cursor: default; }
`

interface Props {
  loading: boolean
  onClick: () => void
  compact?: boolean
}

export function LoadMore({ loading, onClick, compact }: Props) {
  return (
    <Row $compact={compact}>
      <Btn onClick={onClick} disabled={loading}>
        {loading ? 'Loading…' : 'Load more'}
      </Btn>
    </Row>
  )
}
