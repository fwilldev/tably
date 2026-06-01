export interface IncognitoToggleOptions {
  initial: boolean
  onChange: (active: boolean) => void
}

export interface IncognitoToggleResult {
  element: HTMLElement
  setActive: (active: boolean) => void
}

export function createIncognitoToggle(options: IncognitoToggleOptions): IncognitoToggleResult {
  const { initial, onChange } = options
  let active = initial

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = buildClass(active)
  btn.title = active ? 'Disable incognito mode' : 'Enable incognito mode'
  btn.setAttribute('aria-label', 'Toggle incognito mode')
  btn.setAttribute('aria-pressed', String(active))

  // Eye / eye-off icon
  btn.innerHTML = buildIcon(active)

  function update(): void {
    btn.className = buildClass(active)
    btn.title = active ? 'Disable incognito mode' : 'Enable incognito mode'
    btn.setAttribute('aria-pressed', String(active))
    btn.innerHTML = buildIcon(active)
  }

  btn.addEventListener('click', () => {
    active = !active
    update()
    onChange(active)
  })

  function setActive(value: boolean): void {
    active = value
    update()
  }

  return { element: btn, setActive }
}

function buildClass(active: boolean): string {
  const base =
    'fixed top-4 right-14 z-40 inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)] text-[var(--color-text)]'
  return active
    ? `${base} opacity-100 bg-[var(--color-accent)]/15`
    : `${base} opacity-60 hover:opacity-100 hover:bg-[var(--color-accent)]/10`
}

function buildIcon(active: boolean): string {
  if (active) {
    // Eye-off icon (incognito active)
    return `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
  }
  // Eye icon (incognito off)
  return `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`
}
