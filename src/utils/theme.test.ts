import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  isValidHex,
  validatePalette
} from './theme'

describe('isValidHex', () => {
  it('accepts uppercase 6-digit hex', () => {
    expect(isValidHex('#FF5733')).toBe(true)
  })

  it('accepts lowercase 6-digit hex', () => {
    expect(isValidHex('#ff5733')).toBe(true)
  })

  it('rejects invalid hex values', () => {
    expect(isValidHex('#GGG')).toBe(false)
    expect(isValidHex('FF5733')).toBe(false)
    expect(isValidHex('#FF573')).toBe(false)
  })
})

describe('contrastRatio', () => {
  it('returns maximum contrast for black and white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21)
  })

  it('returns minimum contrast for identical colors', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1)
  })
})

describe('validatePalette', () => {
  it('accepts valid palette with sufficient text/background contrast', () => {
    const result = validatePalette({
      bg: '#FFFFFF',
      surface: '#F5F5F5',
      accent: '#3B82F6',
      text: '#1A1A1A'
    })

    expect(result).toEqual({ valid: true })
  })

  it('rejects palette with low text/background contrast', () => {
    const result = validatePalette({
      bg: '#FFFFFF',
      surface: '#F5F5F5',
      accent: '#3B82F6',
      text: '#FEFEFE'
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it('rejects palette with invalid hex values', () => {
    const result = validatePalette({
      bg: 'not-hex',
      surface: '#F5F5F5',
      accent: '#3B82F6',
      text: '#1A1A1A'
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBeDefined()
  })
})
