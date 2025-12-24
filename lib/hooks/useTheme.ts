'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_KEY = 'rap-battle-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme provider component (to be used in layout)
export function createThemeProvider() {
  return function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system')
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')
    const [mounted, setMounted] = useState(false)

    // Initialize theme from localStorage
    useEffect(() => {
      setMounted(true)
      const stored = getStoredTheme()
      setThemeState(stored)
      setResolvedTheme(stored === 'system' ? getSystemTheme() : stored)
    }, [])

    // Listen for system theme changes
    useEffect(() => {
      if (theme !== 'system') return

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }, [theme])

    // Apply theme class to document
    useEffect(() => {
      if (!mounted) return

      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolvedTheme)

      // Update meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          resolvedTheme === 'dark' ? '#0a0a0f' : '#ffffff'
        )
      }
    }, [resolvedTheme, mounted])

    const setTheme = useCallback((newTheme: Theme) => {
      setThemeState(newTheme)
      setResolvedTheme(newTheme === 'system' ? getSystemTheme() : newTheme)
      localStorage.setItem(THEME_KEY, newTheme)
    }, [])

    const toggleTheme = useCallback(() => {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }, [resolvedTheme, setTheme])

    // Prevent flash by not rendering until mounted
    const value: ThemeContextValue = {
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }

    // Script to prevent flash (injected into head)
    const themeScript = `
      (function() {
        const theme = localStorage.getItem('${THEME_KEY}') || 'system';
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        document.documentElement.classList.add(resolved);
      })();
    `

    return (
      <ThemeContext.Provider value={value}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </ThemeContext.Provider>
    )
  }
}

export const ThemeProvider = createThemeProvider()
