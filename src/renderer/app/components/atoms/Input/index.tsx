import styled from 'styled-components'

export const Input = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.base};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['3']};
  outline: none;
  transition: border-color 0.12s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.placeholder};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.border.focus};
  }
`
