'use client'

import { useTheme } from '@/lib/hooks/useTheme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-sm text-zinc-400">Theme:</span>
      )}
      <button
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
          resolvedTheme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'
        )}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current: ${resolvedTheme} mode. Click to toggle.`}
      >
        <span
          className={cn(
            'inline-flex h-6 w-6 transform items-center justify-center rounded-full transition-transform',
            'bg-white shadow-sm',
            resolvedTheme === 'dark' ? 'translate-x-7' : 'translate-x-1'
          )}
        >
          {resolvedTheme === 'dark' ? (
            <MoonIcon className="h-4 w-4 text-zinc-700" />
          ) : (
            <SunIcon className="h-4 w-4 text-amber-500" />
          )}
        </span>
      </button>
    </div>
  )
}

// Theme selector with all options
export function ThemeSelector({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const options: { value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon className="h-4 w-4" /> },
    { value: 'system', label: 'System', icon: <ComputerIcon className="h-4 w-4" /> },
  ]

  return (
    <div className={cn('flex rounded-lg bg-zinc-800 p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
            theme === option.value
              ? 'bg-purple-600 text-white'
              : 'text-zinc-400 hover:text-white'
          )}
          aria-pressed={theme === option.value}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

// Icons
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  )
}

function ComputerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )
}
