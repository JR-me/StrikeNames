import { parseEther } from 'viem'

export const REGISTRAR_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'renew',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'newOwner', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'setTextRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'nameExpiry',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'registrationCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'nameOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

// Duration options in seconds
export const DURATIONS = [
  { label: '1 year',  seconds: 365 * 24 * 60 * 60 },
  { label: '2 years', seconds: 2 * 365 * 24 * 60 * 60 },
  { label: '5 years', seconds: 5 * 365 * 24 * 60 * 60 },
]

// Fallback price calculation (matches contract logic)
export function estimatePrice(name: string, durationSeconds: number): bigint {
  const len = name.length
  let annualWei: bigint

  if (len <= 3) {
    annualWei = parseEther('0.0167')
  } else if (len === 4) {
    annualWei = parseEther('0.0067')
  } else {
    annualWei = parseEther('0.0017')
  }

  return (annualWei * BigInt(durationSeconds)) / BigInt(365 * 24 * 60 * 60)
}

// Validate name before sending to contract
export function validateName(name: string): string | null {
  if (name.length < 3) return 'Name must be at least 3 characters'
  if (name.length > 64) return 'Name must be 64 characters or less'
  if (name.startsWith('-')) return 'Name cannot start with a hyphen'
  if (name.endsWith('-')) return 'Name cannot end with a hyphen'
  if (!/^[a-z0-9-]+$/.test(name)) return 'Only lowercase letters, numbers, and hyphens allowed'
  return null
}

// Format an address for display
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Format a wei amount for display — uses the correct token symbol per chain
// Arc uses USDC as native gas token; all other supported chains use ETH
export function formatAmount(wei: bigint, gasToken: string = 'ETH'): string {
  const amount = Number(wei) / 1e18
  return amount.toFixed(4) + ' ' + gasToken
}

// Legacy alias — kept for backward compatibility with existing components
export function formatEth(wei: bigint): string {
  return formatAmount(wei, 'ETH')
}

// Days until expiry
export function daysUntilExpiry(expiry: bigint): number {
  const now = Math.floor(Date.now() / 1000)
  const diff = Number(expiry) - now
  return Math.max(0, Math.floor(diff / 86400))
}
