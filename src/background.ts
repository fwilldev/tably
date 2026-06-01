// Minimal service worker for chrome.commands support.
//
// On a new tab page the omnibox has focus by default, so page-level keydown
// listeners never fire. chrome.commands operates at the browser level and
// works regardless of focus, then relays the event to the new-tab page via
// chrome.runtime messaging.

chrome.commands.onCommand.addListener((command) => {
  if (command === 'search-tabs') {
    chrome.runtime.sendMessage({ type: 'open-search' }).catch(() => {
      // New-tab page not open — nothing to do.
    })
  }
})
