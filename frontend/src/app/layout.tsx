'use client'

import './globals.css'
import { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'

import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export const metadata: Metadata = {
  // ── Add this ──
  other: {
    'talentapp:project_verification':
      '1e52dc112b874d2040736a6266e35ecacb2ea3744c671ced5b640490948ac82063f28f41fae3fba8f883631f3a61a9c6eaa68370e03c1ab65897eb36f1538848',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>StrikeNames</title>
        <meta name="description" content="Register your .strike.eth identity" />
      </head>
      <body>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#5540E8',
                accentColorForeground: 'white',
                borderRadius: 'large',
                fontStack: 'system',
              })}
            >
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
