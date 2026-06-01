import type { TabInfo } from '../types'
import { canClose, getDisplayTitle, getDisplayUrl, isSystemUrl } from '../utils/tabs'

export interface TabItemOptions {
  tab: TabInfo
  currentTabId: number
  onSwitch: (tabId: number) => void
  onClose: (tabId: number) => void
  incognito?: boolean
}

function createFavicon(tab: TabInfo): HTMLElement {
  const slot = document.createElement('span')
  slot.className = 'inline-flex items-center justify-center w-4 h-4 shrink-0'

  if (tab.favIconUrl) {
    const img = document.createElement('img')
    img.src = tab.favIconUrl
    img.width = 16
    img.height = 16
    img.alt = ''
    img.setAttribute('aria-hidden', 'true')
    img.className = 'w-4 h-4 rounded-sm object-contain'
    img.addEventListener('error', () => {
      img.replaceWith(createFallbackIcon())
    })
    slot.appendChild(img)
  } else {
    slot.appendChild(createFallbackIcon())
  }

  return slot
}

function createFallbackIcon(): HTMLElement {
  const fallback = document.createElement('span')
  fallback.className =
    'inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9px] font-bold bg-[var(--color-surface)] text-[var(--color-text)]'
  fallback.textContent = '\u25CF'
  fallback.setAttribute('aria-hidden', 'true')
  return fallback
}

function createRedactedIcon(): HTMLElement {
  const slot = document.createElement('span')
  slot.className =
    'inline-flex items-center justify-center w-4 h-4 shrink-0 rounded-sm bg-[var(--color-text)]/20'
  slot.setAttribute('aria-hidden', 'true')
  return slot
}

function createPinnedMarker(): HTMLElement {
  const marker = document.createElement('span')
  marker.className = 'text-[10px] leading-none opacity-60 text-[var(--color-accent)]'
  marker.textContent = '\uD83D\uDCCC'
  marker.setAttribute('aria-hidden', 'true')
  marker.title = 'Pinned'
  return marker
}

function createSystemBadge(): HTMLElement {
  const badge = document.createElement('span')
  badge.className =
    'inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded leading-none bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
  badge.textContent = 'System'
  return badge
}

export function createTabItem(options: TabItemOptions): HTMLLIElement {
  const { tab, currentTabId, onSwitch, onClose, incognito } = options
  const closable = canClose(tab, currentTabId)

  const li = document.createElement('li')
  li.className =
    'group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-150 hover:bg-[var(--color-accent)]/10'

  // Favicon (hidden in incognito mode)
  if (incognito) {
    li.appendChild(createRedactedIcon())
  } else {
    li.appendChild(createFavicon(tab))
  }

  // Pinned indicator (before title)
  if (tab.pinned) {
    li.appendChild(createPinnedMarker())
  }

  // System badge for chrome://, chrome-extension://, about: URLs
  if (isSystemUrl(tab.url)) {
    li.appendChild(createSystemBadge())
  }

  // Content area: title + URL — wrapped in the switch button
  const displayTitle = incognito ? '\u2022\u2022\u2022' : getDisplayTitle(tab)
  const displayUrl = incognito ? undefined : getDisplayUrl(tab)

  const switchBtn = document.createElement('button')
  switchBtn.type = 'button'
  switchBtn.className =
    'flex flex-col items-start gap-0.5 min-w-0 flex-1 text-left cursor-pointer rounded px-1 py-0.5 transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)]'
  switchBtn.title = `Switch to "${displayTitle}"`

  const titleSpan = document.createElement('span')
  titleSpan.className = 'text-sm font-medium truncate max-w-full leading-tight text-[var(--color-text)]'
  titleSpan.textContent = displayTitle

  switchBtn.appendChild(titleSpan)

  // Only show URL subtitle when there is a meaningful URL to display
  if (displayUrl) {
    const urlSpan = document.createElement('span')
    urlSpan.className = 'text-xs truncate max-w-full leading-tight opacity-50 text-[var(--color-text)]'
    urlSpan.textContent = displayUrl
    switchBtn.appendChild(urlSpan)
  }

  switchBtn.addEventListener('click', () => {
    onSwitch(tab.id)
  })

  li.appendChild(switchBtn)

  // Close button (only if closable) — hidden by default, visible on row hover
  if (closable) {
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className =
      'inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-md text-xs cursor-pointer transition-opacity duration-150 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 text-[var(--color-text)] outline-[var(--color-accent)]'
    closeBtn.title = `Close "${displayTitle}"`
    closeBtn.setAttribute('aria-label', `Close ${displayTitle}`)
    closeBtn.textContent = '\u2715'
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClose(tab.id)
    })
    li.appendChild(closeBtn)
  }

  return li
}
