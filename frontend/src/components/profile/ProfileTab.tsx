'use client'

import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { REGISTRAR_ABI } from '@/lib/contracts'
import { SUPPORTED_CHAINS } from '@/lib/wagmi'
import { shortAddress } from '@/lib/contracts'

const TEXT_RECORD_KEYS = [
  { key: 'name',          label: 'Display name', placeholder: 'Your display name',     icon: '◉' },
  { key: 'description',   label: 'Bio',           placeholder: 'About you...',          icon: '✎' },
  { key: 'com.twitter',   label: 'Twitter / X',   placeholder: '@handle',               icon: '𝕏' },
  { key: 'com.github',    label: 'GitHub',         placeholder: 'username',              icon: '⌥' },
  { key: 'url',           label: 'Website',        placeholder: 'https://...',           icon: '◈' },
  { key: 'avatar',        label: 'Avatar URL',     placeholder: 'https://... or ipfs://',icon: '⊞' },
  { key: 'com.discord',   label: 'Discord',        placeholder: 'username#0000',         icon: '◎' },
]

export default function ProfileTab() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  // Primary name (in production: read from ENS reverse record)
  const primaryName = 'alpha'
  const chain = SUPPORTED_CHAINS[0]

  const [records, setRecords] = useState<Record<string, string>>({
    name: 'Alpha',
    description: 'Building on Base 🔵',
    'com.twitter': '@alphastrike',
    'com.github': 'alphastrike',
    url: 'alphastrike.xyz',
    avatar: '',
    'com.discord': '',
  })

  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved, setSaved]     = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  function toggleEdit(key: string) {
    setEditing(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function saveRecord(key: string) {
    if (!address) return setError('Connect your wallet first')
    if (!chain.registrarAddress) return setError('Contract not deployed yet')

    setSaving(key)
    setError(null)
    try {
      await writeContractAsync({
        address: chain.registrarAddress,
        abi: REGISTRAR_ABI,
        functionName: 'setTextRecord',
        args: [primaryName, key, records[key]],
      })
      setSaved(key)
      setEditing(prev => ({ ...prev, [key]: false }))
      setTimeout(() => setSaved(null), 3000)
    } catch (e: any) {
      setError(e.shortMessage || 'Transaction failed')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }} className="gradient-text mb-2">
          Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Your on-chain identity linked to {primaryName}.strike.eth
        </p>
      </div>

      {!address ? (
        <div className="card p-8 text-center">
          <p style={{ fontSize: 32, marginBottom: 12 }}>◎</p>
          <p style={{ color: 'var(--text-secondary)' }}>Connect your wallet to manage your profile</p>
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: '260px 1fr' }}>

          {/* Identity card */}
          <div className="card p-6 text-center h-fit">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg, rgba(85,64,232,0.3), rgba(255,107,107,0.3))', color: '#9080FF', fontFamily: 'var(--font-display)' }}
            >
              {records.name?.[0]?.toUpperCase() || primaryName[0].toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
              {records.name || primaryName}
            </div>
            <div style={{ color: '#9080FF', fontSize: 13, marginTop: 2 }}>
              {primaryName}.strike.eth
            </div>
            {records.description && (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                {records.description}
              </div>
            )}
            <div
              className="mt-4 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}
            >
              {address ? shortAddress(address) : '—'}
            </div>

            <hr className="divider my-4" />

            <div className="text-left space-y-2">
              {records['com.twitter'] && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>𝕏</span> {records['com.twitter']}
                </div>
              )}
              {records['url'] && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>◈</span> {records['url']}
                </div>
              )}
              {records['com.github'] && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>⌥</span> {records['com.github']}
                </div>
              )}
            </div>
          </div>

          {/* Records editor */}
          <div className="card p-5">
            <div style={{ fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Text records
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,71,87,0.1)', color: '#FF4757', border: '1px solid rgba(255,71,87,0.2)' }}>
                ⚠ {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {TEXT_RECORD_KEYS.map(({ key, label, placeholder, icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 py-3 px-1"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <span style={{ fontSize: 16, color: 'var(--text-muted)', width: 20, flexShrink: 0 }}>{icon}</span>
                  <div style={{ width: 100, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{label}</span>
                  </div>

                  {editing[key] ? (
                    <input
                      autoFocus
                      type="text"
                      value={records[key] || ''}
                      onChange={e => setRecords(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="strike-input flex-1 px-3 py-1.5 text-sm"
                    />
                  ) : (
                    <div className="flex-1 text-sm" style={{ color: records[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {records[key] || placeholder}
                    </div>
                  )}

                  <div className="flex gap-1 flex-shrink-0">
                    {editing[key] ? (
                      <>
                        <button
                          onClick={() => saveRecord(key)}
                          disabled={saving === key}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 600, background: '#5540E8', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                          {saving === key ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => toggleEdit(key)}
                          className="px-3 py-1.5 rounded-lg text-xs transition-all"
                          style={{ background: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleEdit(key)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          fontFamily: 'var(--font-display)',
                          background: saved === key ? 'rgba(46,213,115,0.1)' : 'var(--bg-card-hover)',
                          color: saved === key ? '#2ED573' : 'var(--text-muted)',
                          border: `1px solid ${saved === key ? 'rgba(46,213,115,0.2)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {saved === key ? '✓' : '✎ Edit'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
