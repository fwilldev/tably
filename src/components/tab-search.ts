import type { TabInfo } from '../types'
import { abbreviateUrl, getDisplayTitle, getDisplayUrl } from '../utils/tabs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchResult =
  | { type: 'tab'; tab: TabInfo }
  | { type: 'bookmark'; url: string; title: string }
  | { type: 'history'; url: string; title: string }

export interface TabSearchDeps {
  onSwitch: (tabId: number) => void
  onNavigate: (url: string) => void
  getTabs: () => Promise<{ tabs: TabInfo[]; currentTabId: number }>
  historyEnabled: boolean
  bookmarksEnabled: boolean
}

export interface TabSearchHandle {
  element: HTMLElement
  open: () => void
  close: () => void
  toggle: () => void
  setHistoryEnabled: (enabled: boolean) => void
  setBookmarksEnabled: (enabled: boolean) => void
}

export function createTabSearch(deps: TabSearchDeps): TabSearchHandle {
  const { onSwitch, onNavigate, getTabs } = deps

  let visible = false
  let allTabs: TabInfo[] = []
  let results: SearchResult[] = []
  let selfTabId = 0
  let selectedIdx = 0
  let historyEnabled = deps.historyEnabled
  let historyActive = historyEnabled
  let bookmarksEnabled = deps.bookmarksEnabled
  let bookmarksActive = bookmarksEnabled
  let historyDebounceTimer: number | undefined
  let openTabUrls = new Set<string>()

  // ---------------------------------------------------------------------------
  // DOM structure
  // ---------------------------------------------------------------------------

  const root = document.createElement('div')
  root.className = 'fixed inset-0 z-50 flex items-start justify-center pt-[20vh]'
  root.style.display = 'none'

  // Dim layer behind the modal — click to close
  const dimLayer = document.createElement('div')
  dimLayer.className = 'absolute inset-0 bg-[var(--color-bg)]/80'
  dimLayer.addEventListener('click', close)
  root.appendChild(dimLayer)

  // Modal card
  const modal = document.createElement('div')
  modal.className =
    'relative w-full max-w-2xl mx-4 bg-[var(--color-surface)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] border border-[var(--color-text)]/10'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', 'Search tabs')

  // --- Input row ---
  const inputRow = document.createElement('div')
  inputRow.className = 'flex items-center gap-3 px-4 py-3 border-b border-[var(--color-text)]/10'

  const svgIcon = document.createElement('span')
  svgIcon.className = 'shrink-0 text-[var(--color-text)]/40'
  svgIcon.innerHTML =
    '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'

  const input = document.createElement('input')
  input.type = 'text'
  input.className =
    'flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text)]/30 outline-none'
  input.placeholder = 'Search…'
  input.setAttribute('aria-label', 'Search tabs and history')
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-expanded', 'false')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', 'tab-search-results')

  // --- History toggle chip ---
  const historyChip = document.createElement('button')
  historyChip.type = 'button'
  historyChip.className = buildHistoryChipClass(historyActive)
  historyChip.setAttribute('aria-label', 'Toggle history search')
  historyChip.setAttribute('aria-pressed', String(historyActive))
  historyChip.innerHTML = [
    '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '<span>History</span>',
  ].join('')

  historyChip.addEventListener('click', () => {
    historyActive = !historyActive
    historyChip.className = buildHistoryChipClass(historyActive)
    historyChip.setAttribute('aria-pressed', String(historyActive))
    applyFilter()
  })

  // --- Bookmarks toggle chip ---
  const bookmarksChip = document.createElement('button')
  bookmarksChip.type = 'button'
  bookmarksChip.className = buildHistoryChipClass(bookmarksActive)
  bookmarksChip.setAttribute('aria-label', 'Toggle bookmarks search')
  bookmarksChip.setAttribute('aria-pressed', String(bookmarksActive))
  bookmarksChip.innerHTML = [
    '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    '<span>Bookmarks</span>',
  ].join('')

  bookmarksChip.addEventListener('click', () => {
    bookmarksActive = !bookmarksActive
    bookmarksChip.className = buildHistoryChipClass(bookmarksActive)
    bookmarksChip.setAttribute('aria-pressed', String(bookmarksActive))
    applyFilter()
  })

  const escBadge = document.createElement('kbd')
  escBadge.className =
    'shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-text)]/8 text-[var(--color-text)]/40'
  escBadge.textContent = 'ESC'

  inputRow.append(svgIcon, input, bookmarksChip, historyChip, escBadge)
  modal.appendChild(inputRow)

  // --- Results list ---
  const list = document.createElement('ul')
  list.className = 'overflow-y-auto flex-1'
  list.setAttribute('role', 'listbox')
  list.id = 'tab-search-results'
  modal.appendChild(list)

  // --- Footer keyboard hints ---
  const hints = document.createElement('div')
  hints.className =
    'flex items-center gap-4 px-4 py-2 border-t border-[var(--color-text)]/10 text-[10px] text-[var(--color-text)]/30 font-mono select-none'
  hints.innerHTML = '<span>↑↓ navigate</span><span>↵ switch</span><span>esc close</span>'
  modal.appendChild(hints)

  root.appendChild(modal)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function buildHistoryChipClass(active: boolean): string {
    const base =
      'shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-colors duration-150'
    return active
      ? `${base} bg-[var(--color-accent)] text-[var(--color-bg)]`
      : `${base} bg-[var(--color-text)]/8 text-[var(--color-text)]/40 hover:text-[var(--color-text)]/60`
  }

  function dotIcon(): HTMLElement {
    const s = document.createElement('span')
    s.className =
      'inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9px] font-bold bg-[var(--color-bg)] text-[var(--color-text)]'
    s.textContent = '\u25CF'
    s.setAttribute('aria-hidden', 'true')
    return s
  }

  function clockIcon(): HTMLElement {
    const s = document.createElement('span')
    s.className = 'inline-flex items-center justify-center w-4 h-4 shrink-0 text-[var(--color-text)]/40'
    s.innerHTML =
      '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    s.setAttribute('aria-hidden', 'true')
    return s
  }

  function bookmarkIcon(): HTMLElement {
    const s = document.createElement('span')
    s.className = 'inline-flex items-center justify-center w-4 h-4 shrink-0 text-[var(--color-text)]/40'
    s.innerHTML =
      '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
    s.setAttribute('aria-hidden', 'true')
    return s
  }

  // ---------------------------------------------------------------------------
  // Scoring — multi-token AND match with relevance ranking
  // ---------------------------------------------------------------------------

  function scoreMatch(title: string, url: string, tokens: string[]): number {
    const tLow = title.toLowerCase()
    const uLow = url.toLowerCase()
    let score = 0

    for (const token of tokens) {
      const inTitle = tLow.includes(token)
      const inUrl = uLow.includes(token)

      if (!inTitle && !inUrl) return -1 // ALL tokens must match

      if (inTitle) {
        score += 10
        const pos = tLow.indexOf(token)
        score += Math.max(0, 20 - pos) // earlier in title = better
        if (tLow.startsWith(token)) score += 5 // starts-with bonus
      }
      if (inUrl) score += 3
    }

    return score
  }

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  function applyFilter(): void {
    const q = input.value.trim().toLowerCase()
    const tokens = q.split(/\s+/).filter(Boolean)

    // Tabs: synchronous, tokenized matching with scoring
    const scored: { result: SearchResult; score: number }[] = []

    for (const tab of allTabs) {
      if (tab.id === selfTabId) continue
      if (!tokens.length) {
        scored.push({ result: { type: 'tab', tab }, score: 0 })
        continue
      }
      const s = scoreMatch(tab.title, tab.url, tokens)
      if (s >= 0) scored.push({ result: { type: 'tab', tab }, score: s })
    }

    scored.sort((a, b) => b.score - a.score)
    const tabResults = scored.map((s) => s.result)

    results = tabResults
    selectedIdx = 0
    renderList()

    // Bookmarks: async (debounced together with history)
    if ((bookmarksActive || historyActive) && tokens.length) {
      if (historyDebounceTimer) window.clearTimeout(historyDebounceTimer)
      historyDebounceTimer = window.setTimeout(
        () => void searchBookmarksAndHistory(tokens, tabResults),
        200
      )
    }
  }

  async function searchBookmarksAndHistory(
    tokens: string[],
    currentTabResults: SearchResult[]
  ): Promise<void> {
    if (!visible) return

    let bookmarkResults: SearchResult[] = []
    let historyResults: SearchResult[] = []

    // --- Bookmarks ---
    if (bookmarksActive && typeof chrome !== 'undefined' && chrome.bookmarks?.search) {
      try {
        const longest = tokens.reduce((a, b) => (a.length >= b.length ? a : b), '')
        const bookmarkItems = await chrome.bookmarks.search(longest)

        if (!visible) return

        const scored: { result: SearchResult & { type: 'bookmark' }; score: number }[] = []

        for (const item of bookmarkItems) {
          if (!item.url || openTabUrls.has(item.url)) continue
          const title = item.title || item.url
          const s = scoreMatch(title, item.url, tokens)
          if (s >= 0) {
            scored.push({
              result: { type: 'bookmark', url: item.url, title },
              score: s,
            })
          }
        }

        scored.sort((a, b) => b.score - a.score)
        bookmarkResults = scored.slice(0, 10).map((s) => s.result)
      } catch {
        // Bookmarks API unavailable
      }
    }

    // --- History ---
    if (historyActive && typeof chrome !== 'undefined' && chrome.history?.search) {
      try {
        const longest = tokens.reduce((a, b) => (a.length >= b.length ? a : b), '')
        const historyItems = await chrome.history.search({
          text: longest,
          maxResults: 50,
          startTime: 0,
        })

        if (!visible) return

        // Dedup against open tabs and bookmarks
        const bookmarkUrls = new Set(bookmarkResults.map((r) => (r as { url: string }).url))
        const scored: { result: SearchResult & { type: 'history' }; score: number }[] = []

        for (const item of historyItems) {
          if (!item.url || openTabUrls.has(item.url) || bookmarkUrls.has(item.url)) continue
          const title = item.title || item.url
          const s = scoreMatch(title, item.url, tokens)
          if (s >= 0) {
            scored.push({
              result: { type: 'history', url: item.url, title },
              score: s,
            })
          }
        }

        scored.sort((a, b) => b.score - a.score)
        historyResults = scored.slice(0, 10).map((s) => s.result)
      } catch {
        // History API unavailable
      }
    }

    // Merge: tabs first, then bookmarks, then history
    const prevSelectedIdx = selectedIdx
    results = [...currentTabResults, ...bookmarkResults, ...historyResults]
    selectedIdx = Math.min(prevSelectedIdx, Math.max(0, results.length - 1))
    renderList()
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function renderList(): void {
    list.innerHTML = ''
    input.setAttribute('aria-expanded', String(results.length > 0))

    if (results.length === 0) {
      const p = document.createElement('li')
      p.className = 'px-4 py-8 text-center text-sm text-[var(--color-text)]/40'
      if (input.value.trim()) {
        const sources = ['tabs']
        if (bookmarksActive) sources.push('bookmarks')
        if (historyActive) sources.push('history')
        p.textContent = `No matching ${sources.join(' or ')}`
      } else {
        p.textContent = 'No other tabs open'
      }
      list.appendChild(p)
      return
    }

    for (let i = 0; i < results.length; i++) {
      const result = results[i]

      const li = document.createElement('li')
      li.className = 'flex items-center gap-3 px-4 py-2 cursor-pointer'
      li.setAttribute('role', 'option')

      if (i === selectedIdx) {
        li.setAttribute('data-search-active', '')
        li.setAttribute('aria-selected', 'true')
      } else {
        li.setAttribute('aria-selected', 'false')
      }

      if (result.type === 'tab') {
        renderTabItem(li, result.tab, i)
      } else if (result.type === 'bookmark') {
        renderBookmarkItem(li, result, i)
      } else {
        renderHistoryItem(li, result, i)
      }

      list.appendChild(li)
    }
  }

  function renderTabItem(li: HTMLElement, tab: TabInfo, idx: number): void {
    // Favicon
    const fav = document.createElement('span')
    fav.className = 'inline-flex items-center justify-center w-4 h-4 shrink-0'

    if (tab.favIconUrl) {
      const img = document.createElement('img')
      img.src = tab.favIconUrl
      img.width = 16
      img.height = 16
      img.alt = ''
      img.className = 'w-4 h-4 rounded-sm object-contain'
      img.addEventListener('error', () => img.replaceWith(dotIcon()))
      fav.appendChild(img)
    } else {
      fav.appendChild(dotIcon())
    }

    li.appendChild(fav)

    // Title + URL
    const col = document.createElement('div')
    col.className = 'flex flex-col min-w-0 flex-1'

    const titleSpan = document.createElement('span')
    titleSpan.className = 'text-sm truncate text-[var(--color-text)]'
    titleSpan.textContent = getDisplayTitle(tab)
    col.appendChild(titleSpan)

    const urlText = getDisplayUrl(tab)
    if (urlText) {
      const urlSpan = document.createElement('span')
      urlSpan.className = 'text-xs truncate text-[var(--color-text)]/50'
      urlSpan.textContent = urlText
      col.appendChild(urlSpan)
    }

    li.appendChild(col)

    // Events
    li.addEventListener('click', () => pickTab(tab.id))
    li.addEventListener('mouseenter', () => moveTo(idx))
  }

  function renderBookmarkItem(
    li: HTMLElement,
    result: SearchResult & { type: 'bookmark' },
    idx: number
  ): void {
    // Bookmark icon
    li.appendChild(bookmarkIcon())

    // Title + URL
    const col = document.createElement('div')
    col.className = 'flex flex-col min-w-0 flex-1'

    const titleSpan = document.createElement('span')
    titleSpan.className = 'text-sm truncate text-[var(--color-text)]'
    titleSpan.textContent = result.title
    col.appendChild(titleSpan)

    const urlSpan = document.createElement('span')
    urlSpan.className = 'text-xs truncate text-[var(--color-text)]/50'
    urlSpan.textContent = abbreviateUrl(result.url)
    col.appendChild(urlSpan)

    li.appendChild(col)

    // Bookmark badge
    const badge = document.createElement('span')
    badge.className =
      'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-text)]/8 text-[var(--color-text)]/40'
    badge.textContent = 'Bookmark'
    li.appendChild(badge)

    // Events
    li.addEventListener('click', () => pickHistory(result.url))
    li.addEventListener('mouseenter', () => moveTo(idx))
  }

  function renderHistoryItem(
    li: HTMLElement,
    result: SearchResult & { type: 'history' },
    idx: number
  ): void {
    // Clock icon
    li.appendChild(clockIcon())

    // Title + URL
    const col = document.createElement('div')
    col.className = 'flex flex-col min-w-0 flex-1'

    const titleSpan = document.createElement('span')
    titleSpan.className = 'text-sm truncate text-[var(--color-text)]'
    titleSpan.textContent = result.title
    col.appendChild(titleSpan)

    const urlSpan = document.createElement('span')
    urlSpan.className = 'text-xs truncate text-[var(--color-text)]/50'
    urlSpan.textContent = abbreviateUrl(result.url)
    col.appendChild(urlSpan)

    li.appendChild(col)

    // History badge
    const badge = document.createElement('span')
    badge.className =
      'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-text)]/8 text-[var(--color-text)]/40'
    badge.textContent = 'History'
    li.appendChild(badge)

    // Events
    li.addEventListener('click', () => pickHistory(result.url))
    li.addEventListener('mouseenter', () => moveTo(idx))
  }

  // ---------------------------------------------------------------------------
  // Selection navigation (no re-render, just attribute swap)
  // ---------------------------------------------------------------------------

  function moveTo(idx: number): void {
    if (idx === selectedIdx || idx < 0 || idx >= results.length) return

    const prev = list.children[selectedIdx] as HTMLElement | undefined
    if (prev) {
      prev.removeAttribute('data-search-active')
      prev.setAttribute('aria-selected', 'false')
    }

    selectedIdx = idx

    const next = list.children[selectedIdx] as HTMLElement | undefined
    if (next) {
      next.setAttribute('data-search-active', '')
      next.setAttribute('aria-selected', 'true')
      next.scrollIntoView({ block: 'nearest' })
    }
  }

  function pickTab(tabId: number): void {
    onSwitch(tabId)
    close()
  }

  function pickHistory(url: string): void {
    onNavigate(url)
    close()
  }

  function pickSelected(): void {
    const result = results[selectedIdx]
    if (!result) return

    if (result.type === 'tab') {
      pickTab(result.tab.id)
    } else {
      pickHistory(result.url)
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (results.length) moveTo((selectedIdx + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (results.length) moveTo((selectedIdx - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        pickSelected()
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  })

  input.addEventListener('input', applyFilter)

  // ---------------------------------------------------------------------------
  // Open / Close / Toggle
  // ---------------------------------------------------------------------------

  async function doOpen(): Promise<void> {
    if (visible) return
    visible = true

    // Reset history active state to match enabled setting
    historyActive = historyEnabled
    historyChip.className = buildHistoryChipClass(historyActive)
    historyChip.setAttribute('aria-pressed', String(historyActive))

    // Reset bookmarks active state to match enabled setting
    bookmarksActive = bookmarksEnabled
    bookmarksChip.className = buildHistoryChipClass(bookmarksActive)
    bookmarksChip.setAttribute('aria-pressed', String(bookmarksActive))

    try {
      const data = await getTabs()
      allTabs = data.tabs
      selfTabId = data.currentTabId
      openTabUrls = new Set(allTabs.map((t) => t.url))
    } catch {
      allTabs = []
      selfTabId = 0
      openTabUrls = new Set()
    }

    input.value = ''
    applyFilter()

    root.style.display = ''
    document.body.style.overflow = 'hidden'

    // Focus input on next frame so the browser paints the overlay first
    requestAnimationFrame(() => input.focus())
  }

  function close(): void {
    if (!visible) return
    visible = false

    if (historyDebounceTimer) {
      window.clearTimeout(historyDebounceTimer)
      historyDebounceTimer = undefined
    }

    root.style.display = 'none'
    document.body.style.overflow = ''
    input.value = ''
    allTabs = []
    results = []
    openTabUrls = new Set()
  }

  function toggle(): void {
    if (visible) {
      close()
    } else {
      void doOpen()
    }
  }

  function setHistoryEnabled(enabled: boolean): void {
    historyEnabled = enabled
  }

  function setBookmarksEnabled(enabled: boolean): void {
    bookmarksEnabled = enabled
  }

  return {
    element: root,
    open: () => void doOpen(),
    close,
    toggle,
    setHistoryEnabled,
    setBookmarksEnabled,
  }
}
