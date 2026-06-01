import type { TabInfo } from '../types'
import { canBulkClose, getKeeperTab, normalizeUrl } from '../utils/tabs'
import { createTabItem } from './tab-item'

const INITIAL_LIMIT = 5
const OVERFLOW_THRESHOLD = 50

export interface TabListOptions {
  title: string
  tabs: TabInfo[]
  currentTabId: number
  emptyMessage: string
  onSwitch: (tabId: number) => void
  onClose: (tabId: number) => void
  onBulkClose: (tabIds: number[]) => void
  isDuplicateGroup?: boolean
  incognito?: boolean
}

function isDuplicateTitle(title: string): boolean {
  const lower = title.toLowerCase()
  return lower.includes('duplicate')
}

export function createTabList(options: TabListOptions): HTMLElement {
  const {
    title,
    tabs,
    currentTabId,
    emptyMessage,
    onSwitch,
    onClose,
    onBulkClose,
    isDuplicateGroup,
    incognito,
  } = options

  let expanded = false
  const listId = `tab-list-${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`

  // --- Card wrapper ---
  const card = document.createElement('section')
  card.className = 'bg-[var(--color-surface)] rounded-lg p-4 flex flex-col gap-3'

  // --- Header row ---
  const header = document.createElement('div')
  header.className = 'flex items-center justify-between gap-2'

  // Title + badge
  const titleRow = document.createElement('div')
  titleRow.className = 'flex items-center gap-2'

  const heading = document.createElement('h2')
  heading.className = 'text-sm font-semibold tracking-wide uppercase text-[var(--color-text)]'
  heading.textContent = title

  const badge = document.createElement('span')
  badge.className =
    'inline-flex items-center justify-center text-[11px] font-bold rounded-full px-1.5 py-0.5 leading-none bg-[var(--color-accent)] text-[var(--color-bg)]'
  badge.textContent = String(tabs.length)

  titleRow.appendChild(heading)
  titleRow.appendChild(badge)
  header.appendChild(titleRow)

  // Bulk close button
  const treatAsDuplicate = isDuplicateGroup ?? isDuplicateTitle(title)
  const closableTabs = tabs.filter((t) => canBulkClose(t, currentTabId))
  const bulkCloseIds = treatAsDuplicate
    ? (() => {
        // Group tabs by normalized URL to find one keeper PER duplicate group
        const groups = new Map<string, TabInfo[]>()
        for (const t of tabs) {
          const key = normalizeUrl(t.url)
          const group = groups.get(key)
          if (group) {
            group.push(t)
          } else {
            groups.set(key, [t])
          }
        }

        const keeperIds = new Set<number>()
        for (const group of groups.values()) {
          if (group.length > 1) {
            keeperIds.add(getKeeperTab(group).id)
          }
        }

        return closableTabs
          .filter((t) => !keeperIds.has(t.id))
          .map((t) => t.id)
      })()
    : closableTabs.map((t) => t.id)

  if (bulkCloseIds.length > 1) {
    const bulkBtn = document.createElement('button')
    bulkBtn.type = 'button'
    bulkBtn.className =
      'text-xs cursor-pointer rounded-md px-2 py-1 transition-opacity duration-150 opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 text-[var(--color-text)] outline-[var(--color-accent)]'
    bulkBtn.textContent = `Close ${bulkCloseIds.length} tabs`
    bulkBtn.setAttribute('aria-label', `Close ${bulkCloseIds.length} tabs`)
    bulkBtn.addEventListener('click', () => {
      onBulkClose(bulkCloseIds)
    })
    header.appendChild(bulkBtn)
  }

  card.appendChild(header)

  // --- Empty state ---
  if (tabs.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'text-xs italic opacity-40 py-2 text-[var(--color-text)]'
    empty.textContent = emptyMessage
    card.appendChild(empty)
    return card
  }

  // --- Tab list ---
  const ul = document.createElement('ul')
  ul.className = 'flex flex-col gap-1 overflow-hidden'
  ul.id = listId
  ul.setAttribute('role', 'list')
  ul.style.transition = 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)'

  /** Measure natural height of the list with a given set of children. */
  function measureHeight(items: HTMLLIElement[]): number {
    // Temporarily remove transition and set auto height to measure
    const prevTransition = ul.style.transition
    ul.style.transition = 'none'
    ul.style.height = 'auto'

    const prevChildren = [...ul.children]
    ul.innerHTML = ''
    for (const item of items) ul.appendChild(item)
    const h = ul.scrollHeight

    // Restore
    ul.innerHTML = ''
    for (const child of prevChildren) ul.appendChild(child)
    ul.style.transition = prevTransition
    return h
  }

  function buildItems(tabSlice: TabInfo[]): HTMLLIElement[] {
    return tabSlice.map((tab) => createTabItem({ tab, currentTabId, onSwitch, onClose, incognito }))
  }

  let isFirstRender = true

  function renderItems(): void {
    const visibleTabs = expanded ? tabs : tabs.slice(0, INITIAL_LIMIT)
    const newItems = buildItems(visibleTabs)

    if (isFirstRender) {
      // First paint: no animation, just place items
      isFirstRender = false
      ul.innerHTML = ''
      for (const item of newItems) ul.appendChild(item)
      ul.style.height = 'auto'

      // Apply overflow scroll for very large expanded lists
      if (expanded && tabs.length > OVERFLOW_THRESHOLD) {
        ul.style.maxHeight = '600px'
        ul.style.overflowY = 'auto'
      } else {
        ul.style.maxHeight = ''
        ul.style.overflowY = ''
      }
      return
    }

    // --- Animate expand / collapse ---
    const currentHeight = ul.scrollHeight

    // Place new items to measure target height
    const targetHeight = measureHeight(newItems)

    // Lock current height so browser has a start value for the transition
    ul.style.height = `${currentHeight}px`

    // Swap content
    ul.innerHTML = ''
    for (const item of newItems) ul.appendChild(item)

    // If expanding, fade-in newly added items
    if (expanded) {
      for (let i = INITIAL_LIMIT; i < newItems.length; i++) {
        const item = newItems[i]
        item.style.opacity = '0'
        item.style.transform = 'translateY(-8px)'
        item.style.transition = 'opacity 250ms ease, transform 250ms ease'
      }
    }

    // Apply overflow settings
    if (expanded && tabs.length > OVERFLOW_THRESHOLD) {
      ul.style.maxHeight = '600px'
      ul.style.overflowY = 'auto'
    } else {
      ul.style.maxHeight = ''
      ul.style.overflowY = ''
    }

    // Trigger transition to target height on next frame
    requestAnimationFrame(() => {
      ul.style.height = `${targetHeight}px`

      // Fade-in expanded items staggered
      if (expanded) {
        for (let i = INITIAL_LIMIT; i < newItems.length; i++) {
          const item = newItems[i]
          const delay = (i - INITIAL_LIMIT) * 30
          setTimeout(() => {
            item.style.opacity = '1'
            item.style.transform = 'translateY(0)'
          }, delay)
        }
      }

      // After transition completes, set height back to auto for flexibility
      const onEnd = (): void => {
        ul.removeEventListener('transitionend', onEnd)
        ul.style.height = 'auto'
      }
      ul.addEventListener('transitionend', onEnd)
    })
  }

  renderItems()
  card.appendChild(ul)

  // --- Show more / Show less disclosure ---
  if (tabs.length > INITIAL_LIMIT) {
    const toggleBtn = document.createElement('button')
    toggleBtn.type = 'button'
    toggleBtn.className =
      'text-xs cursor-pointer rounded-md px-2 py-1 self-start transition-opacity duration-150 opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 text-[var(--color-accent)] outline-[var(--color-accent)]'
    toggleBtn.setAttribute('aria-expanded', 'false')
    toggleBtn.setAttribute('aria-controls', listId)

    function updateToggle(): void {
      if (expanded) {
        toggleBtn.textContent = 'Show less'
        toggleBtn.setAttribute('aria-expanded', 'true')
      } else {
        toggleBtn.textContent = `Show all (${tabs.length})`
        toggleBtn.setAttribute('aria-expanded', 'false')
      }
    }

    updateToggle()

    toggleBtn.addEventListener('click', () => {
      expanded = !expanded
      updateToggle()
      renderItems()
    })

    card.appendChild(toggleBtn)
  }

  return card
}
