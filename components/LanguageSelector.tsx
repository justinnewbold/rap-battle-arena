'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useTranslation, SUPPORTED_LOCALES, Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface LanguageSelectorProps {
  variant?: 'default' | 'compact'
  className?: string
}

export default function LanguageSelector({ variant = 'default', className }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const currentLocale = SUPPORTED_LOCALES.find(l => l.code === locale)

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 transition-colors",
          variant === 'default'
            ? "px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-xl"
            : "p-2 hover:bg-dark-800 rounded-lg"
        )}
      >
        <Globe className="w-5 h-5 text-purple-400" />
        {variant === 'default' && (
          <>
            <span className="hidden sm:inline">{currentLocale?.flag}</span>
            <span>{currentLocale?.name}</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </>
        )}
        {variant === 'compact' && (
          <span className="text-sm">{currentLocale?.flag}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-dark-900 border border-dark-700 rounded-xl overflow-hidden shadow-xl"
            >
              <div className="p-2">
                <p className="px-3 py-2 text-xs text-dark-400 uppercase tracking-wider">
                  {t('settings.language')}
                </p>
                {SUPPORTED_LOCALES.map((loc) => (
                  <button
                    key={loc.code}
                    onClick={() => {
                      setLocale(loc.code)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      locale === loc.code
                        ? "bg-purple-500/20 text-purple-400"
                        : "hover:bg-dark-800"
                    )}
                  >
                    <span className="text-xl">{loc.flag}</span>
                    <span className="flex-1 text-left">{loc.name}</span>
                    {locale === loc.code && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
