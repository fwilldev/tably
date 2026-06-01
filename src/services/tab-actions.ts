function hasTabsApi(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.tabs
}

function hasWindowsApi(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.windows
}

function toLastErrorMessage(): string | null {
  return chrome.runtime?.lastError?.message ?? null
}

async function updateTab(tabId: number, properties: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab | null> {
  if (!hasTabsApi()) {
    return null
  }

  try {
    if (typeof chrome.tabs.update === 'function') {
      const maybePromise = chrome.tabs.update(tabId, properties)

      if (maybePromise && typeof (maybePromise as Promise<chrome.tabs.Tab>).then === 'function') {
        return (await maybePromise) ?? null
      }
    }
  } catch {
    // noop: fallback to callback variant below
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, properties, (updatedTab) => {
      const errorMessage = toLastErrorMessage()

      if (errorMessage) {
        reject(new Error(errorMessage))
        return
      }

      resolve(updatedTab ?? null)
    })
  })
}

async function removeTab(tabId: number): Promise<void> {
  if (!hasTabsApi()) {
    return
  }

  try {
    if (typeof chrome.tabs.remove === 'function') {
      const maybePromise = chrome.tabs.remove(tabId)

      if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
        await maybePromise
        return
      }
    }
  } catch {
    // noop: fallback to callback variant below
  }

  await new Promise<void>((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
      const errorMessage = toLastErrorMessage()

      if (errorMessage) {
        reject(new Error(errorMessage))
        return
      }

      resolve()
    })
  })
}

async function removeTabs(tabIds: number[]): Promise<void> {
  if (!hasTabsApi() || tabIds.length === 0) {
    return
  }

  try {
    if (typeof chrome.tabs.remove === 'function') {
      const maybePromise = chrome.tabs.remove(tabIds)

      if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
        await maybePromise
        return
      }
    }
  } catch {
    // noop: fallback to callback variant below
  }

  await new Promise<void>((resolve, reject) => {
    chrome.tabs.remove(tabIds, () => {
      const errorMessage = toLastErrorMessage()

      if (errorMessage) {
        reject(new Error(errorMessage))
        return
      }

      resolve()
    })
  })
}

async function focusWindow(windowId: number): Promise<void> {
  if (!hasWindowsApi()) {
    return
  }

  try {
    if (typeof chrome.windows.update === 'function') {
      const maybePromise = chrome.windows.update(windowId, { focused: true })

      if (maybePromise && typeof (maybePromise as Promise<chrome.windows.Window>).then === 'function') {
        await maybePromise
        return
      }
    }
  } catch {
    // noop: fallback to callback variant below
  }

  await new Promise<void>((resolve, reject) => {
    chrome.windows.update(windowId, { focused: true }, () => {
      const errorMessage = toLastErrorMessage()

      if (errorMessage) {
        reject(new Error(errorMessage))
        return
      }

      resolve()
    })
  })
}

export async function switchToTab(tabId: number): Promise<void> {
  if (!hasTabsApi()) {
    return
  }

  try {
    const updatedTab = await updateTab(tabId, { active: true })

    if (typeof updatedTab?.windowId === 'number') {
      await focusWindow(updatedTab.windowId)
    }
  } catch {
    // noop: tab may have closed between render and click
  }
}

export async function closeTab(tabId: number): Promise<void> {
  if (!hasTabsApi()) {
    return
  }

  try {
    await removeTab(tabId)
  } catch {
    // noop: tab may already be closed
  }
}

export async function bulkCloseTabs(tabIds: number[]): Promise<void> {
  if (!hasTabsApi() || tabIds.length === 0) {
    return
  }

  try {
    await removeTabs(tabIds)
  } catch {
    // noop: one or more tabs may already be closed
  }
}
