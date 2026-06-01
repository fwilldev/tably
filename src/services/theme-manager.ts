import { PRESETS } from '../data/presets'
import type { ThemeColors, UserSettings } from '../types'
import { getSettings } from './storage'

export function applyTheme(colors: ThemeColors): void {
  const root = document.documentElement

  root.style.setProperty('--color-bg', colors.bg)
  root.style.setProperty('--color-surface', colors.surface)
  root.style.setProperty('--color-accent', colors.accent)
  root.style.setProperty('--color-text', colors.text)
}

export function clearTheme(): void {
  const root = document.documentElement

  root.style.removeProperty('--color-bg')
  root.style.removeProperty('--color-surface')
  root.style.removeProperty('--color-accent')
  root.style.removeProperty('--color-text')
}

export function applyMode(mode: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement

  if (mode === 'system') {
    root.removeAttribute('data-theme')
    return
  }

  root.setAttribute('data-theme', mode)
}

export function getCurrentMode(): 'light' | 'dark' {
  const forcedMode = document.documentElement.getAttribute('data-theme')

  if (forcedMode === 'light' || forcedMode === 'dark') {
    return forcedMode
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getThemeFromSettings(settings: UserSettings): ThemeColors | null {
  const resolvedMode = settings.mode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : settings.mode

  if ((settings.activeTheme === 'custom' || settings.activeTheme === 'ai') && settings.customColors) {
    return settings.customColors[resolvedMode]
  }

  if (settings.activeTheme === 'preset' && settings.presetName) {
    const preset = PRESETS.find((candidate) => candidate.name === settings.presetName)

    if (preset) {
      return preset[resolvedMode]
    }
  }

  return null
}

export async function initTheme(): Promise<void> {
  const settings = await getSettings()

  applyMode(settings.mode)

  const selectedTheme = getThemeFromSettings(settings)

  if (selectedTheme) {
    applyTheme(selectedTheme)
  }
}
