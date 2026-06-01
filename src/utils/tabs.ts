import type { TabInfo } from '../types'

const ONE_HOUR_MS = 3_600_000

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const protocol = parsed.protocol.toLowerCase()
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const pathname = parsed.pathname === '/' ? '/' : parsed.pathname.toLowerCase().replace(/\/+$/, '')

    let port = parsed.port
    if ((protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443')) {
      port = ''
    }

    const host = port ? `${hostname}:${port}` : hostname
    return `${protocol}//${host}${pathname}`
  } catch {
    return url
  }
}

export function isStale(tab: TabInfo): boolean {
  if (tab.active || tab.lastAccessed === undefined) {
    return false
  }

  return Date.now() - tab.lastAccessed > ONE_HOUR_MS
}

export function isLocalhost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return (
      hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '[::1]'
      || hostname === '::1'
      || hostname.endsWith('.localhost')
    )
  } catch {
    return false
  }
}

export function abbreviateUrl(url: string, maxLength = 30): string {
  try {
    const parsed = new URL(url)
    const host = parsed.host.toLowerCase().replace(/^www\./, '')
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    const display = `${host}${path}`

    if (!path) {
      return host
    }

    if (display.length <= maxLength) {
      return display
    }

    const totalLimit = maxLength + 6
    return `${display.slice(0, Math.max(0, totalLimit - 1))}…`
  } catch {
    return url
  }
}

export function findDuplicateGroups(tabs: TabInfo[]): Map<string, TabInfo[]> {
  const grouped = new Map<string, TabInfo[]>()

  for (const tab of tabs) {
    const normalized = normalizeUrl(tab.url)
    const current = grouped.get(normalized)
    if (current) {
      current.push(tab)
    } else {
      grouped.set(normalized, [tab])
    }
  }

  const duplicatesOnly = new Map<string, TabInfo[]>()
  for (const [normalized, group] of grouped) {
    if (group.length > 1) {
      duplicatesOnly.set(normalized, group)
    }
  }

  return duplicatesOnly
}

export function getKeeperTab(group: TabInfo[]): TabInfo {
  return group.reduce((keeper, candidate) => {
    const keeperAccessed = keeper.lastAccessed ?? Number.NEGATIVE_INFINITY
    const candidateAccessed = candidate.lastAccessed ?? Number.NEGATIVE_INFINITY

    if (candidateAccessed > keeperAccessed) {
      return candidate
    }

    if (candidateAccessed === keeperAccessed && candidate.id < keeper.id) {
      return candidate
    }

    return keeper
  })
}

export function canClose(tab: TabInfo, currentTabId: number): boolean {
  return tab.id !== currentTabId
}

export function canBulkClose(tab: TabInfo, currentTabId: number): boolean {
  return tab.id !== currentTabId && !tab.pinned
}

const SYSTEM_URL_PREFIXES = ['chrome://', 'chrome-extension://', 'about:']

export function isSystemUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return SYSTEM_URL_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

export function getDisplayTitle(tab: TabInfo): string {
  if (!tab.url) {
    return 'New Tab'
  }

  if (tab.title) {
    return tab.title
  }

  const abbreviated = abbreviateUrl(tab.url)
  return abbreviated || 'New Tab'
}

export function getDisplayUrl(tab: TabInfo): string {
  if (!tab.url) {
    return ''
  }

  return abbreviateUrl(tab.url)
}

// ---------------------------------------------------------------------------
// Domain extraction & auto-pane generation
// ---------------------------------------------------------------------------

export function getBaseDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

export interface AutoPane {
  id: string
  label: string
  hostname: string
}

export function computeAutoPanes(tabs: TabInfo[]): AutoPane[] {
  const domainCounts = new Map<string, number>()

  for (const tab of tabs) {
    if (isSystemUrl(tab.url) || isLocalhost(tab.url)) continue
    const domain = getBaseDomain(tab.url)
    if (domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
    }
  }

  const result: AutoPane[] = []
  for (const [domain, count] of domainCounts) {
    if (count >= 2) {
      result.push({ id: `auto-${domain}`, label: domain, hostname: domain })
    }
  }

  return result.sort((a, b) => a.label.localeCompare(b.label))
}
