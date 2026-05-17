'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useSwitchChain } from 'wagmi'
import { REGISTRAR_ABI, DURATIONS, validateName, estimatePrice, formatAmount } from '@/lib/contracts'
import { SUPPORTED_CHAINS, MAINNET_CHAINS, TESTNET_CHAINS } from '@/lib/wagmi'

export default function SearchTab() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { switchChain } = useSwitchChain()

  const [query, setQuery]                 = useState('')
  const [searched, setSearched]           = useState('')
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0])
  const [durIdx, setDurIdx]               = useState(0)
  const [registering, setRegistering]     = useState(false)
  const [txHash, setTxHash]               = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)

  const validationError = searched ? validateName(searched) : null

  const { data: isAvailable, isLoading: checkingAvail } = useReadContract({
    address: selectedChain.registrarAddress,
    abi: REGISTRAR_ABI,
    functionName: 'available',
    args: [searched],
    query: { enabled: !!searched && !validationError },
  })

  const { data: costWei } = useReadContract({
    address: selectedChain.registrarAddress,
    abi: REGISTRAR_ABI,
    functionName: 'registrationCost',
    args: [searched, BigInt(DURATIONS[durIdx].seconds)],
    query: { enabled: !!searched && !validationError && isAvailable === true },
  })

  // Use the chain's gas token so Arc shows "USDC" not "ETH"
  const displayCost = costWei
    ? formatAmount(costWei, selectedChain.gasToken)
    : searched && !validationError
    ? formatAmount(estimatePrice(searched, DURATIONS[durIdx].seconds), selectedChain.gasToken)
    : null

  function handleSearch() {
    const clean = query.trim().toLowerCase()
    setSearched(clean)
    setTxHash(null)
    setError(null)
  }

  async function handleRegister() {
    if (!address) return setError('Connect your wallet first')
    if (!selectedChain.registrarAddress) return setError('Contract not deployed on this chain yet')

    if (chainId !== selectedChain.id) {
      switchChain({ chainId: selectedChain.id })
      return
    }

    setRegistering(true)
    setError(null)
    try {
      const value = costWei ?? estimatePrice(searched, DURATIONS[durIdx].seconds)
      const hash = await writeContractAsync({
        address: selectedChain.registrarAddress,
        abi: REGISTRAR_ABI,
        functionName: 'register',
        args: [searched, address, BigInt(DURATIONS[durIdx].seconds)],
        value,
      })
      setTxHash(hash)
    } catch (e: any) {
      setError(e.shortMessage || e.message || 'Transaction failed')
    } finally {
      setRegistering(false)
    }
  }

  const suggestions = ['alpha', 'ghost', 'storm', 'neon', 'pixel', 'cypher']

  return (
    <div>
      {/* Hero heading */}
      <div className="mb-8">
        <h1
          className="gradient-text mb-2"
          style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, lineHeight: 1.1 }}
        >
          Claim your name
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Register a .strike.eth identity across Base, Ethereum, and Arbitrum.
        </p>
      </div>

      {/* Chain selector — grouped */}
      <div className="mb-5">
        {/* Mainnets */}
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mainnet</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>
        <div className="flex gap-2 flex-wrap mb-3">
          {MAINNET_CHAINS.map(chain => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 600,
                border: selectedChain.id === chain.id ? `1px solid ${chain.color}40` : '1px solid var(--border-color)',
                background: selectedChain.id === chain.id ? `${chain.color}15` : 'var(--bg-card)',
                color: selectedChain.id === chain.id ? chain.color : 'var(--text-secondary)',
              }}
            >
              <span>{chain.icon}</span>
              {chain.name}
            </button>
          ))}
        </div>

        {/* Testnets */}
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Testnet</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TESTNET_CHAINS.map(chain => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain)}
              className="flex flex-col items-start px-4 py-2 rounded-xl text-sm transition-all"
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 600,
                border: selectedChain.id === chain.id ? `1px solid ${chain.color}50` : '1px solid var(--border-color)',
                background: selectedChain.id === chain.id ? `${chain.color}12` : 'var(--bg-card)',
                color: selectedChain.id === chain.id ? chain.color : 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                <span>{chain.icon}</span>
                {chain.name}
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-muted)', fontWeight: 500 }}>
                  testnet
                </span>
              </div>
              {'description' in chain && chain.description && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
                  {chain.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Testnet notice */}
      {'isTestnet' in selectedChain && selectedChain.isTestnet && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(255,211,61,0.07)', border: '1px solid rgba(255,211,61,0.2)' }}>
          <span style={{ fontSize: 16 }}>⚗</span>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: '#FFD93D', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{selectedChain.name} is a testnet</span>
            <span style={{ color: 'var(--text-secondary)' }}> — gas paid in </span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedChain.gasToken}</span>
            <span style={{ color: 'var(--text-secondary)' }}>. Get free tokens from the </span>
            {'faucet' in selectedChain && (
              <a href={selectedChain.faucet} target="_blank" rel="noopener noreferrer" style={{ color: '#FFD93D', textDecoration: 'underline' }}>faucet</a>
            )}
            <span style={{ color: 'var(--text-secondary)' }}>. No real funds needed.</span>
          </div>
        </div>
      )}

      {/* Search box */}
      <div className="gradient-border mb-6">
        <div className="card p-5">
          <div className="flex gap-3 mb-1">
            <div className="flex-1 flex items-center gap-3 strike-input px-4 h-14">
              <input
                type="text"
                placeholder="yourname"
                value={query}
                onChange={e => setQuery(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-transparent outline-none text-lg"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}
              />
              <span
                className="text-sm font-medium px-2 py-1 rounded-lg"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: '#9080FF',
                  background: 'rgba(144,128,255,0.12)',
                  whiteSpace: 'nowrap',
                }}
              >
                .strike.eth
              </span>
            </div>
            <button
              onClick={handleSearch}
              disabled={!query}
              className="btn-primary px-6 h-14 text-sm"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, minWidth: 96 }}
            >
              Check
            </button>
          </div>

          {/* Results */}
          {searched && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              {validationError ? (
                <p style={{ color: '#FF4757', fontSize: 13 }}>⚠ {validationError}</p>
              ) : checkingAvail ? (
                <div className="flex items-center gap-3">
                  <div className="shimmer h-5 w-48 rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
                        {searched}.strike.eth
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                        on {selectedChain.name}
                      </span>
                    </div>
                    <span className={`badge ${isAvailable ? 'badge-available' : 'badge-taken'}`}>
                      {isAvailable ? 'Available' : 'Taken'}
                    </span>
                  </div>

                  {isAvailable && (
                    <>
                      {/* Duration picker */}
                      <div className="flex gap-2 mb-4">
                        {DURATIONS.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => setDurIdx(i)}
                            className="px-4 py-2 rounded-xl text-sm transition-all"
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 600,
                              border: durIdx === i ? '1px solid rgba(85,64,232,0.5)' : '1px solid var(--border-color)',
                              background: durIdx === i ? 'rgba(85,64,232,0.12)' : 'rgba(255,255,255,0.03)',
                              color: durIdx === i ? '#9080FF' : 'var(--text-secondary)',
                            }}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Total cost</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#9080FF' }}>
                            {displayCost}
                          </div>
                        </div>
                        <button
                          onClick={handleRegister}
                          disabled={registering || !address}
                          className="btn-primary px-7 py-3 text-sm"
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                        >
                          {registering ? 'Confirming...' : !address ? 'Connect wallet' : `Register on ${selectedChain.name}`}
                        </button>
                      </div>

                      {error && <p className="mt-3 text-sm" style={{ color: '#FF4757' }}>⚠ {error}</p>}
                      {txHash && (
                        <p className="mt-3 text-sm" style={{ color: '#2ED573' }}>
                          ✓ Registered! Tx: {txHash.slice(0, 20)}...
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Try these
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => { setQuery(s); setSearched(s) }}
              className="px-4 py-2 rounded-xl text-sm transition-all"
              style={{
                fontFamily: 'var(--font-mono)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
              }}
            >
              {s}.strike.eth
            </button>
          ))}
        </div>
      </div>

      {/* Pricing table */}
      <div className="card mt-8 p-5">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Pricing
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '3 chars', price: '0.0167', sub: '~$50/yr' },
            { label: '4 chars', price: '0.0067', sub: '~$20/yr' },
            { label: '5+ chars', price: '0.0017', sub: '~$5/yr' },
          ].map(row => (
            <div key={row.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
                {row.price} {selectedChain.gasToken}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
