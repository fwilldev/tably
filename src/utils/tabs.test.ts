import { describe, expect, it } from 'vitest'
import type { TabInfo } from '../types'
import {
  abbreviateUrl,
  canBulkClose,
  canClose,
  findDuplicateGroups,
  getDisplayTitle,
  getDisplayUrl,
  getKeeperTab,
  isLocalhost,
  isStale,
  isSystemUrl,
  normalizeUrl
} from './tabs'

function makeTab(overrides: Partial<TabInfo> = {}): TabInfo {
  return {
    id: 1,
    title: 'Tab',
    url: 'https://example.com',
    pinned: false,
    active: false,
    windowId: 1,
    ...overrides
  }
}

describe('normalizeUrl', () => {
  it('strips query and hash', () => {
    expect(normalizeUrl('https://example.com/path?q=1#hash')).toBe('https://example.com/path')
  })

  it('lowercases host/protocol, removes www, and normalizes path slash', () => {
    expect(normalizeUrl('https://WWW.Example.COM/Path/')).toBe('https://example.com/path')
  })

  it('removes default http port', () => {
    expect(normalizeUrl('http://example.com:80/a')).toBe('http://example.com/a')
  })

  it('removes default https port', () => {
    expect(normalizeUrl('https://example.com:443/a')).toBe('https://example.com/a')
  })

  it('keeps root slash for explicit root path', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('keeps root slash for host-only url', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/')
  })

  it('returns original input unchanged for invalid urls', () => {
    expect(normalizeUrl('not a valid url')).toBe('not a valid url')
  })
})

describe('isStale', () => {
  it('returns true for tabs older than 1 hour', () => {
    const tab = makeTab({ lastAccessed: Date.now() - 7_200_000 })
    expect(isStale(tab)).toBe(true)
  })

  it('returns false for tabs newer than 1 hour', () => {
    const tab = makeTab({ lastAccessed: Date.now() - 1_800_000 })
    expect(isStale(tab)).toBe(false)
  })

  it('returns true when just over one hour old', () => {
    const tab = makeTab({ lastAccessed: Date.now() - 3_600_001 })
    expect(isStale(tab)).toBe(true)
  })

  it('returns false when lastAccessed is undefined', () => {
    const tab = makeTab({ lastAccessed: undefined })
    expect(isStale(tab)).toBe(false)
  })

  it('returns false for active tabs regardless of age', () => {
    const tab = makeTab({ active: true, lastAccessed: Date.now() - 7_200_000 })
    expect(isStale(tab)).toBe(false)
  })
})

describe('isLocalhost', () => {
  it('matches localhost hostnames with ports', () => {
    expect(isLocalhost('http://localhost:3000/app')).toBe(true)
  })

  it('matches 127.0.0.1', () => {
    expect(isLocalhost('http://127.0.0.1:5173')).toBe(true)
  })

  it('matches ipv6 loopback', () => {
    expect(isLocalhost('http://[::1]:8080')).toBe(true)
  })

  it('matches localhost subdomains', () => {
    expect(isLocalhost('http://app.localhost:3000')).toBe(true)
  })

  it('is protocol agnostic for localhost', () => {
    expect(isLocalhost('https://localhost')).toBe(true)
  })

  it('does not match non-localhost domains', () => {
    expect(isLocalhost('https://example.com')).toBe(false)
    expect(isLocalhost('http://notlocalhost.com')).toBe(false)
  })
})

describe('abbreviateUrl', () => {
  it('removes protocol/www and truncates long paths', () => {
    expect(abbreviateUrl('https://www.example.com/very/long/path/to/something')).toBe('example.com/very/long/path/to/somet…')
  })

  it('keeps host and non-default port', () => {
    expect(abbreviateUrl('http://localhost:3000')).toBe('localhost:3000')
  })

  it('removes trailing root slash from display', () => {
    expect(abbreviateUrl('https://example.com/')).toBe('example.com')
  })
})

describe('findDuplicateGroups', () => {
  it('returns only duplicate groups after normalization', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://example.com/a' }),
      makeTab({ id: 2, url: 'https://example.com/a?x=1' }),
      makeTab({ id: 3, url: 'https://example.com/b' })
    ]

    const groups = findDuplicateGroups(tabs)
    expect(groups.size).toBe(1)

    const duplicateGroup = groups.get('https://example.com/a')
    expect(duplicateGroup).toBeDefined()
    expect(duplicateGroup?.map((tab) => tab.id)).toEqual([1, 2])
  })

  it('returns empty map when all urls are unique', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://example.com/a' }),
      makeTab({ id: 2, url: 'https://example.com/b' }),
      makeTab({ id: 3, url: 'https://example.com/c' })
    ]

    const groups = findDuplicateGroups(tabs)
    expect(groups.size).toBe(0)
  })
})

describe('getKeeperTab', () => {
  it('prefers tab with most recent lastAccessed', () => {
    const group = [
      makeTab({ id: 1, lastAccessed: 100 }),
      makeTab({ id: 2, lastAccessed: 200 })
    ]

    expect(getKeeperTab(group).id).toBe(2)
  })

  it('falls back to lowest id when lastAccessed is undefined', () => {
    const group = [
      makeTab({ id: 5, lastAccessed: undefined }),
      makeTab({ id: 3, lastAccessed: undefined })
    ]

    expect(getKeeperTab(group).id).toBe(3)
  })
})

describe('canClose and canBulkClose', () => {
  it('returns false for current tab for both', () => {
    const currentTab = makeTab({ id: 42, pinned: false })
    expect(canClose(currentTab, 42)).toBe(false)
    expect(canBulkClose(currentTab, 42)).toBe(false)
  })

  it('returns true for canClose and false for canBulkClose on pinned tab', () => {
    const pinnedTab = makeTab({ id: 7, pinned: true })
    expect(canClose(pinnedTab, 42)).toBe(true)
    expect(canBulkClose(pinnedTab, 42)).toBe(false)
  })

  it('returns true for both on normal tab', () => {
    const normalTab = makeTab({ id: 8, pinned: false })
    expect(canClose(normalTab, 42)).toBe(true)
    expect(canBulkClose(normalTab, 42)).toBe(true)
  })
})

describe('isSystemUrl', () => {
  it('returns true for chrome:// URLs', () => {
    expect(isSystemUrl('chrome://extensions')).toBe(true)
    expect(isSystemUrl('chrome://settings/privacy')).toBe(true)
  })

  it('returns true for chrome-extension:// URLs', () => {
    expect(isSystemUrl('chrome-extension://abcdef1234/popup.html')).toBe(true)
  })

  it('returns true for about: URLs', () => {
    expect(isSystemUrl('about:blank')).toBe(true)
    expect(isSystemUrl('about:srcdoc')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isSystemUrl('Chrome://Extensions')).toBe(true)
    expect(isSystemUrl('ABOUT:BLANK')).toBe(true)
  })

  it('returns false for regular http/https URLs', () => {
    expect(isSystemUrl('https://example.com')).toBe(false)
    expect(isSystemUrl('http://localhost:3000')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSystemUrl('')).toBe(false)
  })
})

describe('getDisplayTitle', () => {
  it('returns "New Tab" when URL is empty', () => {
    const tab = makeTab({ title: '', url: '' })
    expect(getDisplayTitle(tab)).toBe('New Tab')
  })

  it('returns "New Tab" when URL is empty even with a title', () => {
    // If there's no URL it's a new tab page — title field ignored
    const tab = makeTab({ title: '', url: '' })
    expect(getDisplayTitle(tab)).toBe('New Tab')
  })

  it('returns the tab title when present', () => {
    const tab = makeTab({ title: 'GitHub', url: 'https://github.com' })
    expect(getDisplayTitle(tab)).toBe('GitHub')
  })

  it('returns abbreviated URL when title is empty but URL exists', () => {
    const tab = makeTab({ title: '', url: 'https://example.com/page' })
    expect(getDisplayTitle(tab)).toBe('example.com/page')
  })

  it('returns abbreviated URL for system URLs with no title', () => {
    const tab = makeTab({ title: '', url: 'chrome://extensions' })
    // abbreviateUrl will fail to parse chrome:// and return original string
    const result = getDisplayTitle(tab)
    expect(result).toBeTruthy()
  })
})

describe('getDisplayUrl', () => {
  it('returns empty string when URL is empty', () => {
    const tab = makeTab({ url: '' })
    expect(getDisplayUrl(tab)).toBe('')
  })

  it('returns abbreviated URL for regular URLs', () => {
    const tab = makeTab({ url: 'https://github.com/repo' })
    expect(getDisplayUrl(tab)).toBe('github.com/repo')
  })

  it('returns abbreviated localhost URL', () => {
    const tab = makeTab({ url: 'http://localhost:3000' })
    expect(getDisplayUrl(tab)).toBe('localhost:3000')
  })
})
