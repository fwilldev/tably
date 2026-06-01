import type { TabInfo } from '../types'
import { findDuplicateGroups, isLocalhost, isStale } from '../utils/tabs'

const REFRESH_DEBOUNCE_MS = 500
const MAX_SORT_INDEX = Number.MAX_SAFE_INTEGER

const tabIndexById = new Map<number, number>()

export class TabFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TabFetchError'
  }
}

export interface CategorizedTabData {
  all: TabInfo[]
  stale: TabInfo[]
  duplicateGroups: Map<string, TabInfo[]>
  duplicateFlat: TabInfo[]
  localhost: TabInfo[]
  currentTabId: number
}

function hasTabsApi(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.tabs
}

function mapTab(tab: chrome.tabs.Tab): TabInfo | null {
  if (typeof tab.id !== 'number') {
    return null
  }

  return {
    id: tab.id,
    title: tab.title ?? '',
    url: tab.url ?? '',
    favIconUrl: tab.favIconUrl,
    pinned: !!tab.pinned,
    active: !!tab.active,
    lastAccessed: tab.lastAccessed,
    windowId: typeof tab.windowId === 'number' ? tab.windowId : 0,
  }
}

function getTabSortIndex(tabId: number): number {
  return tabIndexById.get(tabId) ?? MAX_SORT_INDEX
}

function resolveLastAccessedDescending(tab: TabInfo): number {
  return tab.lastAccessed ?? Number.NEGATIVE_INFINITY
}

function toSafeTabInfoList(tabs: chrome.tabs.Tab[]): TabInfo[] {
  const mapped: TabInfo[] = []

  for (const tab of tabs) {
    const tabInfo = mapTab(tab)

    if (tabInfo) {
      mapped.push(tabInfo)
    }
  }

  return mapped
}

export async function fetchAllTabs(): Promise<TabInfo[]> {
  if (!hasTabsApi()) {
    throw new TabFetchError('Tabs API unavailable')
  }

  try {
    const tabs = await chrome.tabs.query({})
    tabIndexById.clear()

    for (const tab of tabs) {
      if (typeof tab.id === 'number' && typeof tab.index === 'number') {
        tabIndexById.set(tab.id, tab.index)
      }
    }

    const mapped = toSafeTabInfoList(tabs)

    return mapped.sort((a, b) => {
      const byWindow = a.windowId - b.windowId

      if (byWindow !== 0) {
        return byWindow
      }

      const byIndex = getTabSortIndex(a.id) - getTabSortIndex(b.id)

      if (byIndex !== 0) {
        return byIndex
      }

      return a.id - b.id
    })
  } catch (error) {
    if (error instanceof TabFetchError) {
      throw error
    }

    throw new TabFetchError('Failed to query tabs')
  }
}

export async function getCurrentTabId(): Promise<number> {
  if (!hasTabsApi()) {
    return 0
  }

  if (typeof chrome.tabs.getCurrent === 'function') {
    try {
      const currentTab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
        chrome.tabs.getCurrent((tab) => {
          resolve(tab)
        })
      })

      if (typeof currentTab?.id === 'number') {
        return currentTab.id
      }
    } catch {
      // noop: fallback below
    }
  }

  try {
    const activeInFocusedWindow = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    const focusedTabId = activeInFocusedWindow[0]?.id

    if (typeof focusedTabId === 'number') {
      return focusedTabId
    }

    const activeInCurrentWindow = await chrome.tabs.query({ active: true, currentWindow: true })
    const currentWindowTabId = activeInCurrentWindow[0]?.id

    if (typeof currentWindowTabId === 'number') {
      return currentWindowTabId
    }
  } catch {
    // noop: fallback below
  }

  return 0
}

export function categorizeTabs(tabs: TabInfo[], currentTabId: number): CategorizedTabData {
  const all = [...tabs].sort((a, b) => {
    const byWindow = a.windowId - b.windowId

    if (byWindow !== 0) {
      return byWindow
    }

    const byIndex = getTabSortIndex(a.id) - getTabSortIndex(b.id)

    if (byIndex !== 0) {
      return byIndex
    }

    return a.id - b.id
  })

  const stale = all
    .filter(isStale)
    .sort((a, b) => (a.lastAccessed ?? MAX_SORT_INDEX) - (b.lastAccessed ?? MAX_SORT_INDEX))

  const duplicateGroupsRaw = findDuplicateGroups(all)
  const duplicateGroupsEntries = Array.from(duplicateGroupsRaw.entries())
    .sort(([urlA], [urlB]) => urlA.localeCompare(urlB))
    .map(([normalizedUrl, group]) => {
      const sortedGroup = [...group].sort((a, b) => {
        const byLastAccessed = resolveLastAccessedDescending(b) - resolveLastAccessedDescending(a)

        if (byLastAccessed !== 0) {
          return byLastAccessed
        }

        return a.id - b.id
      })

      return [normalizedUrl, sortedGroup] as const
    })

  const duplicateGroups = new Map<string, TabInfo[]>(duplicateGroupsEntries)
  const duplicateFlat = duplicateGroupsEntries.flatMap(([, group]) => group)
  const localhost = all.filter((tab) => isLocalhost(tab.url)).sort((a, b) => a.url.localeCompare(b.url))

  return {
    all,
    stale,
    duplicateGroups,
    duplicateFlat,
    localhost,
    currentTabId,
  }
}

export async function getCategorizedTabs(): Promise<CategorizedTabData> {
  const [tabs, currentTabId] = await Promise.all([fetchAllTabs(), getCurrentTabId()])
  return categorizeTabs(tabs, currentTabId)
}

export function subscribeToTabLifecycleChanges(onRefreshRequested: () => void): () => void {
  if (!hasTabsApi()) {
    return () => {}
  }

  let timeoutId: number | null = null

  const scheduleRefresh = (): void => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null
      onRefreshRequested()
    }, REFRESH_DEBOUNCE_MS)
  }

  const onCreated = (): void => {
    scheduleRefresh()
  }

  const onRemoved = (): void => {
    scheduleRefresh()
  }

  const onUpdated = (): void => {
    scheduleRefresh()
  }

  chrome.tabs.onCreated.addListener(onCreated)
  chrome.tabs.onRemoved.addListener(onRemoved)
  chrome.tabs.onUpdated.addListener(onUpdated)

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }

    chrome.tabs.onCreated.removeListener(onCreated)
    chrome.tabs.onRemoved.removeListener(onRemoved)
    chrome.tabs.onUpdated.removeListener(onUpdated)
  }
}
