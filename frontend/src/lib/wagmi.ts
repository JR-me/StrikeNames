import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, arbitrum, baseSepolia } from 'wagmi/chains'
import { defineChain } from 'viem'

// LiteForge — LitVM's EVM testnet for Litecoin L2
export const liteForge = defineChain({
  id: 4441,
  name: 'LiteForge Testnet',
  nativeCurrency: {
    name: 'zkLTC',
    symbol: 'zkLTC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.liteforge.litvm.com'] },
    public:  { http: ['https://rpc.liteforge.litvm.com'] },
  },
  blockExplorers: {
    default: { name: 'LiteForge Explorer', url: 'https://explorer.liteforge.litvm.com' },
  },
  testnet: true,
})

// Arc Testnet — Circle's L1 blockchain
// Chain ID: 5042002 (confirmed from official Arc docs at docs.arc.io)
// Gas token: USDC (18 decimals for native, 6 for ERC-20 interface)
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public:  { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
})

export const wagmiConfig = getDefaultConfig({
  appName: 'StrikeNames',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [base, mainnet, arbitrum, baseSepolia, liteForge, arcTestnet],
  ssr: true,
})

export const SUPPORTED_CHAINS = [
  {
    id: base.id,
    name: 'Base',
    color: '#2ED573',
    icon: '🔵',
    isTestnet: false,
    gasToken: 'ETH',
    registrarAddress: process.env.NEXT_PUBLIC_REGISTRAR_BASE as `0x${string}`,
  },
  {
    id: mainnet.id,
    name: 'Ethereum',
    color: '#9080FF',
    icon: '⟠',
    isTestnet: false,
    gasToken: 'ETH',
    registrarAddress: process.env.NEXT_PUBLIC_REGISTRAR_MAINNET as `0x${string}`,
  },
  {
    id: arbitrum.id,
    name: 'Arbitrum',
    color: '#378ADD',
    icon: '🔷',
    isTestnet: false,
    gasToken: 'ETH',
    registrarAddress: process.env.NEXT_PUBLIC_REGISTRAR_ARBITRUM as `0x${string}`,
  },
  {
    id: liteForge.id,
    name: 'LiteForge',
    color: '#A8C7FA',
    icon: '◈',
    isTestnet: true,
    gasToken: 'zkLTC',
    description: 'LitVM · Litecoin L2 · Arbitrum Orbit',
    faucet: 'https://faucet.liteforge.litvm.com',
    registrarAddress: process.env.NEXT_PUBLIC_REGISTRAR_LITEFORGE as `0x${string}`,
  },
  {
    id: arcTestnet.id,
    name: 'Arc',
    color: '#FFD93D',
    icon: '◎',
    isTestnet: true,
    gasToken: 'USDC',
    description: 'Circle · L1 · USDC gas',
    faucet: 'https://faucet.circle.com',
    registrarAddress: process.env.NEXT_PUBLIC_REGISTRAR_ARC as `0x${string}`,
  },
]

export const MAINNET_CHAINS = SUPPORTED_CHAINS.filter(c => !c.isTestnet)
export const TESTNET_CHAINS = SUPPORTED_CHAINS.filter(c => c.isTestnet)
