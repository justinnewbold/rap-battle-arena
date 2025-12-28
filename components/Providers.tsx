'use client'

import { ReactNode } from 'react'
import { ToastProvider } from './Toast'
import { ErrorBoundary } from './ErrorBoundary'
import { OfflineIndicator, InstallPrompt, UpdatePrompt } from './pwa'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineIndicator />
        {children}
        <InstallPrompt />
        <UpdatePrompt />
      </ToastProvider>
    </ErrorBoundary>
  )
}
