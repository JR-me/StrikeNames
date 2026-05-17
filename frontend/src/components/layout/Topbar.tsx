'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Topbar() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 h-16"
      style={{
        background: 'rgba(10,8,18,0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, #5540E8, #9080FF)',
            fontFamily: 'var(--font-display)',
          }}
        >
          S
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
          Strike<span style={{ color: '#9080FF' }}>Names</span>
        </span>
      </div>

      {/* Wallet button */}
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus="avatar"
      />
    </header>
  )
}
