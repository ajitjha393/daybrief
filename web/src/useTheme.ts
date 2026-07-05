import { useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'daybrief-theme'
const ORDER: Theme[] = ['system', 'light', 'dark']

function stored(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

/**
 * Forced theme via <html data-theme="…">; 'system' removes the attribute and
 * lets prefers-color-scheme decide. Persisted across sessions.
 */
export function useTheme(): { theme: Theme; cycle: () => void } {
  const [theme, setTheme] = useState<Theme>(stored)

  useEffect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset['theme']
      localStorage.removeItem(STORAGE_KEY)
    } else {
      document.documentElement.dataset['theme'] = theme
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme])

  const cycle = (): void => {
    setTheme((cur) => ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length] ?? 'system')
  }

  return { theme, cycle }
}
