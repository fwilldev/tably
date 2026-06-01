export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  pinned: boolean;
  active: boolean;
  lastAccessed?: number;
  windowId: number;
}

export interface ThemeColors {
  bg: string;       // --color-bg
  surface: string;  // --color-surface
  accent: string;   // --color-accent
  text: string;     // --color-text
}

export interface ThemePreset {
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export interface CustomPane {
  id: string;
  name: string;
  filter: string;
}

export type ClockFormat = '12h' | '24h'
export type DateFormat = 'us' | 'de' | 'iso'

export type BuiltinPaneId = 'all' | 'stale' | 'duplicate' | 'localhost'

export interface UserSettings {
  mode: 'light' | 'dark' | 'system';
  activeTheme: 'default' | 'preset' | 'custom' | 'ai';
  presetName?: string;
  customColors?: { light: ThemeColors; dark: ThemeColors };
  openRouterApiKey?: string;
  openRouterModel?: string;
  incognitoMode?: boolean;
  hiddenPanes?: BuiltinPaneId[];
  customPanes?: CustomPane[];
  showClock?: boolean;
  clockFormat?: ClockFormat;
  dateFormat?: DateFormat;
  searchIncludeHistory?: boolean;
  searchIncludeBookmarks?: boolean;
  autoPanes?: boolean;
}
