import React from 'react'
import styled, { keyframes } from 'styled-components'

export const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`
export const slideUp = keyframes`from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) }`
export const spin = keyframes`to { transform: rotate(360deg) }`

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: ${fadeIn} 0.15s ease;
`

export const Card = styled.div`
  width: 480px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: ${({ theme }) => theme.spacing['6']};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['5']};
  animation: ${slideUp} 0.18s ease;
  box-shadow: 0 24px 48px rgba(0,0,0,0.5);
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const Title = styled.h2`
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`

export const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: color 0.1s;
  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  margin: 0;
`

export const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing['2']};
`

export const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${({ theme }) => theme.colors.border.default};
  border-top-color: ${({ theme }) => theme.colors.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  flex-shrink: 0;
`

export const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing['2']};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-right: auto;
`

// ModalBackdrop wraps Backdrop and centralises the "click outside to close" guard
// so modals don't each duplicate the e.target === e.currentTarget check.
interface ModalBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void
}

export function ModalBackdrop({ onClose, children, ...rest }: ModalBackdropProps) {
  return (
    <Backdrop
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      {...rest}
    >
      {children}
    </Backdrop>
  )
}
