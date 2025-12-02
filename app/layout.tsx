import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rap Battle Arena | AI-Judged Live Rap Battles',
  description: 'Battle rappers worldwide with AI-powered judging. Record your verses, get scored on flow, rhymes, and punchlines.',
  keywords: ['rap battle', 'hip hop', 'freestyle', 'AI judge', 'music battle', 'rap game'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
