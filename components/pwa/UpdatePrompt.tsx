'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { usePWA } from '@/lib/hooks/usePWA'
import { useState } from 'react'

export function UpdatePrompt() {
  const { isUpdateAvailable, updateApp } = usePWA()
  const [isDismissed, setIsDismissed] = useState(false)

  if (!isUpdateAvailable || isDismissed) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-4 shadow-lg flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-white flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">
              A new version is available!
            </p>
          </div>
          <button
            onClick={updateApp}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Update
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
