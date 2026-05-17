-- Run this in your Supabase SQL editor
-- Dashboard → SQL Editor → New query → paste and run

CREATE TABLE IF NOT EXISTS strike_names (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  owner           TEXT NOT NULL,
  expires         BIGINT NOT NULL,
  chain_id        INTEGER NOT NULL DEFAULT 5042002,
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one name per chain
CREATE UNIQUE INDEX IF NOT EXISTS idx_strike_names_name_chain
  ON strike_names (name, chain_id);

-- Index for fast owner lookups (ManageTab query)
CREATE INDEX IF NOT EXISTS idx_strike_names_owner
  ON strike_names (LOWER(owner), chain_id);

-- Index for reverse lookup (lookupAddress in SDK)
CREATE INDEX IF NOT EXISTS idx_strike_names_owner_expires
  ON strike_names (LOWER(owner), expires DESC);

-- Indexer state: tracks last processed block per chain
CREATE TABLE IF NOT EXISTS indexer_state (
  chain_id      INTEGER PRIMARY KEY,
  last_block    BIGINT NOT NULL DEFAULT 42675353,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial Arc Testnet state starting from registrar deployment block
INSERT INTO indexer_state (chain_id, last_block)
VALUES (5042002, 42675353)
ON CONFLICT (chain_id) DO NOTHING;
