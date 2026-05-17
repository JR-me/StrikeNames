import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * GET /api/names?owner=0x...
 * Returns all non-expired .strike names owned by the given address.
 */
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('owner')

  if (!owner || !owner.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing or invalid owner address' }, { status: 400 })
  }

  const nowSeconds = Math.floor(Date.now() / 1000)

  const { data, error } = await supabase
    .from('strike_names')
    .select('name, owner, expires, chain_id, block_number, tx_hash, registered_at')
    .eq('owner', owner.toLowerCase())
    .gt('expires', nowSeconds)
    .order('expires', { ascending: true })

  if (error) {
    console.error('Supabase query error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ names: data })
}
