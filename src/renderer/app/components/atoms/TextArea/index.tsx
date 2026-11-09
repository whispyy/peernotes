import styled, { css } from 'styled-components'

export const textAreaMetrics = css`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.base};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  padding: ${({ theme }) => theme.spacing['2.5']} ${({ theme }) => theme.spacing['3']};
  border: 1px solid transparent;
  box-sizing: border-box;
`

export const TextArea = styled.textarea`
  ${textAreaMetrics}
  width: 100%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-color: ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  resize: none;
  transition: border-color 0.12s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.placeholder};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.border.focus};
  }
`
