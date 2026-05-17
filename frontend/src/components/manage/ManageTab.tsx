'use client'

import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { REGISTRAR_ABI, DURATIONS, daysUntilExpiry, formatEth, estimatePrice } from '@/lib/contracts'
import { SUPPORTED_CHAINS } from '@/lib/wagmi'

// In production these would come from The Graph / on-chain reads
const MOCK_NAMES = [
  { name: 'alpha',  chain: 'Base',     expiry: BigInt(Math.floor(Date.now()/1000) + 400 * 86400), chainId: 8453 },
  { name: 'ghost',  chain: 'Ethereum', expiry: BigInt(Math.floor(Date.now()/1000) + 28  * 86400), chainId: 1    },
  { name: 'zap',    chain: 'Arbitrum', expiry: BigInt(Math.floor(Date.now()/1000) + 580 * 86400), chainId: 42161 },
]

export default function ManageTab() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [transferTarget, setTransferTarget] = useState<string | null>(null)
  const [transferAddr, setTransferAddr]     = useState('')
  const [loading, setLoading]               = useState<string | null>(null)
  const [msg, setMsg]                       = useState<{ text: string; ok: boolean } | null>(null)

  async function handleRenew(name: string, chainId: number) {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    if (!chain?.registrarAddress) return setMsg({ text: 'Contract not deployed yet', ok: false })

    setLoading(name + '-renew')
    try {
      const value = estimatePrice(name, DURATIONS[0].seconds)
      await writeContractAsync({
        address: chain.registrarAddress,
        abi: REGISTRAR_ABI,
        functionName: 'renew',
        args: [name, BigInt(DURATIONS[0].seconds)],
        value,
      })
      setMsg({ text: `Renewed ${name}.strike.eth for 1 year`, ok: true })
    } catch (e: any) {
      setMsg({ text: e.shortMessage || 'Transaction failed', ok: false })
    } finally {
      setLoading(null)
    }
  }

  async function handleTransfer(name: string, chainId: number) {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    if (!chain?.registrarAddress) return setMsg({ text: 'Contract not deployed yet', ok: false })
    if (!transferAddr.startsWith('0x') || transferAddr.length !== 42) {
      return setMsg({ text: 'Enter a valid address', ok: false })
    }
    setLoading(name + '-transfer')
    try {
      await writeContractAsync({
        address: chain.registrarAddress,
        abi: REGISTRAR_ABI,
        functionName: 'transfer',
        args: [name, transferAddr as `0x${string}`],
      })
      setMsg({ text: `Transferred ${name}.strike.eth`, ok: true })
      setTransferTarget(null)
      setTransferAddr('')
    } catch (e: any) {
      setMsg({ text: e.shortMessage || 'Transaction failed', ok: false })
    } finally {
      setLoading(null)
    }
  }

  const expiringSoon = MOCK_NAMES.filter(n => daysUntilExpiry(n.expiry) <= 60).length

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }} className="gradient-text mb-2">
          My names
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Manage your registered .strike.eth identities.
        </p>
      </div>

      {!address ? (
        <div className="card p-8 text-center">
          <p style={{ fontSize: 32, marginBottom: 12 }}>◉</p>
          <p style={{ color: 'var(--text-secondary)' }}>Connect your wallet to see your names</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Names owned',   val: MOCK_NAMES.length, color: '#9080FF' },
              { label: 'Expiring soon', val: expiringSoon,       color: '#FFD93D' },
              { label: 'Chains active', val: 3,                  color: '#2ED573' },
            ].map(stat => (
              <div key={stat.label} className="card p-4">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: stat.color }}>{stat.val}</div>
              </div>
            ))}
          </div>

          {/* Notification */}
          {msg && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: msg.ok ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)', color: msg.ok ? '#2ED573' : '#FF4757', border: `1px solid ${msg.ok ? 'rgba(46,213,115,0.2)' : 'rgba(255,71,87,0.2)'}` }}>
              {msg.ok ? '✓ ' : '⚠ '}{msg.text}
            </div>
          )}

          {/* Name list */}
          <div className="flex flex-col gap-3">
            {MOCK_NAMES.map(item => {
              const days = daysUntilExpiry(item.expiry)
              const expiringSoon = days <= 60
              const chain = SUPPORTED_CHAINS.find(c => c.name === item.chain)

              return (
                <div key={item.name} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: name info */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0"
                        style={{ background: 'rgba(85,64,232,0.15)', color: '#9080FF', fontFamily: 'var(--font-display)' }}
                      >
                        {item.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                          {item.name}.strike.eth
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ fontSize: 12, color: chain?.color || 'var(--text-secondary)' }}>
                            {chain?.icon} {item.chain}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                          <span className={`badge ${expiringSoon ? 'badge-expiring' : 'badge-available'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                            {expiringSoon ? `Expires in ${days}d` : `${days}d left`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRenew(item.name, item.chainId)}
                        disabled={loading === item.name + '-renew'}
                        className="px-4 py-2 rounded-xl text-xs transition-all"
                        style={{
                          fontFamily: 'var(--font-display)', fontWeight: 600,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card-hover)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {loading === item.name + '-renew' ? '...' : '↺ Renew'}
                      </button>
                      <button
                        onClick={() => setTransferTarget(transferTarget === item.name ? null : item.name)}
                        className="px-4 py-2 rounded-xl text-xs transition-all"
                        style={{
                          fontFamily: 'var(--font-display)', fontWeight: 600,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card-hover)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        → Transfer
                      </button>
                    </div>
                  </div>

                  {/* Transfer panel */}
                  {transferTarget === item.name && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Transfer to address</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="0x..."
                          value={transferAddr}
                          onChange={e => setTransferAddr(e.target.value)}
                          className="strike-input flex-1 px-4 py-2 text-sm"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        />
                        <button
                          onClick={() => handleTransfer(item.name, item.chainId)}
                          disabled={loading === item.name + '-transfer'}
                          className="btn-primary px-5 py-2 text-sm"
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                        >
                          {loading === item.name + '-transfer' ? '...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
