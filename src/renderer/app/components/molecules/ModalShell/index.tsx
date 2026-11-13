import React, { useRef, useState, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'

const CARD_WIDTH = 480
const VIEWPORT_GUTTER = 32
const GRIP = 10

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
  width: ${CARD_WIDTH}px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: ${({ theme }) => theme.spacing['5']};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing['4']};
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
  const pressedOnBackdrop = useRef(false)
  return (
    <Backdrop
      onPointerDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget }}
      // A drag that starts in the card (resize, text selection) and ends on the backdrop clicks the backdrop.
      onClick={(e) => { if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose() }}
      {...rest}
    >
      {children}
    </Backdrop>
  )
}

type Edge = -1 | 0 | 1

const GRIPS: [Edge, Edge][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
]

function gripPlacement(edge: Edge, start: string, end: string, size: string): string {
  if (edge === 0) return `${start}: ${GRIP / 2}px; ${end}: ${GRIP / 2}px;`
  return `${edge < 0 ? start : end}: ${-GRIP / 2}px; ${size}: ${GRIP}px;`
}

function gripCursor(x: Edge, y: Edge): string {
  if (x === 0) return 'ns-resize'
  if (y === 0) return 'ew-resize'
  return x === y ? 'nwse-resize' : 'nesw-resize'
}

const ResizableFrame = styled(Card)`
  position: relative;
`

const Grip = styled.div<{ $x: Edge; $y: Edge }>`
  position: absolute;
  ${({ $x }) => gripPlacement($x, 'left', 'right', 'width')}
  ${({ $y }) => gripPlacement($y, 'top', 'bottom', 'height')}
  cursor: ${({ $x, $y }) => gripCursor($x, $y)};
`

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

interface CardSize {
  width: number
  height: number
}

function readStoredSize(storageKey: string): CardSize | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    return Number.isFinite(parsed?.width) && Number.isFinite(parsed?.height) ? parsed : null
  } catch {
    return null
  }
}

interface ResizableCardProps {
  storageKey: string
  children: ReactNode
}

export function ResizableCard({ storageKey, children }: ResizableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<CardSize | null>(() => readStoredSize(storageKey))

  const startResize = (x: Edge, y: Edge) => (e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card || e.button !== 0) return
    e.preventDefault()
    const grip = e.currentTarget
    grip.setPointerCapture(e.pointerId)
    const start = card.getBoundingClientRect()
    const { clientX: originX, clientY: originY } = e
    let latest: CardSize | null = null

    const onMove = (ev: PointerEvent) => {
      // The card stays centred, so each edge moves half the size change: double it to keep the edge under the pointer.
      latest = {
        width: clamp(start.width + 2 * x * (ev.clientX - originX), CARD_WIDTH, window.innerWidth - VIEWPORT_GUTTER),
        height: clamp(start.height + 2 * y * (ev.clientY - originY), 0, window.innerHeight - VIEWPORT_GUTTER),
      }
      setSize(latest)
    }
    const onEnd = () => {
      if (latest) localStorage.setItem(storageKey, JSON.stringify(latest))
      grip.removeEventListener('pointermove', onMove)
      grip.removeEventListener('pointerup', onEnd)
      grip.removeEventListener('pointercancel', onEnd)
    }
    grip.addEventListener('pointermove', onMove)
    grip.addEventListener('pointerup', onEnd)
    grip.addEventListener('pointercancel', onEnd)
  }

  return (
    <ResizableFrame
      ref={cardRef}
      // min-height rather than height, so the card still grows when its content does (find bar, thumbnails).
      style={size ? {
        width: `min(${size.width}px, 100vw - ${VIEWPORT_GUTTER}px)`,
        minHeight: `min(${size.height}px, 100vh - ${VIEWPORT_GUTTER}px)`,
      } : undefined}
    >
      {children}
      {GRIPS.map(([x, y]) => (
        <Grip key={`${x}${y}`} $x={x} $y={y} onPointerDown={startResize(x, y)} aria-hidden />
      ))}
    </ResizableFrame>
  )
}
