import styled, { css } from 'styled-components'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps {
  $variant?: Variant
  $size?: Size
}

export const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing['1.5']};
  border: none;
  cursor: pointer;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  border-radius: ${({ theme }) => theme.radius.md};
  transition: background 0.12s ease, opacity 0.12s ease;
  white-space: nowrap;

  ${({ $size = 'md', theme }) =>
    $size === 'sm'
      ? css`
          font-size: ${theme.typography.size.sm};
          padding: ${theme.spacing['1.5']} ${theme.spacing['3']};
          height: 28px;
        `
      : css`
          font-size: ${theme.typography.size.base};
          padding: ${theme.spacing['2']} ${theme.spacing['4']};
          height: 34px;
        `}

  ${({ $variant = 'primary', theme }) =>
    $variant === 'primary'
      ? css`
          background: ${theme.colors.accent};
          color: #fff;
          &:hover { background: ${theme.colors.accentHover}; }
          &:active { background: ${theme.colors.accentActive}; }
        `
      : $variant === 'ghost'
      ? css`
          background: transparent;
          color: ${theme.colors.text.secondary};
          &:hover { background: ${theme.colors.bg.tertiary}; }
          &:active { background: ${theme.colors.bg.elevated}; }
        `
      : css`
          background: ${theme.colors.sentiment.negativeSubtle};
          color: ${theme.colors.danger};
          &:hover { background: rgba(255,59,48,0.2); }
        `}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
