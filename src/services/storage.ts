import type { UserSettings } from '../types'

const SETTINGS_KEY = 'settings'

function hasStorageApi(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local
}

export function getDefaultSettings(): UserSettings {
  return {
    mode: 'system',
    activeTheme: 'default',
    openRouterModel: 'google/gemini-3.1-flash-lite-preview',
    showClock: true,
    clockFormat: '24h',
    dateFormat: 'us',
    searchIncludeHistory: false,
    searchIncludeBookmarks: true,
    autoPanes: true,
  }
}

export async function getSettings(): Promise<UserSettings> {
  if (!hasStorageApi()) {
    console.warn('[Tably] Storage API unavailable — using default settings')
    return getDefaultSettings()
  }

  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY)
    const stored = result[SETTINGS_KEY] as Partial<UserSettings> | undefined

    return {
      ...getDefaultSettings(),
      ...stored
    }
  } catch (error) {
    console.warn('[Tably] Failed to read settings — using defaults', error)
    return getDefaultSettings()
  }
}

export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  if (!hasStorageApi()) {
    console.warn('[Tably] Storage API unavailable — settings not persisted')
    return
  }

  const current = await getSettings()
  const nextSettings: UserSettings = {
    ...current,
    ...settings
  }

  try {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: nextSettings
    })
  } catch (error) {
    console.warn('[Tably] Failed to save settings', error)
  }
}

export function onSettingsChange(callback: (settings: UserSettings) => void): void {
  if (!hasStorageApi()) {
    return
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) {
      return
    }

    const newValue = changes[SETTINGS_KEY].newValue as Partial<UserSettings> | undefined

    callback({
      ...getDefaultSettings(),
      ...newValue
    })
  })
}
