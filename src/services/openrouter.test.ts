import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  InvalidPaletteError,
  LowContrastError,
  OpenRouterHttpError,
  generatePalette
} from './openrouter'

const originalFetch = globalThis.fetch

function mockFetchResponse(payload: unknown, ok = true, status = 200): void {
  const mockedFetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload)
  })

  globalThis.fetch = mockedFetch as unknown as typeof fetch
}

describe('generatePalette', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.fetch = originalFetch
  })

  it('returns mapped ThemeColors for a valid response', async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              primary: '#1A1A1A',
              secondary: '#F5F5F5',
              accent: '#3B82F6',
              background: '#FFFFFF'
            })
          }
        }
      ]
    })

    const colors = await generatePalette('key', 'openai/gpt-4o-mini', 'light')

    expect(colors).toEqual({
      text: '#1A1A1A',
      surface: '#F5F5F5',
      accent: '#3B82F6',
      bg: '#FFFFFF'
    })
  })

  it('throws OpenRouterHttpError for 401 responses', async () => {
    mockFetchResponse({}, false, 401)

    await expect(generatePalette('bad-key', 'openai/gpt-4o-mini', 'light')).rejects.toBeInstanceOf(
      OpenRouterHttpError
    )
  })

  it('throws InvalidPaletteError for non-hex palette values', async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              primary: 'not-hex',
              secondary: '#F5F5F5',
              accent: '#3B82F6',
              background: '#FFFFFF'
            })
          }
        }
      ]
    })

    await expect(generatePalette('key', 'openai/gpt-4o-mini', 'light')).rejects.toBeInstanceOf(
      InvalidPaletteError
    )
  })

  it('throws LowContrastError for low-contrast palette values', async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              primary: '#FEFEFE',
              secondary: '#F5F5F5',
              accent: '#3B82F6',
              background: '#FFFFFF'
            })
          }
        }
      ]
    })

    await expect(generatePalette('key', 'openai/gpt-4o-mini', 'light')).rejects.toBeInstanceOf(
      LowContrastError
    )
  })

  it('includes custom prompt in the request body when provided', async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              primary: '#1A1A1A',
              secondary: '#F5F5F5',
              accent: '#3B82F6',
              background: '#FFFFFF'
            })
          }
        }
      ]
    })

    await generatePalette('key', 'openai/gpt-4o-mini', 'light', 'with dark blue tones')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body as string)
    const userMessage = body.messages.find((m: { role: string }) => m.role === 'user')

    expect(userMessage.content).toContain('with dark blue tones')
  })

  it('uses a random style hint when no custom prompt is provided', async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              primary: '#1A1A1A',
              secondary: '#F5F5F5',
              accent: '#3B82F6',
              background: '#FFFFFF'
            })
          }
        }
      ]
    })

    await generatePalette('key', 'openai/gpt-4o-mini', 'light')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body as string)
    const userMessage = body.messages.find((m: { role: string }) => m.role === 'user')

    // Should contain 'inspired by' or similar from STYLE_HINTS
    expect(userMessage.content).toMatch(/inspired by|with .+ tones|with .+ vibes|with .+ hues|with .+ accents|with .+ depth|with .+ colors/)
  })
})
