import type { ClockFormat, DateFormat } from '../types'

export interface ClockWidgetOptions {
  clockFormat: ClockFormat
  dateFormat: DateFormat
}

export interface ClockWidgetResult {
  element: HTMLElement
  update: (options: Partial<ClockWidgetOptions>) => void
  show: () => void
  hide: () => void
  destroy: () => void
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const DATE_LOCALE: Record<DateFormat, string> = {
  us: 'en-US',
  de: 'de-DE',
  iso: 'sv-SE', // sv-SE uses ISO-style YYYY-MM-DD
}

const DATE_OPTIONS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  us: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  de: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  iso: { year: 'numeric', month: '2-digit', day: '2-digit' },
}

function formatTime(now: Date, format: ClockFormat): string {
  const locale = format === '12h' ? 'en-US' : 'de-DE'
  return now.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h',
  })
}

function formatDate(now: Date, format: DateFormat): string {
  return now.toLocaleDateString(DATE_LOCALE[format], DATE_OPTIONS[format])
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function createClockWidget(options: ClockWidgetOptions): ClockWidgetResult {
  let clockFormat = options.clockFormat
  let dateFormat = options.dateFormat
  let intervalId: number | undefined

  // --- Container ---
  const container = document.createElement('div')
  container.className = 'flex flex-col items-center select-none'

  // --- Time ---
  const timeEl = document.createElement('span')
  timeEl.className =
    'text-5xl font-light tracking-tight tabular-nums text-[var(--color-text)]'

  // --- Date ---
  const dateEl = document.createElement('span')
  dateEl.className = 'text-sm font-medium opacity-50 text-[var(--color-text)] mt-1'

  container.appendChild(timeEl)
  container.appendChild(dateEl)

  // --- Tick ---
  function tick(): void {
    const now = new Date()
    timeEl.textContent = formatTime(now, clockFormat)
    dateEl.textContent = formatDate(now, dateFormat)
  }

  function startInterval(): void {
    stopInterval()
    tick()
    intervalId = window.setInterval(tick, 1000)
  }

  function stopInterval(): void {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId)
      intervalId = undefined
    }
  }

  startInterval()

  return {
    element: container,
    update(next) {
      if (next.clockFormat !== undefined) clockFormat = next.clockFormat
      if (next.dateFormat !== undefined) dateFormat = next.dateFormat
      tick()
    },
    show() {
      container.classList.remove('hidden')
      startInterval()
    },
    hide() {
      container.classList.add('hidden')
      stopInterval()
    },
    destroy() {
      stopInterval()
    },
  }
}
