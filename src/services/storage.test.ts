import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings, getSettings, onSettingsChange, saveSettings } from './storage'

// --- Chrome storage mock helpers ---

interface MockStorage {
  data: Record<string, unknown>
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
}

interface MockOnChanged {
  listeners: Array<(changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void>
  addListener: ReturnType<typeof vi.fn>
}

let mockLocal: MockStorage
let mockOnChanged: MockOnChanged

function installChromeMock(): void {
  mockLocal = {
    data: {},
    get: vi.fn((key: string) => {
      return Promise.resolve({ [key]: mockLocal.data[key] })
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(mockLocal.data, items)
      return Promise.resolve()
    }),
  }

  mockOnChanged = {
    listeners: [],
    addListener: vi.fn((cb: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void) => {
      mockOnChanged.listeners.push(cb)
    }),
  }

  const chromeMock = {
    storage: {
      local: mockLocal,
      onChanged: mockOnChanged,
    },
  }

  ;(globalThis as Record<string, unknown>).chrome = chromeMock
}

function removeChromeMock(): void {
  delete (globalThis as Record<string, unknown>).chrome
}

describe('storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    removeChromeMock()
  })

  describe('getDefaultSettings', () => {
    it('returns mode system and activeTheme default', () => {
      const defaults = getDefaultSettings()
      expect(defaults).toEqual({ mode: 'system', activeTheme: 'default' })
    })
  })

  describe('getSettings', () => {
    it('returns defaults when chrome.storage is unavailable', async () => {
      // No chrome mock installed
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const settings = await getSettings()
      expect(settings).toEqual(getDefaultSettings())
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Storage API unavailable'))
    })

    it('returns defaults when storage has no saved data', async () => {
      installChromeMock()
      const settings = await getSettings()
      expect(settings).toEqual(getDefaultSettings())
    })

    it('merges stored partial settings with defaults', async () => {
      installChromeMock()
      mockLocal.data['settings'] = { mode: 'dark' }
      const settings = await getSettings()
      expect(settings).toEqual({ mode: 'dark', activeTheme: 'default' })
    })

    it('preserves full stored settings without overriding with defaults', async () => {
      installChromeMock()
      mockLocal.data['settings'] = {
        mode: 'light',
        activeTheme: 'preset',
        presetName: 'Solarized',
      }
      const settings = await getSettings()
      expect(settings).toEqual({
        mode: 'light',
        activeTheme: 'preset',
        presetName: 'Solarized',
      })
    })

    it('returns defaults and warns when storage.get throws', async () => {
      installChromeMock()
      mockLocal.get.mockRejectedValueOnce(new Error('Quota exceeded'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const settings = await getSettings()
      expect(settings).toEqual(getDefaultSettings())
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read settings'),
        expect.any(Error)
      )
    })
  })

  describe('saveSettings', () => {
    it('does nothing and warns when chrome.storage is unavailable', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await saveSettings({ mode: 'dark' })
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Storage API unavailable'))
    })

    it('merges partial settings with current and persists', async () => {
      installChromeMock()
      mockLocal.data['settings'] = { mode: 'system', activeTheme: 'default' }
      await saveSettings({ mode: 'dark' })
      expect(mockLocal.set).toHaveBeenCalledWith({
        settings: { mode: 'dark', activeTheme: 'default' },
      })
    })

    it('warns when storage.set throws', async () => {
      installChromeMock()
      mockLocal.set.mockRejectedValueOnce(new Error('Write failed'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await saveSettings({ mode: 'light' })
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save settings'),
        expect.any(Error)
      )
    })
  })

  describe('onSettingsChange', () => {
    it('does nothing when chrome.storage is unavailable', () => {
      // Should not throw
      const callback = vi.fn()
      onSettingsChange(callback)
      expect(callback).not.toHaveBeenCalled()
    })

    it('invokes callback with merged settings when storage change fires', () => {
      installChromeMock()
      const callback = vi.fn()
      onSettingsChange(callback)
      expect(mockOnChanged.addListener).toHaveBeenCalledTimes(1)

      // Simulate a storage change event
      const listener = mockOnChanged.listeners[0]
      listener(
        {
          settings: {
            newValue: { mode: 'dark', activeTheme: 'preset', presetName: 'Nord' },
          },
        } as unknown as Record<string, chrome.storage.StorageChange>,
        'local'
      )

      expect(callback).toHaveBeenCalledWith({
        mode: 'dark',
        activeTheme: 'preset',
        presetName: 'Nord',
      })
    })

    it('ignores changes from non-local area', () => {
      installChromeMock()
      const callback = vi.fn()
      onSettingsChange(callback)

      const listener = mockOnChanged.listeners[0]
      listener(
        {
          settings: { newValue: { mode: 'dark' } },
        } as unknown as Record<string, chrome.storage.StorageChange>,
        'sync'
      )

      expect(callback).not.toHaveBeenCalled()
    })

    it('ignores changes to unrelated keys', () => {
      installChromeMock()
      const callback = vi.fn()
      onSettingsChange(callback)

      const listener = mockOnChanged.listeners[0]
      listener(
        {
          otherKey: { newValue: 'something' },
        } as unknown as Record<string, chrome.storage.StorageChange>,
        'local'
      )

      expect(callback).not.toHaveBeenCalled()
    })

    it('merges partial newValue with defaults', () => {
      installChromeMock()
      const callback = vi.fn()
      onSettingsChange(callback)

      const listener = mockOnChanged.listeners[0]
      listener(
        {
          settings: { newValue: { mode: 'light' } },
        } as unknown as Record<string, chrome.storage.StorageChange>,
        'local'
      )

      expect(callback).toHaveBeenCalledWith({
        mode: 'light',
        activeTheme: 'default',
      })
    })
  })
})
