'use client'

import { ReactNode } from 'react'
import { ToastProvider } from './Toast'
import { ErrorBoundary } from './ErrorBoundary'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}
