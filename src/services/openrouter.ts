import type { ThemeColors } from '../types'
import { isValidHex, validatePalette } from '../utils/theme'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT =
  'You are a color palette generator. Return ONLY valid JSON matching the exact schema requested. No commentary, no code fences.'

export class OpenRouterHttpError extends Error {
  status: number

  constructor(status: number) {
    super(`OpenRouter request failed with status ${status}`)
    this.name = 'OpenRouterHttpError'
    this.status = status
  }
}

export class OpenRouterNetworkError extends Error {
  constructor(message = 'Could not reach OpenRouter. Check your connection') {
    super(message)
    this.name = 'OpenRouterNetworkError'
  }
}

export class InvalidJsonError extends Error {
  constructor(message = 'AI returned an unexpected response. Try again') {
    super(message)
    this.name = 'InvalidJsonError'
  }
}

export class InvalidPaletteError extends Error {
  constructor(message = 'AI returned invalid color format') {
    super(message)
    this.name = 'InvalidPaletteError'
  }
}

export class LowContrastError extends Error {
  constructor(message = 'AI palette has insufficient contrast') {
    super(message)
    this.name = 'LowContrastError'
  }
}

interface OpenRouterCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

interface PaletteResponse {
  primary: unknown
  secondary: unknown
  accent: unknown
  background: unknown
}

const STYLE_HINTS = [
  'inspired by a sunset over the ocean',
  'inspired by a lush forest in spring',
  'inspired by a cozy coffee shop',
  'with warm earthy tones',
  'with cool blue and teal tones',
  'inspired by a neon cityscape at night',
  'with muted pastel hues',
  'inspired by desert sand dunes',
  'with bold jewel tones',
  'inspired by a misty mountain morning',
  'with retro 70s vibes',
  'inspired by Nordic minimalism',
  'with tropical fruit colors',
  'inspired by Japanese ink wash',
  'with dusty rose and sage accents',
  'inspired by an autumn harvest',
  'with monochromatic depth',
  'inspired by underwater coral reefs',
  'with lavender and gold accents',
  'inspired by a starry night sky',
]

function pickRandomHint(): string {
  return STYLE_HINTS[Math.floor(Math.random() * STYLE_HINTS.length)]
}

function buildUserPrompt(mode: 'light' | 'dark', customPrompt?: string): string {
  const modeConstraint =
    mode === 'dark' ? 'use dark backgrounds and light text' : 'use light backgrounds and dark text'

  const hint = customPrompt?.trim() || pickRandomHint()

  return `Generate a unique and creative ${mode} mode color palette ${hint} for a minimal dashboard UI. Return exactly this JSON structure: { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex" }. Primary = text color, secondary = card/surface color, accent = interactive elements, background = page background. Ensure text (primary) on background has WCAG AA contrast (≥4.5:1). For ${mode} mode: ${modeConstraint}. Be creative — avoid generic palettes.`
}

function parsePaletteResponse(content: unknown): ThemeColors {
  if (typeof content !== 'string') {
    throw new InvalidJsonError()
  }

  let parsed: PaletteResponse
  try {
    parsed = JSON.parse(content) as PaletteResponse
  } catch {
    throw new InvalidJsonError()
  }

  const colors: ThemeColors = {
    text: typeof parsed.primary === 'string' ? parsed.primary : '',
    surface: typeof parsed.secondary === 'string' ? parsed.secondary : '',
    accent: typeof parsed.accent === 'string' ? parsed.accent : '',
    bg: typeof parsed.background === 'string' ? parsed.background : ''
  }

  const hasInvalidHex =
    !isValidHex(colors.text) ||
    !isValidHex(colors.surface) ||
    !isValidHex(colors.accent) ||
    !isValidHex(colors.bg)

  if (hasInvalidHex) {
    throw new InvalidPaletteError('AI returned invalid color format')
  }

  const validation = validatePalette(colors)
  if (!validation.valid) {
    if (validation.reason?.toLowerCase().includes('contrast')) {
      throw new LowContrastError('AI palette has insufficient contrast')
    }
    throw new InvalidPaletteError('AI returned invalid color format')
  }

  return colors
}

export async function generatePalette(
  apiKey: string,
  model: string,
  mode: 'light' | 'dark',
  customPrompt?: string
): Promise<ThemeColors> {
  let response: Response

  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(mode, customPrompt) }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'color_palette',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                primary: { type: 'string' },
                secondary: { type: 'string' },
                accent: { type: 'string' },
                background: { type: 'string' }
              },
              required: ['primary', 'secondary', 'accent', 'background'],
              additionalProperties: false
            }
          }
        }
      })
    })
  } catch {
    throw new OpenRouterNetworkError()
  }

  if (!response.ok) {
    throw new OpenRouterHttpError(response.status)
  }

  let payload: OpenRouterCompletionResponse
  try {
    payload = (await response.json()) as OpenRouterCompletionResponse
  } catch {
    throw new InvalidJsonError()
  }

  const content = payload.choices?.[0]?.message?.content
  return parsePaletteResponse(content)
}

export function getOpenRouterErrorMessage(error: unknown): string {
  if (error instanceof OpenRouterHttpError) {
    if (error.status === 401) {
      return 'Invalid API key. Check your key at openrouter.ai'
    }
    if (error.status === 402) {
      return 'Insufficient credits on your OpenRouter account'
    }
    if (error.status === 429) {
      return 'Rate limited. Try again in a moment'
    }
    return 'AI returned an unexpected response. Try again'
  }

  if (error instanceof OpenRouterNetworkError) {
    return 'Could not reach OpenRouter. Check your connection'
  }

  if (error instanceof LowContrastError) {
    return 'Generated palette has low contrast. Try again for a better result'
  }

  if (error instanceof InvalidJsonError || error instanceof InvalidPaletteError) {
    return 'AI returned an unexpected response. Try again'
  }

  return 'AI returned an unexpected response. Try again'
}
