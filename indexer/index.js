/**
 * StrikeNames Indexer
 * Watches Arc Testnet for NameRegistered events and stores them in Supabase.
 * Runs continuously — deploy on Railway.
 */

import { createPublicClient, http, parseAbiItem } from 'viem'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────────

const ARC_RPC          = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network'
const REGISTRAR        = '0x94E74282880cdd723274Ff074a5FF8238Ff7D1DD'
const CHAIN_ID         = 5042002
const DEPLOY_BLOCK     = BigInt(42675353)
const BLOCK_CHUNK      = BigInt(9000)   // Arc limit is 10,000 — stay safely under
const POLL_INTERVAL_MS = 15_000         // poll every 15 seconds

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY      // use service key (not anon) for writes
)

const client = createPublicClient({
  transport: http(ARC_RPC),
})

const NAME_REGISTERED_EVENT = parseAbiItem(
  'event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 expires)'
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg, level = 'INFO') {
  const icons = { INFO: 'ℹ️ ', OK: '✅', WARN: '⚠️ ', ERR: '❌' }
  console.log(`[${new Date().toISOString()}] ${icons[level] || '  '} ${msg}`)
}

async function getLastBlock() {
  const { data, error } = await supabase
    .from('indexer_state')
    .select('last_block')
    .eq('chain_id', CHAIN_ID)
    .single()

  if (error) {
    log(`Could not read indexer_state: ${error.message} — using deploy block`, 'WARN')
    return DEPLOY_BLOCK
  }
  return BigInt(data.last_block)
}

async function saveLastBlock(blockNumber) {
  await supabase
    .from('indexer_state')
    .upsert({ chain_id: CHAIN_ID, last_block: blockNumber.toString(), updated_at: new Date().toISOString() })
}

async function upsertName({ name, owner, expires, blockNumber, txHash }) {
  const { error } = await supabase
    .from('strike_names')
    .upsert({
      name,
      owner:        owner.toLowerCase(),
      expires:      expires.toString(),
      chain_id:     CHAIN_ID,
      block_number: blockNumber.toString(),
      tx_hash:      txHash,
      updated_at:   new Date().toISOString(),
    }, {
      onConflict: 'name,chain_id',
    })

  if (error) {
    log(`Failed to upsert name "${name}": ${error.message}`, 'ERR')
  } else {
    log(`Saved: ${name}.strike → ${owner}  (expires ${new Date(Number(expires) * 1000).toLocaleDateString()})`, 'OK')
  }
}

// ── Main indexing loop ────────────────────────────────────────────────────────

async function processChunk(fromBlock, toBlock) {
  log(`Scanning blocks ${fromBlock}–${toBlock}...`)

  const logs = await client.getLogs({
    address: REGISTRAR,
    event:   NAME_REGISTERED_EVENT,
    fromBlock,
    toBlock,
  })

  if (logs.length === 0) return

  log(`Found ${logs.length} event(s) in blocks ${fromBlock}–${toBlock}`, 'OK')

  for (const logEntry of logs) {
    const { name, owner, expires } = logEntry.args
    await upsertName({
      name,
      owner,
      expires,
      blockNumber: logEntry.blockNumber,
      txHash:      logEntry.transactionHash,
    })
  }
}

async function tick() {
  try {
    const latestBlock = await client.getBlockNumber()
    const fromBlock   = await getLastBlock()

    if (fromBlock >= latestBlock) {
      log(`Up to date at block ${latestBlock}`)
      return
    }

    // Process in chunks to respect Arc's 10,000 block limit
    let cursor = fromBlock
    while (cursor < latestBlock) {
      const toBlock = cursor + BLOCK_CHUNK < latestBlock
        ? cursor + BLOCK_CHUNK
        : latestBlock

      await processChunk(cursor + BigInt(1), toBlock)
      await saveLastBlock(toBlock)
      cursor = toBlock
    }

  } catch (err) {
    log(`Tick error: ${err.message}`, 'ERR')
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════╗
║     STRIKENAMES INDEXER  ◎               ║
║     Arc Testnet · Chain ${CHAIN_ID}      ║
║     Registrar: ${REGISTRAR.slice(0,10)}... ║
╚══════════════════════════════════════════╝
  `)

  log(`Starting indexer from block ${DEPLOY_BLOCK}`)
  log(`Supabase: ${process.env.SUPABASE_URL}`)
  log(`RPC: ${ARC_RPC}`)

  // Run immediately then poll
  await tick()
  setInterval(tick, POLL_INTERVAL_MS)
}

main().catch(err => {
  log(`Fatal: ${err.message}`, 'ERR')
  process.exit(1)
})
