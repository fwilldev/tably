import './styles/main.css'
import { createClockWidget } from './components/clock-widget'
import { createGearButton } from './components/gear-button'
import { createIncognitoToggle } from './components/incognito-toggle'
import { createPageLayout } from './components/page-layout'
import { createSettingsPanel } from './components/settings-panel'
import { createTabList } from './components/tab-list'
import { createTabSearch } from './components/tab-search'
import { PRESETS } from './data/presets'
import { generatePalette, getOpenRouterErrorMessage } from './services/openrouter'
import { bulkCloseTabs, closeTab, switchToTab } from './services/tab-actions'
import { getSettings, saveSettings } from './services/storage'
import { getCategorizedTabs, TabFetchError, subscribeToTabLifecycleChanges } from './services/tab-service'
import type { CategorizedTabData } from './services/tab-service'
import { applyMode, applyTheme, clearTheme, getCurrentMode, initTheme } from './services/theme-manager'
import type { BuiltinPaneId, CustomPane, TabInfo, UserSettings } from './types'
import { computeAutoPanes, getBaseDomain } from './utils/tabs'
import type { AutoPane } from './utils/tabs'

// --- Empty state messages ---
const EMPTY: Record<BuiltinPaneId, string> = {
  all: 'No tabs open',
  stale: 'No stale tabs \u2014 all tabs recently used \u2713',
  duplicate: 'No duplicate tabs found \u2713',
  localhost: 'No localhost tabs open',
}

const BUILTIN_PANE_LABELS: Record<BuiltinPaneId, string> = {
  all: 'All Tabs',
  stale: 'Stale Tabs',
  duplicate: 'Duplicate Tabs',
  localhost: 'Localhost Tabs',
}

const BUILTIN_PANE_IDS: BuiltinPaneId[] = ['all', 'stale', 'duplicate', 'localhost']

const ERROR_MESSAGE = 'Grant tabs permission in chrome://extensions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSkeletonCard(): HTMLElement {
  const card = document.createElement('div')
  card.className = 'bg-[var(--color-surface)] rounded-lg p-4 flex flex-col gap-3 animate-pulse'

  const header = document.createElement('div')
  header.className = 'flex items-center justify-between gap-2'

  const titleBar = document.createElement('div')
  titleBar.className = 'h-4 w-24 rounded bg-[var(--color-text)]/10'
  header.appendChild(titleBar)

  const badgeSkeleton = document.createElement('div')
  badgeSkeleton.className = 'h-4 w-8 rounded-full bg-[var(--color-text)]/10'
  header.appendChild(badgeSkeleton)

  card.appendChild(header)

  for (let i = 0; i < 3; i++) {
    const row = document.createElement('div')
    row.className = 'flex items-center gap-2 px-3 py-2'

    const icon = document.createElement('div')
    icon.className = 'w-4 h-4 rounded-sm shrink-0 bg-[var(--color-text)]/10'
    row.appendChild(icon)

    const textCol = document.createElement('div')
    textCol.className = 'flex flex-col gap-1 flex-1'

    const line1 = document.createElement('div')
    line1.className = 'h-3.5 rounded bg-[var(--color-text)]/10'
    line1.style.width = `${60 + i * 12}%`

    const line2 = document.createElement('div')
    line2.className = 'h-2.5 w-2/3 rounded bg-[var(--color-text)]/5'

    textCol.appendChild(line1)
    textCol.appendChild(line2)
    row.appendChild(textCol)

    card.appendChild(row)
  }

  return card
}

function createErrorState(): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'bg-[var(--color-surface)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 col-span-full'

  const icon = document.createElement('span')
  icon.className = 'text-2xl opacity-40'
  icon.textContent = '\u26A0\uFE0F'
  icon.setAttribute('aria-hidden', 'true')

  const msg = document.createElement('p')
  msg.className = 'text-sm text-center opacity-60 text-[var(--color-text)]'
  msg.textContent = ERROR_MESSAGE

  wrapper.appendChild(icon)
  wrapper.appendChild(msg)
  return wrapper
}

function getVisiblePaneIds(settings: UserSettings, autoPanes: AutoPane[] = []): string[] {
  const hidden = new Set(settings.hiddenPanes ?? [])
  const builtins = BUILTIN_PANE_IDS.filter((id) => !hidden.has(id))
  const customs = (settings.customPanes ?? []).map((p) => p.id)
  const autos = settings.autoPanes ? autoPanes.map((p) => p.id) : []
  return [...builtins, ...customs, ...autos]
}

function filterTabsByCustomPane(tabs: TabInfo[], pane: CustomPane): TabInfo[] {
  const query = pane.filter.toLowerCase()
  return tabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query)
  )
}

function getBuiltinTabs(id: BuiltinPaneId, data: CategorizedTabData): TabInfo[] {
  switch (id) {
    case 'all': return data.all
    case 'stale': return data.stale
    case 'duplicate': return data.duplicateFlat
    case 'localhost': return data.localhost
  }
}

// ---------------------------------------------------------------------------
// Tab list action callbacks (shared)
// ---------------------------------------------------------------------------

function tabActions() {
  return {
    onSwitch: (tabId: number) => { void switchToTab(tabId) },
    onClose: (tabId: number) => { void closeTab(tabId) },
    onBulkClose: (tabIds: number[]) => { void bulkCloseTabs(tabIds) },
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  void main()
})

async function main(): Promise<void> {
  void initTheme().catch(() => {
    // noop: keep rendering even when extension APIs are unavailable
  })

  const app = document.getElementById('app')!

  // Load persisted settings before building UI so all fields (incl. API keys) are available
  let currentSettings: UserSettings
  try {
    currentSettings = await getSettings()
  } catch {
    currentSettings = { mode: 'system', activeTheme: 'default' }
  }

  // --- Build initial layout ---
  let visiblePaneIds = getVisiblePaneIds(currentSettings)
  let layoutResult = createPageLayout(visiblePaneIds)
  app.appendChild(layoutResult.element)

  // Show loading skeletons
  for (const slot of layoutResult.slots) {
    slot.element.appendChild(createSkeletonCard())
  }

  // --- Clock widget ---
  const clockWidget = createClockWidget({
    clockFormat: currentSettings.clockFormat ?? '24h',
    dateFormat: currentSettings.dateFormat ?? 'us',
  })
  layoutResult.clockContainer.appendChild(clockWidget.element)

  if (currentSettings.showClock === false) {
    clockWidget.hide()
  }

  // --- Theme resolution ---
  const resolveThemeForSettings = (settings: UserSettings) => {
    const resolvedMode = settings.mode === 'system' ? getCurrentMode() : settings.mode

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

  const applySettingsToTheme = (settings: UserSettings): void => {
    applyMode(settings.mode)
    const theme = resolveThemeForSettings(settings)
    if (theme) {
      applyTheme(theme)
    } else {
      clearTheme()
    }
  }

  // --- Rebuild layout when pane config changes ---
  let currentAutoPanes: AutoPane[] = []

  function rebuildLayout(): void {
    const nextIds = getVisiblePaneIds(currentSettings, currentAutoPanes)
    const changed =
      nextIds.length !== visiblePaneIds.length ||
      nextIds.some((id, i) => id !== visiblePaneIds[i])

    if (!changed) return

    visiblePaneIds = nextIds
    const oldLayout = layoutResult.element
    layoutResult = createPageLayout(visiblePaneIds)
    oldLayout.replaceWith(layoutResult.element)

    // Re-mount clock widget into new layout
    layoutResult.clockContainer.appendChild(clockWidget.element)
    if (currentSettings.showClock === false) {
      clockWidget.hide()
    }

    // Re-mount search trigger into new layout
    layoutResult.searchContainer.appendChild(searchTrigger)

    // Re-render tabs into new slots
    void renderTabLists()
  }

  // --- Incognito toggle ---
  const incognitoToggle = createIncognitoToggle({
    initial: !!currentSettings.incognitoMode,
    onChange: (active) => {
      currentSettings = { ...currentSettings, incognitoMode: active }
      void saveSettings({ incognitoMode: active })
      void renderTabLists()
    },
  })

  // --- Settings panel + gear button ---
  const panel = createSettingsPanel({
    currentSettings,
    onGenerateAiPalette: async (apiKey, model, customPrompt) => {
      try {
        const [light, dark] = await Promise.all([
          generatePalette(apiKey, model, 'light', customPrompt || undefined),
          generatePalette(apiKey, model, 'dark', customPrompt || undefined)
        ])

        const nextSettings: UserSettings = {
          ...currentSettings,
          activeTheme: 'ai',
          customColors: { light, dark }
        }

        currentSettings = nextSettings
        applySettingsToTheme(nextSettings)
        await saveSettings({
          activeTheme: 'ai',
          customColors: { light, dark }
        })
      } catch (error) {
        throw new Error(getOpenRouterErrorMessage(error))
      }
    },
    onSettingsChange: (partialSettings) => {
      const nextSettings: UserSettings = {
        ...currentSettings,
        ...partialSettings,
      }

      currentSettings = nextSettings
      applySettingsToTheme(nextSettings)
      void saveSettings(partialSettings)

      // Update clock widget
      if ('showClock' in partialSettings) {
        if (partialSettings.showClock === false) {
          clockWidget.hide()
        } else {
          clockWidget.show()
        }
      }
      if ('clockFormat' in partialSettings || 'dateFormat' in partialSettings) {
        clockWidget.update({
          clockFormat: nextSettings.clockFormat,
          dateFormat: nextSettings.dateFormat,
        })
      }

      // Rebuild layout if pane config changed
      if ('hiddenPanes' in partialSettings || 'customPanes' in partialSettings) {
        rebuildLayout()
      }

      // Update search history setting
      if ('searchIncludeHistory' in partialSettings) {
        search.setHistoryEnabled(!!nextSettings.searchIncludeHistory)
      }

      // Update search bookmarks setting
      if ('searchIncludeBookmarks' in partialSettings) {
        search.setBookmarksEnabled(!!nextSettings.searchIncludeBookmarks)
      }

      // Re-render tabs when auto-panes toggled (triggers rebuild if auto pane set changes)
      if ('autoPanes' in partialSettings) {
        void renderTabLists()
      }
    },
  })

  const gearBtn = createGearButton(() => {
    panel.open()
  })

  app.appendChild(incognitoToggle.element)
  app.appendChild(gearBtn)
  app.appendChild(panel.element)

  // --- Tab search overlay ---
  const search = createTabSearch({
    onSwitch: (tabId) => { void switchToTab(tabId) },
    onNavigate: (url) => { window.location.href = url },
    getTabs: async () => {
      const data = await getCategorizedTabs()
      return { tabs: data.all, currentTabId: data.currentTabId }
    },
    historyEnabled: !!currentSettings.searchIncludeHistory,
    bookmarksEnabled: currentSettings.searchIncludeBookmarks !== false,
  })
  app.appendChild(search.element)

  // --- Search trigger bar (between clock and grid) ---
  function createSearchTrigger(): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className =
      'w-full max-w-md flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-150 bg-[var(--color-surface)] border border-[var(--color-text)]/8 hover:border-[var(--color-text)]/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)]'
    btn.setAttribute('aria-label', 'Search tabs')

    btn.innerHTML = [
      '<svg class="w-4 h-4 shrink-0 text-[var(--color-text)]/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      '<span class="flex-1 text-sm text-left text-[var(--color-text)]/35 select-none">Search\u2026</span>',
      `<kbd class="shrink-0 text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-text)]/6 text-[var(--color-text)]/30 select-none">/</kbd>`,
    ].join('')

    btn.addEventListener('click', () => search.open())

    return btn
  }

  const searchTrigger = createSearchTrigger()
  layoutResult.searchContainer.appendChild(searchTrigger)

  // chrome.commands relay — works even when the omnibox has focus (Chromium
  // steals keyboard events from the page while the address bar is focused, so
  // a page-level keydown alone is not enough on the new-tab page).
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        'type' in message &&
        (message as { type: string }).type === 'open-search'
      ) {
        search.toggle()
      }
    })
  }

  // Page-level shortcuts — fire when the page itself has focus
  // (i.e. user has clicked somewhere on the page).
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+Shift+F
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      search.toggle()
      return
    }

    // "/" to open search (skip if user is typing in an input/textarea)
    if (
      e.key === '/' &&
      !e.metaKey && !e.ctrlKey && !e.altKey &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement) &&
      !(e.target instanceof HTMLSelectElement)
    ) {
      e.preventDefault()
      search.open()
    }
  })

  // Apply loaded settings to theme + incognito
  applySettingsToTheme(currentSettings)
  incognitoToggle.setActive(!!currentSettings.incognitoMode)

  // --- Render tab lists ---
  let renderCycle = 0

  const renderTabLists = async (): Promise<void> => {
    const cycle = ++renderCycle

    try {
      const categorized = await getCategorizedTabs()

      if (cycle !== renderCycle) return

      // --- Auto-pane computation ---
      if (currentSettings.autoPanes) {
        const newAutoPanes = computeAutoPanes(categorized.all)
        const newIds = newAutoPanes.map((p) => p.id)
        const oldIds = currentAutoPanes.map((p) => p.id)
        const changed =
          newIds.length !== oldIds.length || newIds.some((id, i) => id !== oldIds[i])

        if (changed) {
          currentAutoPanes = newAutoPanes
          rebuildLayout()
          return // rebuildLayout triggers a new renderTabLists call
        }
      } else if (currentAutoPanes.length > 0) {
        currentAutoPanes = []
        rebuildLayout()
        return
      }

      const incognito = !!currentSettings.incognitoMode
      const actions = tabActions()
      const customPanes = currentSettings.customPanes ?? []

      for (const slot of layoutResult.slots) {
        const builtinId = BUILTIN_PANE_IDS.find((id) => id === slot.id)

        if (builtinId) {
          const tabs = getBuiltinTabs(builtinId, categorized)
          slot.element.replaceChildren(createTabList({
            title: BUILTIN_PANE_LABELS[builtinId],
            tabs,
            currentTabId: categorized.currentTabId,
            emptyMessage: EMPTY[builtinId],
            isDuplicateGroup: builtinId === 'duplicate',
            incognito,
            ...actions,
          }))
        } else {
          // Custom pane
          const customPane = customPanes.find((p) => p.id === slot.id)
          if (customPane) {
            const tabs = filterTabsByCustomPane(categorized.all, customPane)
            slot.element.replaceChildren(createTabList({
              title: customPane.name,
              tabs,
              currentTabId: categorized.currentTabId,
              emptyMessage: `No tabs matching "${customPane.filter}"`,
              incognito,
              ...actions,
            }))
          } else {
            // Auto pane
            const autoPane = currentAutoPanes.find((p) => p.id === slot.id)
            if (autoPane) {
              const tabs = categorized.all.filter(
                (t) => getBaseDomain(t.url) === autoPane.hostname
              )
              slot.element.replaceChildren(createTabList({
                title: autoPane.label,
                tabs,
                currentTabId: categorized.currentTabId,
                emptyMessage: `No tabs for ${autoPane.hostname}`,
                incognito,
                ...actions,
              }))
            }
          }
        }
      }
    } catch (error) {
      if (cycle !== renderCycle) return

      const errorEl = createErrorState()
      const firstSlot = layoutResult.slots[0]
      if (firstSlot) {
        firstSlot.element.replaceChildren(errorEl)
      }
      for (let i = 1; i < layoutResult.slots.length; i++) {
        layoutResult.slots[i].element.replaceChildren()
      }

      if (error instanceof TabFetchError) {
        console.warn('[Tably]', error.message)
      }
    }
  }

  void renderTabLists()

  const unsubscribe = subscribeToTabLifecycleChanges(() => {
    void renderTabLists()
  })

  window.addEventListener('beforeunload', unsubscribe, { once: true })
}
