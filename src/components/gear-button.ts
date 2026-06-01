export function createGearButton(onClick: () => void): HTMLElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className =
    'fixed top-4 right-4 z-40 inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[var(--color-accent)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)] text-[var(--color-text)] opacity-60 hover:opacity-100'
  btn.title = 'Settings'
  btn.setAttribute('aria-label', 'Open settings')
  btn.setAttribute('aria-haspopup', 'dialog')

  // Inline SVG gear icon
  btn.innerHTML = `<svg class="w-5 h-5 transition-transform duration-300 ease-in-out" style="will-change: transform;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`

  // Subtle hover rotation via JS (CSS-only approach for hover)
  btn.addEventListener('mouseenter', () => {
    const svg = btn.querySelector('svg')
    if (svg) svg.style.transform = 'rotate(90deg)'
  })

  btn.addEventListener('mouseleave', () => {
    const svg = btn.querySelector('svg')
    if (svg) svg.style.transform = 'rotate(0deg)'
  })

  btn.addEventListener('click', onClick)

  return btn
}
