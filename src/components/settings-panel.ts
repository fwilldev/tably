import type { UserSettings, ThemeColors, BuiltinPaneId, CustomPane, ClockFormat, DateFormat } from '../types'
import { PRESETS } from '../data/presets'
import { validatePalette } from '../utils/theme'

export interface SettingsPanelOptions {
  onSettingsChange: (settings: Partial<UserSettings>) => void
  onGenerateAiPalette: (apiKey: string, model: string, customPrompt: string) => Promise<void>
  currentSettings: UserSettings
}

export interface SettingsPanelResult {
  element: HTMLElement
  open: () => void
  close: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSectionLabel(text: string): HTMLElement {
  const label = document.createElement('h3')
  label.className =
    'text-[11px] font-semibold tracking-widest uppercase opacity-50 text-[var(--color-text)]'
  label.textContent = text
  return label
}

function createDivider(): HTMLElement {
  const hr = document.createElement('hr')
  hr.className = 'border-[var(--color-text)]/10'
  return hr
}

// ---------------------------------------------------------------------------
// Mode toggle (Light / Dark / System)
// ---------------------------------------------------------------------------

function createModeToggle(
  current: UserSettings['mode'],
  onChange: (mode: UserSettings['mode']) => void
): HTMLElement {
  const modes: UserSettings['mode'][] = ['light', 'dark', 'system']
  const labels: Record<UserSettings['mode'], string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System'
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col gap-2'
  wrapper.appendChild(createSectionLabel('Appearance'))

  const group = document.createElement('div')
  group.className = 'flex rounded-lg overflow-hidden border border-[var(--color-text)]/10'
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', 'Appearance mode')

  const buttons: HTMLButtonElement[] = []

  for (const mode of modes) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', mode === current ? 'true' : 'false')
    btn.className = buildModeButtonClass(mode === current)
    btn.textContent = labels[mode]

    btn.addEventListener('click', () => {
      for (const other of buttons) {
        other.setAttribute('aria-checked', 'false')
        other.className = buildModeButtonClass(false)
      }
      btn.setAttribute('aria-checked', 'true')
      btn.className = buildModeButtonClass(true)
      onChange(mode)
    })

    buttons.push(btn)
    group.appendChild(btn)
  }

  wrapper.appendChild(group)
  return wrapper
}

function buildModeButtonClass(active: boolean): string {
  const base =
    'flex-1 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] outline-[var(--color-accent)]'
  return active
    ? `${base} bg-[var(--color-accent)] text-[var(--color-bg)]`
    : `${base} text-[var(--color-text)] hover:bg-[var(--color-accent)]/10`
}

// ---------------------------------------------------------------------------
// Theme selector (Default / Preset / Custom / AI)
// ---------------------------------------------------------------------------

function createThemeSelector(
  current: UserSettings['activeTheme'],
  onChange: (theme: UserSettings['activeTheme']) => void
): { wrapper: HTMLElement; buttons: Map<UserSettings['activeTheme'], HTMLButtonElement> } {
  const themes: UserSettings['activeTheme'][] = ['default', 'preset', 'custom', 'ai']
  const labels: Record<UserSettings['activeTheme'], string> = {
    default: 'Default',
    preset: 'Preset',
    custom: 'Custom',
    ai: 'AI'
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col gap-2'
  wrapper.appendChild(createSectionLabel('Theme'))

  const group = document.createElement('div')
  group.className = 'flex rounded-lg overflow-hidden border border-[var(--color-text)]/10'
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', 'Theme mode')

  const buttonMap = new Map<UserSettings['activeTheme'], HTMLButtonElement>()

  for (const theme of themes) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', theme === current ? 'true' : 'false')
    btn.className = buildModeButtonClass(theme === current)
    btn.textContent = labels[theme]

    btn.addEventListener('click', () => {
      for (const [, other] of buttonMap) {
        other.setAttribute('aria-checked', 'false')
        other.className = buildModeButtonClass(false)
      }
      btn.setAttribute('aria-checked', 'true')
      btn.className = buildModeButtonClass(true)
      onChange(theme)
    })

    buttonMap.set(theme, btn)
    group.appendChild(btn)
  }

  wrapper.appendChild(group)
  return { wrapper, buttons: buttonMap }
}

// ---------------------------------------------------------------------------
// Preset swatches
// ---------------------------------------------------------------------------

function createPresetSwatches(
  selectedName: string | undefined,
  onSelect: (presetName: string) => void
): HTMLElement {
  const container = document.createElement('div')
  container.className = 'flex flex-col gap-2'

  for (const preset of PRESETS) {
    const card = document.createElement('button')
    card.type = 'button'
    const isActive = preset.name === selectedName
    card.className = buildPresetCardClass(isActive)
    card.setAttribute('aria-label', `Select ${preset.name} theme`)
    card.setAttribute('aria-pressed', isActive ? 'true' : 'false')

    // Preset name
    const name = document.createElement('span')
    name.className = 'text-xs font-medium text-[var(--color-text)]'
    name.textContent = preset.name

    // Color dots
    const dots = document.createElement('span')
    dots.className = 'flex gap-1.5 ml-auto'

    const colorKeys: (keyof ThemeColors)[] = ['bg', 'surface', 'accent', 'text']
    for (const key of colorKeys) {
      const dot = document.createElement('span')
      dot.className = 'w-3.5 h-3.5 rounded-full border border-[var(--color-text)]/15'
      dot.style.backgroundColor = preset.light[key]
      dot.title = key
      dot.setAttribute('aria-hidden', 'true')
      dots.appendChild(dot)
    }

    card.appendChild(name)
    card.appendChild(dots)

    card.addEventListener('click', () => {
      onSelect(preset.name)
    })

    container.appendChild(card)
  }

  return container
}

function buildPresetCardClass(active: boolean): string {
  const base =
    'flex items-center gap-3 w-full px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)]'
  return active
    ? `${base} bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30`
    : `${base} border border-[var(--color-text)]/10 hover:bg-[var(--color-accent)]/5`
}

// ---------------------------------------------------------------------------
// Custom color inputs
// ---------------------------------------------------------------------------

interface CustomColorInputsResult {
  element: HTMLElement
  updateWarning: (colors: ThemeColors) => void
}

function createCustomColorInputs(
  currentColors: ThemeColors | undefined,
  onColorChange: (key: keyof ThemeColors, value: string) => void
): CustomColorInputsResult {
  const defaults: ThemeColors = currentColors ?? {
    bg: '#FFFFFF',
    surface: '#F5F5F5',
    accent: '#1A1A1A',
    text: '#1A1A1A'
  }

  const fields: { key: keyof ThemeColors; label: string }[] = [
    { key: 'bg', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'accent', label: 'Accent' },
    { key: 'text', label: 'Text' }
  ]

  const container = document.createElement('div')
  container.className = 'flex flex-col gap-3'

  // Track current colors for preview + validation
  const liveColors: ThemeColors = { ...defaults }

  // Hex value displays keyed by color field
  const hexDisplays = new Map<keyof ThemeColors, HTMLSpanElement>()

  // Preview swatches keyed by color field
  const previewSwatches = new Map<keyof ThemeColors, HTMLSpanElement>()

  // --- Color fields (vertical stack) ---
  const fieldsContainer = document.createElement('div')
  fieldsContainer.className = 'flex flex-col gap-3'

  for (const { key, label } of fields) {
    const fieldWrapper = document.createElement('div')
    fieldWrapper.className = 'flex flex-col gap-1'

    // Row: label + hex value + color input
    const labelRow = document.createElement('label')
    labelRow.className = 'flex items-center gap-2'

    const labelEl = document.createElement('span')
    labelEl.className = 'text-[11px] font-medium opacity-60 text-[var(--color-text)]'
    labelEl.textContent = label

    const hexText = document.createElement('span')
    hexText.className = 'ml-auto text-[11px] font-mono opacity-40 text-[var(--color-text)]'
    hexText.textContent = defaults[key].toUpperCase()
    hexDisplays.set(key, hexText)

    const input = document.createElement('input')
    input.type = 'color'
    input.value = defaults[key]
    input.className =
      'w-8 h-8 shrink-0 rounded-md border border-[var(--color-text)]/10 cursor-pointer bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)]'
    input.setAttribute('aria-label', `${label} color`)

    input.addEventListener('input', () => {
      liveColors[key] = input.value
      hexText.textContent = input.value.toUpperCase()

      // Update preview swatch
      const swatch = previewSwatches.get(key)
      if (swatch) {
        swatch.style.backgroundColor = input.value
      }

      // Update contrast warning
      updateWarning(liveColors)

      onColorChange(key, input.value)
    })

    labelRow.appendChild(labelEl)
    labelRow.appendChild(hexText)
    labelRow.appendChild(input)
    fieldWrapper.appendChild(labelRow)
    fieldsContainer.appendChild(fieldWrapper)
  }

  container.appendChild(fieldsContainer)

  // --- Preview bar with 4 swatches ---
  const previewSection = document.createElement('div')
  previewSection.className = 'flex flex-col gap-1.5'

  const previewLabel = document.createElement('span')
  previewLabel.className = 'text-[11px] font-medium opacity-60 text-[var(--color-text)]'
  previewLabel.textContent = 'Preview'

  const previewBar = document.createElement('div')
  previewBar.className =
    'flex gap-2 items-center px-3 py-2 rounded-lg border border-[var(--color-text)]/10'

  for (const { key } of fields) {
    const swatch = document.createElement('span')
    swatch.className = 'w-7 h-7 rounded-full border border-[var(--color-text)]/15'
    swatch.style.backgroundColor = defaults[key]
    swatch.setAttribute('aria-hidden', 'true')
    previewSwatches.set(key, swatch)
    previewBar.appendChild(swatch)
  }

  previewSection.appendChild(previewLabel)
  previewSection.appendChild(previewBar)
  container.appendChild(previewSection)

  // --- Low-contrast warning ---
  const warningEl = document.createElement('p')
  warningEl.className = 'text-[11px] text-amber-500 hidden'
  warningEl.setAttribute('role', 'status')
  container.appendChild(warningEl)

  function updateWarning(colors: ThemeColors): void {
    const result = validatePalette(colors)
    if (!result.valid && result.reason) {
      warningEl.textContent = result.reason
      warningEl.classList.remove('hidden')
    } else {
      warningEl.textContent = ''
      warningEl.classList.add('hidden')
    }
  }

  // Initial warning check
  updateWarning(liveColors)

  return { element: container, updateWarning }
}

// ---------------------------------------------------------------------------
// AI section
// ---------------------------------------------------------------------------

interface AiSectionOptions {
  apiKey: string
  model: string
  onApiKeyChange: (value: string) => void
  onModelChange: (value: string) => void
  onGenerateAiPalette: (apiKey: string, model: string, customPrompt: string) => Promise<void>
}

function createAiSection(options: AiSectionOptions): HTMLElement {
  const {
    apiKey,
    model,
    onApiKeyChange,
    onModelChange,
    onGenerateAiPalette
  } = options

  const container = document.createElement('div')
  container.className = 'flex flex-col gap-3'

  let isGenerating = false
  let errorTimer: number | undefined

  const buttonContent = document.createElement('span')
  buttonContent.className = 'inline-flex items-center justify-center gap-2'

  const spinner = document.createElement('span')
  spinner.className =
    'hidden w-3.5 h-3.5 rounded-full border-2 border-[var(--color-bg)]/40 border-t-[var(--color-bg)] animate-spin'
  spinner.setAttribute('aria-hidden', 'true')

  const buttonText = document.createElement('span')
  buttonText.textContent = 'Generate Palette'

  buttonContent.appendChild(spinner)
  buttonContent.appendChild(buttonText)

  const errorText = document.createElement('p')
  errorText.className = 'hidden text-[11px] text-red-500'
  errorText.setAttribute('role', 'status')

  const hasCredentials = (): boolean => keyInput.value.trim().length > 0 && modelInput.value.trim().length > 0

  const clearError = (): void => {
    if (errorTimer) {
      window.clearTimeout(errorTimer)
      errorTimer = undefined
    }
    errorText.textContent = ''
    errorText.classList.add('hidden')
  }

  const showError = (message: string): void => {
    clearError()
    errorText.textContent = message
    errorText.classList.remove('hidden')
    errorTimer = window.setTimeout(() => {
      errorText.textContent = ''
      errorText.classList.add('hidden')
      errorTimer = undefined
    }, 5000)
  }

  const updateGenerateButton = (): void => {
    const disabledForMissingConfig = !hasCredentials()
    const disabled = disabledForMissingConfig || isGenerating
    generateBtn.disabled = disabled
    generateBtn.classList.toggle('opacity-50', disabled)
    generateBtn.classList.toggle('cursor-not-allowed', disabled)
    generateBtn.classList.toggle('cursor-pointer', !disabled)

    if (disabledForMissingConfig) {
      generateBtn.title = 'Set API key and model in settings above'
    } else {
      generateBtn.removeAttribute('title')
    }

    spinner.classList.toggle('hidden', !isGenerating)
    buttonText.textContent = isGenerating ? 'Generating...' : 'Generate Palette'
  }

  // Custom prompt input
  const promptLabel = document.createElement('label')
  promptLabel.className = 'flex flex-col gap-1'

  const promptLabelText = document.createElement('span')
  promptLabelText.className = 'text-[11px] font-medium opacity-60 text-[var(--color-text)]'
  promptLabelText.textContent = 'Style Prompt (optional)'

  const promptInput = document.createElement('input')
  promptInput.type = 'text'
  promptInput.placeholder = 'e.g. "With dark blue" or "make it moody"'
  promptInput.className = buildTextInputClass()
  promptInput.setAttribute('aria-label', 'Custom style prompt for AI palette')

  promptLabel.appendChild(promptLabelText)
  promptLabel.appendChild(promptInput)
  container.appendChild(promptLabel)

  // Generate Palette button
  const generateBtn = document.createElement('button')
  generateBtn.type = 'button'
  generateBtn.className =
    'w-full px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)]'
  generateBtn.appendChild(buttonContent)
  container.appendChild(generateBtn)
  container.appendChild(errorText)

  // API Key
  const keyLabel = document.createElement('label')
  keyLabel.className = 'flex flex-col gap-1'

  const keyLabelText = document.createElement('span')
  keyLabelText.className = 'text-[11px] font-medium opacity-60 text-[var(--color-text)]'
  keyLabelText.textContent = 'API Key'

  const keyInput = document.createElement('input')
  keyInput.type = 'password'
  keyInput.placeholder = 'sk-or-...'
  keyInput.value = apiKey
  keyInput.className = buildTextInputClass()
  keyInput.setAttribute('aria-label', 'OpenRouter API key')
  keyInput.autocomplete = 'off'

  keyInput.addEventListener('input', () => {
    clearError()
    onApiKeyChange(keyInput.value)
    updateGenerateButton()
  })

  keyLabel.appendChild(keyLabelText)
  keyLabel.appendChild(keyInput)
  container.appendChild(keyLabel)

  // Model
  const modelLabel = document.createElement('label')
  modelLabel.className = 'flex flex-col gap-1'

  const modelLabelText = document.createElement('span')
  modelLabelText.className = 'text-[11px] font-medium opacity-60 text-[var(--color-text)]'
  modelLabelText.textContent = 'Model'

  const modelInput = document.createElement('input')
  modelInput.type = 'text'
  modelInput.placeholder = 'openai/gpt-4o-mini'
  modelInput.value = model
  modelInput.className = buildTextInputClass()
  modelInput.setAttribute('aria-label', 'OpenRouter model ID')

  modelInput.addEventListener('input', () => {
    clearError()
    onModelChange(modelInput.value)
    updateGenerateButton()
  })

  modelLabel.appendChild(modelLabelText)
  modelLabel.appendChild(modelInput)
  container.appendChild(modelLabel)

  // Help text
  const help = document.createElement('p')
  help.className = 'text-[10px] opacity-40 text-[var(--color-text)]'
  help.textContent = 'Get your API key at openrouter.ai'
  container.appendChild(help)

  generateBtn.addEventListener('click', async () => {
    if (generateBtn.disabled) {
      return
    }

    clearError()
    isGenerating = true
    updateGenerateButton()

    try {
      await onGenerateAiPalette(keyInput.value.trim(), modelInput.value.trim(), promptInput.value.trim())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI returned an unexpected response. Try again'
      showError(message)
    } finally {
      isGenerating = false
      updateGenerateButton()
    }
  })

  updateGenerateButton()

  return container
}

function buildTextInputClass(): string {
  return 'w-full px-2.5 py-1.5 rounded-md text-xs border border-[var(--color-text)]/10 bg-[var(--color-bg)] text-[var(--color-text)] placeholder:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)]'
}

// ---------------------------------------------------------------------------
// Clock & Date section
// ---------------------------------------------------------------------------

interface ClockSectionOptions {
  showClock: boolean
  clockFormat: ClockFormat
  dateFormat: DateFormat
  onShowClockChange: (show: boolean) => void
  onClockFormatChange: (format: ClockFormat) => void
  onDateFormatChange: (format: DateFormat) => void
}

function createClockSection(options: ClockSectionOptions): HTMLElement {
  const {
    onShowClockChange,
    onClockFormatChange,
    onDateFormatChange,
  } = options

  let showClock = options.showClock

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col gap-3'
  wrapper.appendChild(createSectionLabel('Clock & Date'))

  // --- Show/hide toggle ---
  const toggleRow = document.createElement('label')
  toggleRow.className = 'flex items-center gap-2.5 cursor-pointer px-1 py-1 rounded-md hover:bg-[var(--color-accent)]/5'

  const toggleCheckbox = document.createElement('input')
  toggleCheckbox.type = 'checkbox'
  toggleCheckbox.checked = showClock
  toggleCheckbox.className = 'w-3.5 h-3.5 rounded accent-[var(--color-accent)] cursor-pointer'
  toggleCheckbox.setAttribute('aria-label', 'Show clock and date')

  const toggleLabel = document.createElement('span')
  toggleLabel.className = 'text-xs text-[var(--color-text)]'
  toggleLabel.textContent = 'Show Clock & Date'

  toggleRow.appendChild(toggleCheckbox)
  toggleRow.appendChild(toggleLabel)
  wrapper.appendChild(toggleRow)

  // --- Options container (hidden when clock is off) ---
  const optionsContainer = document.createElement('div')
  optionsContainer.className = 'flex flex-col gap-3'
  if (!showClock) optionsContainer.classList.add('hidden')

  // --- Clock format (12h / 24h) ---
  const clockFormatLabel = document.createElement('span')
  clockFormatLabel.className = 'text-[11px] font-medium opacity-60 text-[var(--color-text)]'
  clockFormatLabel.textContent = 'Time Format'
  optionsContainer.appendChild(clockFormatLabel)

  const clockFormats: ClockFormat[] = ['24h', '12h']
  const clockFormatLabels: Record<ClockFormat, string> = { '24h': '24h', '12h': '12h' }

  const clockFormatGroup = document.createElement('div')
  clockFormatGroup.className = 'flex rounded-lg overflow-hidden border border-[var(--color-text)]/10'
  clockFormatGroup.setAttribute('role', 'radiogroup')
  clockFormatGroup.setAttribute('aria-label', 'Time format')

  const clockFormatButtons: HTMLButtonElement[] = []

  for (const fmt of clockFormats) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', fmt === options.clockFormat ? 'true' : 'false')
    btn.className = buildModeButtonClass(fmt === options.clockFormat)
    btn.textContent = clockFormatLabels[fmt]

    btn.addEventListener('click', () => {
      for (const other of clockFormatButtons) {
        other.setAttribute('aria-checked', 'false')
        other.className = buildModeButtonClass(false)
      }
      btn.setAttribute('aria-checked', 'true')
      btn.className = buildModeButtonClass(true)
      onClockFormatChange(fmt)
    })

    clockFormatButtons.push(btn)
    clockFormatGroup.appendChild(btn)
  }

  optionsContainer.appendChild(clockFormatGroup)

  // --- Date format ---
  const dateFormatLabel = document.createElement('span')
  dateFormatLabel.className = 'text-[11px] font-medium opacity-60 text-[var(--color-text)] mt-1'
  dateFormatLabel.textContent = 'Date Format'
  optionsContainer.appendChild(dateFormatLabel)

  const dateFormats: DateFormat[] = ['us', 'de', 'iso']
  const dateFormatLabelsMap: Record<DateFormat, string> = {
    us: 'US',
    de: 'German',
    iso: 'ISO',
  }

  const dateFormatGroup = document.createElement('div')
  dateFormatGroup.className = 'flex rounded-lg overflow-hidden border border-[var(--color-text)]/10'
  dateFormatGroup.setAttribute('role', 'radiogroup')
  dateFormatGroup.setAttribute('aria-label', 'Date format')

  const dateFormatButtons: HTMLButtonElement[] = []

  for (const fmt of dateFormats) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', fmt === options.dateFormat ? 'true' : 'false')
    btn.className = buildModeButtonClass(fmt === options.dateFormat)
    btn.textContent = dateFormatLabelsMap[fmt]

    btn.addEventListener('click', () => {
      for (const other of dateFormatButtons) {
        other.setAttribute('aria-checked', 'false')
        other.className = buildModeButtonClass(false)
      }
      btn.setAttribute('aria-checked', 'true')
      btn.className = buildModeButtonClass(true)
      onDateFormatChange(fmt)
    })

    dateFormatButtons.push(btn)
    dateFormatGroup.appendChild(btn)
  }

  optionsContainer.appendChild(dateFormatGroup)

  wrapper.appendChild(optionsContainer)

  // --- Toggle visibility of options ---
  toggleCheckbox.addEventListener('change', () => {
    showClock = toggleCheckbox.checked
    onShowClockChange(showClock)
    if (showClock) {
      optionsContainer.classList.remove('hidden')
    } else {
      optionsContainer.classList.add('hidden')
    }
  })

  return wrapper
}

// ---------------------------------------------------------------------------
// Panes section
// ---------------------------------------------------------------------------

const BUILTIN_PANE_LABELS: Record<BuiltinPaneId, string> = {
  all: 'All Tabs',
  stale: 'Stale Tabs',
  duplicate: 'Duplicate Tabs',
  localhost: 'Localhost Tabs',
}

const BUILTIN_PANE_IDS: BuiltinPaneId[] = ['all', 'stale', 'duplicate', 'localhost']

interface PanesSectionOptions {
  hiddenPanes: BuiltinPaneId[]
  customPanes: CustomPane[]
  onHiddenPanesChange: (hiddenPanes: BuiltinPaneId[]) => void
  onCustomPanesChange: (customPanes: CustomPane[]) => void
}

function createPanesSection(options: PanesSectionOptions): HTMLElement {
  const { onHiddenPanesChange, onCustomPanesChange } = options
  let hiddenPanes = [...options.hiddenPanes]
  let customPanes = [...options.customPanes]

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col gap-3'
  wrapper.appendChild(createSectionLabel('Panes'))

  // --- Built-in pane toggles ---
  const builtinList = document.createElement('div')
  builtinList.className = 'flex flex-col gap-1.5'

  for (const id of BUILTIN_PANE_IDS) {
    const row = document.createElement('label')
    row.className = 'flex items-center gap-2.5 cursor-pointer px-1 py-1 rounded-md hover:bg-[var(--color-accent)]/5'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = !hiddenPanes.includes(id)
    checkbox.className = 'w-3.5 h-3.5 rounded accent-[var(--color-accent)] cursor-pointer'
    checkbox.setAttribute('aria-label', `Show ${BUILTIN_PANE_LABELS[id]}`)

    const label = document.createElement('span')
    label.className = 'text-xs text-[var(--color-text)]'
    label.textContent = BUILTIN_PANE_LABELS[id]

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        hiddenPanes = hiddenPanes.filter((p) => p !== id)
      } else {
        hiddenPanes = [...hiddenPanes, id]
      }
      onHiddenPanesChange(hiddenPanes)
    })

    row.appendChild(checkbox)
    row.appendChild(label)
    builtinList.appendChild(row)
  }

  wrapper.appendChild(builtinList)

  // --- Custom panes ---
  const customSection = document.createElement('div')
  customSection.className = 'flex flex-col gap-2'

  const customLabel = document.createElement('span')
  customLabel.className = 'text-[11px] font-semibold tracking-widest uppercase opacity-50 text-[var(--color-text)] mt-1'
  customLabel.textContent = 'Custom Panes'
  customSection.appendChild(customLabel)

  const customList = document.createElement('div')
  customList.className = 'flex flex-col gap-1.5'

  function renderCustomList(): void {
    customList.innerHTML = ''

    if (customPanes.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'text-[11px] italic opacity-40 py-1 text-[var(--color-text)]'
      empty.textContent = 'No custom panes yet'
      customList.appendChild(empty)
      return
    }

    for (const pane of customPanes) {
      const row = document.createElement('div')
      row.className = 'flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--color-text)]/10'

      const info = document.createElement('div')
      info.className = 'flex flex-col gap-0.5 min-w-0 flex-1'

      const name = document.createElement('span')
      name.className = 'text-xs font-medium truncate text-[var(--color-text)]'
      name.textContent = pane.name

      const filter = document.createElement('span')
      filter.className = 'text-[10px] truncate opacity-50 text-[var(--color-text)]'
      filter.textContent = `Filter: ${pane.filter}`

      info.appendChild(name)
      info.appendChild(filter)

      const deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className =
        'inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-md text-xs cursor-pointer transition-opacity duration-150 opacity-40 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 text-[var(--color-text)] outline-[var(--color-accent)]'
      deleteBtn.title = `Remove "${pane.name}"`
      deleteBtn.setAttribute('aria-label', `Remove ${pane.name}`)
      deleteBtn.textContent = '\u2715'

      deleteBtn.addEventListener('click', () => {
        customPanes = customPanes.filter((p) => p.id !== pane.id)
        onCustomPanesChange(customPanes)
        renderCustomList()
      })

      row.appendChild(info)
      row.appendChild(deleteBtn)
      customList.appendChild(row)
    }
  }

  renderCustomList()
  customSection.appendChild(customList)

  // --- Add custom pane form ---
  const form = document.createElement('div')
  form.className = 'flex flex-col gap-2 mt-1'

  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.placeholder = 'Pane name'
  nameInput.className = buildTextInputClass()
  nameInput.setAttribute('aria-label', 'Custom pane name')

  const filterInput = document.createElement('input')
  filterInput.type = 'text'
  filterInput.placeholder = 'Filter (matches title or URL)'
  filterInput.className = buildTextInputClass()
  filterInput.setAttribute('aria-label', 'Custom pane filter')

  const addBtn = document.createElement('button')
  addBtn.type = 'button'
  addBtn.className =
    'w-full px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 outline-[var(--color-accent)]'
  addBtn.textContent = '+ Add Pane'

  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim()
    const filter = filterInput.value.trim()
    if (!name || !filter) return

    const newPane: CustomPane = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      filter,
    }

    customPanes = [...customPanes, newPane]
    onCustomPanesChange(customPanes)
    renderCustomList()

    nameInput.value = ''
    filterInput.value = ''
  })

  form.appendChild(nameInput)
  form.appendChild(filterInput)
  form.appendChild(addBtn)
  customSection.appendChild(form)

  wrapper.appendChild(customSection)
  return wrapper
}

// ---------------------------------------------------------------------------
// Behavior section (Search history + Auto-panes)
// ---------------------------------------------------------------------------

interface BehaviorSectionOptions {
  searchIncludeHistory: boolean
  searchIncludeBookmarks: boolean
  autoPanes: boolean
  onSearchIncludeHistoryChange: (enabled: boolean) => void
  onSearchIncludeBookmarksChange: (enabled: boolean) => void
  onAutoPanesChange: (enabled: boolean) => void
}

function createBehaviorSection(options: BehaviorSectionOptions): HTMLElement {
  const {
    onSearchIncludeHistoryChange,
    onSearchIncludeBookmarksChange,
    onAutoPanesChange,
  } = options

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col gap-3'
  wrapper.appendChild(createSectionLabel('Behavior'))

  const toggles: { label: string; ariaLabel: string; checked: boolean; onChange: (v: boolean) => void }[] = [
    {
      label: 'Include bookmarks in search',
      ariaLabel: 'Include bookmarks in tab search results',
      checked: options.searchIncludeBookmarks,
      onChange: onSearchIncludeBookmarksChange,
    },
    {
      label: 'Include browser history in search',
      ariaLabel: 'Include browser history in tab search results',
      checked: options.searchIncludeHistory,
      onChange: onSearchIncludeHistoryChange,
    },
    {
      label: 'Auto-group tabs by domain',
      ariaLabel: 'Automatically create panes grouped by website domain',
      checked: options.autoPanes,
      onChange: onAutoPanesChange,
    },
  ]

  for (const toggle of toggles) {
    const row = document.createElement('label')
    row.className = 'flex items-center gap-2.5 cursor-pointer px-1 py-1 rounded-md hover:bg-[var(--color-accent)]/5'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = toggle.checked
    checkbox.className = 'w-3.5 h-3.5 rounded accent-[var(--color-accent)] cursor-pointer'
    checkbox.setAttribute('aria-label', toggle.ariaLabel)

    const label = document.createElement('span')
    label.className = 'text-xs text-[var(--color-text)]'
    label.textContent = toggle.label

    checkbox.addEventListener('change', () => {
      toggle.onChange(checkbox.checked)
    })

    row.appendChild(checkbox)
    row.appendChild(label)
    wrapper.appendChild(row)
  }

  return wrapper
}

// ---------------------------------------------------------------------------
// Settings Panel (main export)
// ---------------------------------------------------------------------------

export function createSettingsPanel(options: SettingsPanelOptions): SettingsPanelResult {
  const { onSettingsChange, onGenerateAiPalette, currentSettings } = options

  // Track local state for conditional rendering
  let activeTheme = currentSettings.activeTheme
  let presetName = currentSettings.presetName
  let customColors = currentSettings.customColors
  let openRouterApiKey = currentSettings.openRouterApiKey ?? ''
  let openRouterModel = currentSettings.openRouterModel ?? ''

  // --- Overlay ---
  const overlay = document.createElement('div')
  overlay.className =
    'fixed inset-0 z-50 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-300'
  overlay.setAttribute('aria-hidden', 'true')

  // --- Panel ---
  const panel = document.createElement('aside')
  panel.className =
    'fixed top-0 right-0 z-50 h-full w-80 max-sm:w-full translate-x-full transition-transform duration-300 ease-in-out bg-[var(--color-surface)] overflow-y-auto'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Settings')
  panel.setAttribute('aria-modal', 'true')

  const panelId = `settings-panel-${Date.now()}`
  panel.id = panelId

  // --- Inner scroll container ---
  const inner = document.createElement('div')
  inner.className = 'flex flex-col gap-5 p-5'

  // --- Header ---
  const header = document.createElement('div')
  header.className = 'flex items-center justify-between'

  const title = document.createElement('h2')
  title.className = 'text-sm font-semibold tracking-wide text-[var(--color-text)]'
  title.textContent = 'Settings'
  title.id = `${panelId}-title`
  panel.setAttribute('aria-labelledby', title.id)

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className =
    'inline-flex items-center justify-center w-7 h-7 rounded-md cursor-pointer transition-opacity duration-150 opacity-50 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 text-[var(--color-text)] outline-[var(--color-accent)]'
  closeBtn.setAttribute('aria-label', 'Close settings')
  closeBtn.textContent = '\u2715'

  header.appendChild(title)
  header.appendChild(closeBtn)
  inner.appendChild(header)

  inner.appendChild(createDivider())

  // --- Mode section ---
  const modeToggle = createModeToggle(currentSettings.mode, (mode) => {
    onSettingsChange({ mode })
  })
  inner.appendChild(modeToggle)

  inner.appendChild(createDivider())

  // --- Theme section ---
  // Dynamic content area below the theme selector
  const dynamicArea = document.createElement('div')
  dynamicArea.className = 'flex flex-col gap-3 overflow-hidden'
  dynamicArea.style.transition = 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)'

  let dynamicFirstRender = true

  function buildDynamicContent(): HTMLElement | null {
    if (activeTheme === 'preset') {
      return createPresetSwatches(presetName, (name) => {
        presetName = name
        onSettingsChange({ activeTheme: 'preset', presetName: name })
        renderDynamicArea()
      })
    }

    if (activeTheme === 'custom') {
      const resolvedColors = customColors
        ? customColors.light
        : undefined

      const { element: colorInputsEl } = createCustomColorInputs(resolvedColors, (key, value) => {
        const base: ThemeColors = customColors?.light ?? {
          bg: '#FFFFFF',
          surface: '#F5F5F5',
          accent: '#1A1A1A',
          text: '#1A1A1A'
        }
        const updatedLight: ThemeColors = { ...base, [key]: value }
        // Mirror to dark for simplicity per plan spec
        customColors = { light: updatedLight, dark: updatedLight }
        onSettingsChange({ activeTheme: 'custom', customColors })
      })
      return colorInputsEl
    }

    if (activeTheme === 'ai') {
      return createAiSection({
        apiKey: openRouterApiKey,
        model: openRouterModel,
        onApiKeyChange: (value) => {
          openRouterApiKey = value
          onSettingsChange({ openRouterApiKey: value })
        },
        onModelChange: (value) => {
          openRouterModel = value
          onSettingsChange({ openRouterModel: value })
        },
        onGenerateAiPalette
      })
    }

    // 'default' shows nothing extra
    return null
  }

  function renderDynamicArea(): void {
    const newContent = buildDynamicContent()

    if (dynamicFirstRender) {
      dynamicFirstRender = false
      dynamicArea.innerHTML = ''
      if (newContent) {
        dynamicArea.appendChild(newContent)
      }
      dynamicArea.style.height = 'auto'
      return
    }

    // --- Animated swap ---
    const currentHeight = dynamicArea.scrollHeight

    // Lock current height
    dynamicArea.style.height = `${currentHeight}px`

    // Fade out existing content
    const existingChildren = [...dynamicArea.children] as HTMLElement[]
    for (const child of existingChildren) {
      child.style.transition = 'opacity 150ms ease'
      child.style.opacity = '0'
    }

    setTimeout(() => {
      // Swap content
      dynamicArea.innerHTML = ''
      if (newContent) {
        newContent.style.opacity = '0'
        newContent.style.transform = 'translateY(-6px)'
        newContent.style.transition = 'opacity 200ms ease, transform 200ms ease'
        dynamicArea.appendChild(newContent)
      }

      // Measure target height
      const prevTransition = dynamicArea.style.transition
      dynamicArea.style.transition = 'none'
      dynamicArea.style.height = 'auto'
      const targetHeight = dynamicArea.scrollHeight
      dynamicArea.style.height = `${currentHeight}px`
      dynamicArea.style.transition = prevTransition

      // Animate to new height
      requestAnimationFrame(() => {
        dynamicArea.style.height = `${targetHeight}px`

        // Fade in new content
        if (newContent) {
          requestAnimationFrame(() => {
            newContent.style.opacity = '1'
            newContent.style.transform = 'translateY(0)'
          })
        }

        // Reset to auto when done
        const onEnd = (): void => {
          dynamicArea.removeEventListener('transitionend', onEnd)
          dynamicArea.style.height = 'auto'
        }
        dynamicArea.addEventListener('transitionend', onEnd)
      })
    }, 150) // Wait for fade-out
  }

  const { wrapper: themeSelector } = createThemeSelector(activeTheme, (theme) => {
    activeTheme = theme
    onSettingsChange({ activeTheme: theme })
    renderDynamicArea()
  })

  inner.appendChild(themeSelector)
  inner.appendChild(dynamicArea)

  renderDynamicArea()

  inner.appendChild(createDivider())

  // --- Clock & Date section ---
  const clockSection = createClockSection({
    showClock: currentSettings.showClock ?? true,
    clockFormat: currentSettings.clockFormat ?? '24h',
    dateFormat: currentSettings.dateFormat ?? 'us',
    onShowClockChange: (show) => {
      onSettingsChange({ showClock: show })
    },
    onClockFormatChange: (format) => {
      onSettingsChange({ clockFormat: format })
    },
    onDateFormatChange: (format) => {
      onSettingsChange({ dateFormat: format })
    },
  })
  inner.appendChild(clockSection)

  inner.appendChild(createDivider())

  // --- Panes section ---
  const panesSection = createPanesSection({
    hiddenPanes: currentSettings.hiddenPanes ?? [],
    customPanes: currentSettings.customPanes ?? [],
    onHiddenPanesChange: (hiddenPanes) => {
      onSettingsChange({ hiddenPanes })
    },
    onCustomPanesChange: (customPanes) => {
      onSettingsChange({ customPanes })
    },
  })
  inner.appendChild(panesSection)

  inner.appendChild(createDivider())

  // --- Behavior section ---
  const behaviorSection = createBehaviorSection({
    searchIncludeHistory: currentSettings.searchIncludeHistory ?? false,
    searchIncludeBookmarks: currentSettings.searchIncludeBookmarks !== false,
    autoPanes: currentSettings.autoPanes ?? false,
    onSearchIncludeHistoryChange: (enabled) => {
      onSettingsChange({ searchIncludeHistory: enabled })
    },
    onSearchIncludeBookmarksChange: (enabled) => {
      onSettingsChange({ searchIncludeBookmarks: enabled })
    },
    onAutoPanesChange: (enabled) => {
      onSettingsChange({ autoPanes: enabled })
    },
  })
  inner.appendChild(behaviorSection)

  panel.appendChild(inner)

  // --- Container element ---
  const container = document.createElement('div')
  container.appendChild(overlay)
  container.appendChild(panel)

  // --- Open / Close ---
  let isOpen = false

  function open(): void {
    if (isOpen) return
    isOpen = true
    panel.classList.remove('translate-x-full')
    panel.classList.add('translate-x-0')
    overlay.classList.remove('opacity-0', 'pointer-events-none')
    overlay.classList.add('opacity-100')
    // Focus the close button when panel opens
    closeBtn.focus()
  }

  function close(): void {
    if (!isOpen) return
    isOpen = false
    panel.classList.remove('translate-x-0')
    panel.classList.add('translate-x-full')
    overlay.classList.remove('opacity-100')
    overlay.classList.add('opacity-0', 'pointer-events-none')
  }

  // Close via backdrop click
  overlay.addEventListener('click', close)

  // Close via close button
  closeBtn.addEventListener('click', close)

  // Close via Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      close()
    }
  })

  return { element: container, open, close }
}
