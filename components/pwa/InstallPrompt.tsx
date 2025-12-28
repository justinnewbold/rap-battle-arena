'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Zap, Bell } from 'lucide-react'
import { usePWA } from '@/lib/hooks/usePWA'

export function InstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true)
        return
      }
    }

    // Show prompt after 30 seconds on page
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  const handleInstall = async () => {
    const success = await installApp()
    if (success) {
      setIsVisible(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (isDismissed || !isInstallable || isInstalled) {
    return null
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/30 rounded-2xl p-5 shadow-2xl shadow-purple-900/20">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">
                  Install Rap Battle Arena
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Get the full experience with our app
                </p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex flex-col items-center text-center">
                    <Smartphone className="w-5 h-5 text-purple-400 mb-1" />
                    <span className="text-xs text-gray-400">Faster</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <Zap className="w-5 h-5 text-yellow-400 mb-1" />
                    <span className="text-xs text-gray-400">Offline</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <Bell className="w-5 h-5 text-pink-400 mb-1" />
                    <span className="text-xs text-gray-400">Alerts</span>
                  </div>
                </div>

                <button
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
