import { darkColors, lightColors, colors } from './colors'
import { typography } from './typography'
import { spacing, radius } from './spacing'

export const darkTheme = {
  colors: darkColors,
  typography,
  spacing,
  radius,
  colorScheme: 'dark' as const
}

export const lightTheme = {
  colors: lightColors,
  typography,
  spacing,
  radius,
  colorScheme: 'light' as const
}

// Default export stays dark so quick-entry imports are unchanged
export const theme = darkTheme

export type AppTheme = typeof darkTheme

export { colors, darkColors, lightColors, typography, spacing, radius }
