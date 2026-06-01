import type { ThemePreset } from '../types'

export const PRESETS: ThemePreset[] = [
  {
    name: 'Monochrome',
    light: { bg: '#FFFFFF', surface: '#F5F5F5', accent: '#1A1A1A', text: '#1A1A1A' },
    dark: { bg: '#0A0A0A', surface: '#1A1A1A', accent: '#E5E5E5', text: '#E5E5E5' }
  },
  {
    name: 'Ocean',
    light: { bg: '#F0F9FF', surface: '#E0F2FE', accent: '#0369A1', text: '#0C4A6E' },
    dark: { bg: '#0C1222', surface: '#1E293B', accent: '#38BDF8', text: '#E0F2FE' }
  },
  {
    name: 'Forest',
    light: { bg: '#F0FDF4', surface: '#DCFCE7', accent: '#15803D', text: '#14532D' },
    dark: { bg: '#0A1A0F', surface: '#1A2E1F', accent: '#4ADE80', text: '#DCFCE7' }
  },
  {
    name: 'Sunset',
    light: { bg: '#FFF7ED', surface: '#FFEDD5', accent: '#C2410C', text: '#7C2D12' },
    dark: { bg: '#1C0F06', surface: '#2D1810', accent: '#FB923C', text: '#FFEDD5' }
  },
  {
    name: 'Lavender',
    light: { bg: '#FAF5FF', surface: '#F3E8FF', accent: '#7C3AED', text: '#4C1D95' },
    dark: { bg: '#13071E', surface: '#1E1030', accent: '#A78BFA', text: '#F3E8FF' }
  },
  {
    name: 'Rose',
    light: { bg: '#FFF1F2', surface: '#FFE4E6', accent: '#BE123C', text: '#881337' },
    dark: { bg: '#1C0910', surface: '#2D1219', accent: '#FB7185', text: '#FFE4E6' }
  },
  {
    name: 'Slate',
    light: { bg: '#F8FAFC', surface: '#E2E8F0', accent: '#475569', text: '#1E293B' },
    dark: { bg: '#0B1120', surface: '#1E293B', accent: '#94A3B8', text: '#E2E8F0' }
  },
  {
    name: 'Amber',
    light: { bg: '#FFFBEB', surface: '#FEF3C7', accent: '#B45309', text: '#78350F' },
    dark: { bg: '#1C1304', surface: '#2D2006', accent: '#FBBF24', text: '#FEF3C7' }
  },
  {
    name: 'Teal',
    light: { bg: '#F0FDFA', surface: '#CCFBF1', accent: '#0F766E', text: '#134E4A' },
    dark: { bg: '#0A1A18', surface: '#142E2A', accent: '#2DD4BF', text: '#CCFBF1' }
  },
  {
    name: 'Noir',
    light: { bg: '#FAFAFA', surface: '#E5E5E5', accent: '#171717', text: '#262626' },
    dark: { bg: '#000000', surface: '#0A0A0A', accent: '#FAFAFA', text: '#D4D4D4' }
  }
]
