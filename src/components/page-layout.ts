export interface PaneSlot {
  id: string
  element: HTMLElement
}

export interface PageLayoutResult {
  element: HTMLElement
  grid: HTMLElement
  clockContainer: HTMLElement
  searchContainer: HTMLElement
  slots: PaneSlot[]
}

export function createPageLayout(paneIds: string[]): PageLayoutResult {
  // --- Outer shell: full viewport, themed background ---
  const shell = document.createElement('div')
  shell.className = 'min-h-screen bg-[var(--color-bg)] flex flex-col'

  // --- Header with brand ---
  const header = document.createElement('header')
  header.className = 'px-6 pt-5 pb-1'

  const brand = document.createElement('span')
  brand.className = 'text-sm font-mono tracking-tight text-[var(--color-text)]/50 select-none'
  brand.textContent = 'Tably'

  header.appendChild(brand)
  shell.appendChild(header)

  // --- Clock container (injected from outside) ---
  const clockContainer = document.createElement('div')
  clockContainer.className = 'flex justify-center py-6'
  shell.appendChild(clockContainer)

  // --- Search trigger container (injected from outside) ---
  const searchContainer = document.createElement('div')
  searchContainer.className = 'flex justify-center px-6 pb-4'
  shell.appendChild(searchContainer)

  // --- Main content area: centered vertically + horizontally ---
  const main = document.createElement('main')
  main.className = 'flex-1 flex items-center justify-center w-full px-6 pb-6 pt-2'

  const inner = document.createElement('div')
  inner.className = 'w-full max-w-7xl'

  // --- Responsive 2-column grid ---
  const grid = document.createElement('div')
  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4'

  // --- Dynamic slots ---
  const slots: PaneSlot[] = paneIds.map((id) => {
    const el = document.createElement('div')
    grid.appendChild(el)
    return { id, element: el }
  })

  inner.appendChild(grid)
  main.appendChild(inner)
  shell.appendChild(main)

  return { element: shell, grid, clockContainer, searchContainer, slots }
}
