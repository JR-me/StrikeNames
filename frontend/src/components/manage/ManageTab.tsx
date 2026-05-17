'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { REGISTRAR_ABI, DURATIONS, daysUntilExpiry, formatAmount, estimatePrice } from '@/lib/contracts'
import { SUPPORTED_CHAINS } from '@/lib/wagmi'

// NameRegistered event ABI — used to scan for names owned by the wallet
const NAME_REGISTERED_EVENT = {
  name: 'NameRegistered',
  type: 'event',
  inputs: [
    { name: 'name',    type: 'string',  indexed: false },
    { name: 'label',   type: 'bytes32', indexed: true  },
    { name: 'owner',   type: 'address', indexed: true  },
    { name: 'expires', type: 'uint256', indexed: false },
  ],
} as const

type OwnedName = {
  name:    string
  expiry:  bigint
  chainId: number
  chain:   string
}

export default function ManageTab() {
  const { address }          = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient         = usePublicClient({ chainId: 5042002 })

  const [names, setNames]             = useState<OwnedName[]>([])
  const [loading, setLoading]         = useState(false)
  const [transferTarget, setTransferTarget] = useState<string | null>(null)
  const [transferAddr, setTransferAddr]     = useState('')
  const [actionLoading, setActionLoading]   = useState<string | null>(null)
  const [msg, setMsg]                 = useState<{ text: string; ok: boolean } | null>(null)

  // Fetch all names registered by the connected wallet across all supported chains
  useEffect(() => {
    if (!address || !publicClient) return
    const client = publicClient!

    async function fetchNames() {
      setLoading(true)
      setNames([])

      const allNames: OwnedName[] = []

      for (const chain of SUPPORTED_CHAINS) {
        if (!chain.registrarAddress || chain.registrarAddress === '-' as any) continue

        try {
          // Get all NameRegistered events for this wallet on this chain
          const logs = await client.getLogs({
            address: chain.registrarAddress,
            event: NAME_REGISTERED_EVENT,
            args: { owner: address },
            fromBlock: BigInt(0),
            toBlock: 'latest',
          })

          // For each registration, get the current expiry from the contract
          for (const log of logs) {
            const name = (log as any).args?.name
            if (!name) continue

            try {
              const expiry = await client.readContract({
                address: chain.registrarAddress,
                abi: REGISTRAR_ABI,
                functionName: 'nameExpiry',
                args: [name],
              }) as bigint

              // Only include if not expired
              const now = BigInt(Math.floor(Date.now() / 1000))
              if (expiry > now) {
                // Check it's still owned by this wallet (hasn't been transferred)
                const available = await client.readContract({
                  address: chain.registrarAddress,
                  abi: REGISTRAR_ABI,
                  functionName: 'available',
                  args: [name],
                }) as boolean

                if (!available) {
                  allNames.push({
                    name,
                    expiry,
                    chainId: chain.id,
                    chain:   chain.name,
                  })
                }
              }
            } catch {
              // Skip names that error on read
            }
          }
        } catch {
          // Chain may not be reachable — skip
        }
      }

      // Deduplicate by name+chainId and sort by expiry ascending
      const seen = new Set<string>()
      const deduped = allNames.filter(n => {
        const key = `${n.name}-${n.chainId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      deduped.sort((a, b) => Number(a.expiry - b.expiry))
      setNames(deduped)
      setLoading(false)
    }

    fetchNames()
  }, [address, publicClient])

  async function handleRenew(name: string, chainId: number) {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    if (!chain?.registrarAddress) return setMsg({ text: 'Contract not deployed yet', ok: false })

    setActionLoading(name + '-renew')
    try {
      const value = estimatePrice(name, DURATIONS[0].seconds)
      await writeContractAsync({
        address: chain.registrarAddress,
        abi: REGISTRAR_ABI,
        functionName: 'renew',
        args: [name, BigInt(DURATIONS[0].seconds)],
        value,
      })
      setMsg({ text: `Renewed ${name}.strike for 1 year`, ok: true })
    } catch (e: any) {
      setMsg({ text: e.shortMessage || 'Transaction failed', ok: false })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleTransfer(name: string, chainId: number) {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    if (!chain?.registrarAddress) return setMsg({ text: 'Contract not deployed yet', ok: false })
    if (!transferAddr.startsWith('0x') || transferAddr.length !== 42) {
      return setMsg({ text: 'Enter a valid address', ok: false })
    }
    setActionLoading(name + '-transfer')
    try {
      await writeContractAsync({
        address: chain.registrarAddress,
        abi: REGISTRAR_ABI,
        functionName: 'transfer',
        args: [name, transferAddr as `0x${string}`],
      })
      setMsg({ text: `Transferred ${name}.strike`, ok: true })
      setTransferTarget(null)
      setTransferAddr('')
      // Remove from local list
      setNames(prev => prev.filter(n => !(n.name === name && n.chainId === chainId)))
    } catch (e: any) {
      setMsg({ text: e.shortMessage || 'Transaction failed', ok: false })
    } finally {
      setActionLoading(null)
    }
  }

  const expiringSoonCount = names.filter(n => daysUntilExpiry(n.expiry) <= 60).length

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }}
            className="gradient-text mb-2">
          My names
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Manage your registered .strike identities.
        </p>
      </div>

      {!address ? (
        <div className="card p-8 text-center">
          <p style={{ fontSize: 32, marginBottom: 12 }}>◉</p>
          <p style={{ color: 'var(--text-secondary)' }}>Connect your wallet to see your names</p>
        </div>
      ) : loading ? (
        <>
          {/* Loading state */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1,2,3].map(i => (
              <div key={i} className="card p-4">
                <div className="shimmer h-3 w-24 rounded mb-3" />
                <div className="shimmer h-7 w-12 rounded" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {[1,2].map(i => (
              <div key={i} className="card p-5">
                <div className="shimmer h-12 w-full rounded" />
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            Scanning Arc Testnet for your names...
          </p>
        </>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Names owned',   val: names.length,      color: '#9080FF' },
              { label: 'Expiring soon', val: expiringSoonCount,  color: '#FFD93D' },
              { label: 'Chains active', val: new Set(names.map(n => n.chainId)).size, color: '#2ED573' },
            ].map(stat => (
              <div key={stat.label} className="card p-4">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6,
                  fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                  letterSpacing: '0.08em' }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: 28, color: stat.color }}>
                  {stat.val}
                </div>
              </div>
            ))}
          </div>

          {/* Notification */}
          {msg && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{
                background: msg.ok ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)',
                color:      msg.ok ? '#2ED573' : '#FF4757',
                border:     `1px solid ${msg.ok ? 'rgba(46,213,115,0.2)' : 'rgba(255,71,87,0.2)'}`,
              }}>
              {msg.ok ? '✓ ' : '⚠ '}{msg.text}
            </div>
          )}

          {/* Empty state */}
          {names.length === 0 && (
            <div className="card p-8 text-center">
              <p style={{ fontSize: 32, marginBottom: 12 }}>◈</p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
                No names registered yet
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Go to the Search tab to register your first .strike name on Arc Testnet
              </p>
            </div>
          )}

          {/* Name list */}
          <div className="flex flex-col gap-3">
            {names.map(item => {
              const days        = daysUntilExpiry(item.expiry)
              const expiring    = days <= 60
              const chainInfo   = SUPPORTED_CHAINS.find(c => c.id === item.chainId)

              return (
                <div key={`${item.name}-${item.chainId}`} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center
                                   font-bold text-xl flex-shrink-0"
                        style={{ background: 'rgba(85,64,232,0.15)', color: '#9080FF',
                          fontFamily: 'var(--font-display)' }}
                      >
                        {item.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)',
                          fontWeight: 700, fontSize: 16 }}>
                          {item.name}.strike
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ fontSize: 12,
                            color: chainInfo?.color || 'var(--text-secondary)' }}>
                            {chainInfo?.icon} {item.chain}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                          <span className={`badge ${expiring ? 'badge-expiring' : 'badge-available'}`}
                            style={{ fontSize: 10, padding: '2px 8px' }}>
                            {expiring ? `Expires in ${days}d` : `${days}d left`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRenew(item.name, item.chainId)}
                        disabled={actionLoading === item.name + '-renew'}
                        className="px-4 py-2 rounded-xl text-xs transition-all"
                        style={{
                          fontFamily: 'var(--font-display)', fontWeight: 600,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card-hover)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {actionLoading === item.name + '-renew' ? '...' : '↺ Renew'}
                      </button>
                      <button
                        onClick={() => setTransferTarget(
                          transferTarget === item.name ? null : item.name
                        )}
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
                    <div className="mt-4 pt-4"
                      style={{ borderTop: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Transfer to address
                      </p>
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
                          disabled={actionLoading === item.name + '-transfer'}
                          className="btn-primary px-5 py-2 text-sm"
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                        >
                          {actionLoading === item.name + '-transfer' ? '...' : 'Confirm'}
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
