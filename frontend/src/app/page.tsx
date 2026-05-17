'use client'

import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import SearchTab from '@/components/search/SearchTab'
import ManageTab from '@/components/manage/ManageTab'
import ProfileTab from '@/components/profile/ProfileTab'

type Tab = 'search' | 'manage' | 'profile'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('search')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'search',  label: 'Search',   icon: '⌕' },
    { id: 'manage',  label: 'My names', icon: '◈' },
    { id: 'profile', label: 'Profile',  icon: '◉' },
  ]

  return (
    <div className="relative min-h-screen">
      {/* Background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Topbar />

        {/* Tab bar */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: 'var(--border-color)', background: 'rgba(10,8,18,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="max-w-4xl mx-auto px-6 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab.id ? '2px solid #5540E8' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
          {activeTab === 'search'  && <SearchTab />}
          {activeTab === 'manage'  && <ManageTab />}
          {activeTab === 'profile' && <ProfileTab />}
        </main>

        {/* Footer */}
        <footer className="text-center py-6" style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          StrikeNames · Built on ENS · Powered by Base
        </footer>
      </div>
    </div>
  )
}
