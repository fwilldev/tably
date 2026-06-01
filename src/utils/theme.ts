import type { ThemeColors } from '../types'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.slice(1)
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  }
}

function linearize(channel: number): number {
  const normalized = channel / 255
  if (normalized <= 0.03928) {
    return normalized / 12.92
  }
  return ((normalized + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const rs = linearize(r)
  const gs = linearize(g)
  const bs = linearize(b)
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function validatePalette(colors: ThemeColors): { valid: boolean; reason?: string } {
  const entries: Array<[keyof ThemeColors, string]> = [
    ['bg', colors.bg],
    ['surface', colors.surface],
    ['accent', colors.accent],
    ['text', colors.text]
  ]

  for (const [name, value] of entries) {
    if (!isValidHex(value)) {
      return { valid: false, reason: `Invalid hex for ${name}` }
    }
  }

  if (contrastRatio(colors.text, colors.bg) < 4.5) {
    return { valid: false, reason: 'Insufficient text/background contrast' }
  }

  return { valid: true }
}
