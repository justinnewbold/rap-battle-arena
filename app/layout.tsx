import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rap Battle Arena | AI-Judged Live Rap Battles',
  description: 'Battle rappers worldwide with AI-powered judging. Record your verses, get scored on flow, rhymes, and punchlines.',
  keywords: ['rap battle', 'hip hop', 'freestyle', 'AI judge', 'music battle', 'rap game'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rap Battle',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#050507',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
