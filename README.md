# StrikeNames Frontend

Next.js 14 dApp for registering and managing `.strike.eth` names across Base, Ethereum, and Arbitrum.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework |
| RainbowKit + wagmi | Wallet connection |
| viem | Contract reads/writes |
| Tailwind CSS | Styling |
| Syne + DM Sans | Typography |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — get free at [cloud.walletconnect.com](https://cloud.walletconnect.com)
- `NEXT_PUBLIC_REGISTRAR_BASE` — your deployed StrikeRegistrar address on Base
- `NEXT_PUBLIC_REGISTRAR_MAINNET` — your deployed StrikeRegistrar on Ethereum
- `NEXT_PUBLIC_REGISTRAR_ARBITRUM` — your deployed StrikeRegistrar on Arbitrum

### 3. Run dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
  app/
    layout.tsx          # Root layout with Wagmi + RainbowKit providers
    page.tsx            # Main dashboard with tab routing
    globals.css         # Design system, tokens, animations
  components/
    layout/
      Topbar.tsx        # Header with wallet connect button
    search/
      SearchTab.tsx     # Name search, availability check, registration
    manage/
      ManageTab.tsx     # List owned names, renew, transfer
    profile/
      ProfileTab.tsx    # Edit on-chain text records
  lib/
    wagmi.ts            # Chain config, supported chains
    contracts.ts        # ABI, helpers, price estimation
```

---

## Features

- Search name availability across chains
- Register names with duration picker (1/2/5 years)
- Live price from contract or local estimate
- Renew expiring names
- Transfer names to another address
- Edit text records (Twitter, GitHub, website, avatar, bio)
- Dark theme with animated gradient accents
- Multi-chain support (Base, Ethereum, Arbitrum)

---

## Deploy to Production

```bash
# Build
npm run build

# Deploy to Vercel (recommended)
npx vercel --prod

# Or deploy to any static host
npm run build && npm run export
```

---

## What to Build Next

- ENS reverse record lookup (show primary name from wallet address)
- The Graph subgraph to index all registered names
- IPFS avatar upload via Pinata
- Name search with suggestions from indexer
- Mobile-responsive improvements
- Referral / affiliate system
