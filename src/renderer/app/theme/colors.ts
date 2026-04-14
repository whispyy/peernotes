export const darkColors = {
  bg: {
    primary: '#1C1C1E',
    secondary: '#2C2C2E',
    tertiary: '#3A3A3C',
    elevated: '#3A3A3C'
  },
  text: {
    primary: '#F2F2F7',
    secondary: 'rgba(235,235,245,0.8)',
    muted: '#98989D',
    placeholder: '#636366'
  },
  sentiment: {
    positive: '#34C759',
    positiveSubtle: 'rgba(52,199,89,0.12)',
    neutral: '#98989D',
    neutralSubtle: 'rgba(152,152,157,0.12)',
    negative: '#FF3B30',
    negativeSubtle: 'rgba(255,59,48,0.12)'
  },
  border: {
    default: 'rgba(255,255,255,0.08)',
    subtle: 'rgba(255,255,255,0.04)',
    focus: '#0A84FF'
  },
  accent: '#0A84FF',
  accentHover: '#0A7AE8',
  accentActive: '#0A6ED4',
  danger: '#FF3B30',
  dangerBorder: 'rgba(255,59,48,0.27)',
  overlay: 'rgba(0,0,0,0.6)',
  glass: 'rgba(28, 28, 30, 0.92)'
} as const

export const lightColors = {
  bg: {
    primary: '#F2F2F7',
    secondary: '#FFFFFF',
    tertiary: '#E5E5EA',
    elevated: '#FFFFFF'
  },
  text: {
    primary: '#1C1C1E',
    secondary: 'rgba(60,60,67,0.85)',
    muted: '#8E8E93',
    placeholder: '#C7C7CC'
  },
  sentiment: {
    positive: '#248A3D',
    positiveSubtle: 'rgba(36,138,61,0.1)',
    neutral: '#8E8E93',
    neutralSubtle: 'rgba(142,142,147,0.1)',
    negative: '#D70015',
    negativeSubtle: 'rgba(215,0,21,0.08)'
  },
  border: {
    default: 'rgba(0,0,0,0.1)',
    subtle: 'rgba(0,0,0,0.05)',
    focus: '#0A84FF'
  },
  accent: '#0A84FF',
  accentHover: '#0A7AE8',
  accentActive: '#0A6ED4',
  danger: '#D70015',
  dangerBorder: 'rgba(215,0,21,0.27)',
  overlay: 'rgba(0,0,0,0.35)',
  glass: 'rgba(242, 242, 247, 0.92)'
} as const

// keep legacy export so quick-entry (always dark) still imports `colors`
export const colors = darkColors
