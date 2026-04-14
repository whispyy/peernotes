import styled from 'styled-components'

interface AvatarProps {
  name: string
  size?: number
}

const colors = [
  '#5E5CE6', '#0A84FF', '#30D158', '#FF9F0A',
  '#FF6961', '#BF5AF2', '#32ADE6', '#FF375F'
]

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const Circle = styled.div<{ $bg: string; $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => Math.round($size * 0.38)}px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.02em;
`

export function Avatar({ name, size = 32 }: AvatarProps) {
  return (
    <Circle $bg={colorForName(name)} $size={size}>
      {initials(name)}
    </Circle>
  )
}
