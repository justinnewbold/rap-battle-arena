'use client'

import { Suspense } from 'react'

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function BattleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  )
}
