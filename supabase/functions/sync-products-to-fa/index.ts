// Supabase Edge Function: Daily product sync to FlowAccount
// Can be called manually or via pg_cron / external scheduler
// Endpoint: POST /functions/v1/sync-products-to-fa

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SANDBOX_CLIENT_ID = Deno.env.get('FLOWACCOUNT_CLIENT_ID') || 'somsaang-sandbox-client'
const SANDBOX_CLIENT_SECRET = Deno.env.get('FLOWACCOUNT_CLIENT_SECRET') || 'c29tc2FhZ2ctc2FuZGJveS1jbGllbnQ='
const PROD_CLIENT_ID = Deno.env.get('FLOWACCOUNT_PROD_CLIENT_ID') || ''
const PROD_CLIENT_SECRET = Deno.env.get('FLOWACCOUNT_PROD_CLIENT_SECRET') || ''

let cachedToken: { token: string; expiresAt: number; env: string } | null = null

async function getAccessToken(isSandbox: boolean): Promise<string> {
  const envKey = isSandbox ? 'sandbox' : 'production'
  if (cachedToken && cachedToken.env === envKey && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token
  }

  const clientId = isSandbox ? SANDBOX_CLIENT_ID : PROD_CLIENT_ID
  const clientSecret = isSandbox ? SANDBOX_CLIENT_SECRET : PROD_CLIENT_SECRET
  const authUrl = isSandbox
    ? 'https://openapi.flowaccount.com/test/token'
    : 'https://openapi.flowaccount.com/v1/token'

  const res = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'flowaccount-api'
    }).toString()
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Auth failed: ${res.status} - ${text}`)

  const data = JSON.parse(text)
  if (!data.access_token) throw new Error('No access_token in auth response')

  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in * 1000), env: envKey }
  return data.access_token
}

async function faRequest(token: string, baseUrl: string, path: string, method = 'GET', body?: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  }
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${baseUrl}/${path}`, { method, headers, body })
  const text = await res.text()
  if (!res.ok) throw new Error(`FA API ${res.status}: ${text.substring(0, 200)}`)
  return JSON.parse(text)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    let isSandbox = true
    try {
      const body = await req.json()
      if (body?.env === 'production') isSandbox = false
    } catch { /* default sandbox */ }

    const baseUrl = isSandbox
      ? 'https://openapi.flowaccount.com/test'
      : 'https://openapi.flowaccount.com/v1'

    console.log(`[SYNC] Starting product sync (${isSandbox ? 'sandbox' : 'production'})`)

    // 1. Get FA token
    const token = await getAccessToken(isSandbox)

    // 2. Fetch all products from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('id, sku, barcode, name_th, name_en, description_th, base_price, cost_price, selling_price_excl_vat, selling_price_incl_vat, unit, product_type, is_active')
      .eq('is_active', true)

    if (dbError) throw new Error(`DB error: ${dbError.message}`)
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: 'No active products to sync', created: 0, updated: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[SYNC] Found ${products.length} active products`)

    // 3. Fetch all existing FA products
    let existingProducts: any[] = []
    let page = 1
    while (true) {
      const result = await faRequest(token, baseUrl, `products?currentPage=${page}&pageSize=100&sortBy=&filter=`)
      const batch = result?.data?.list || []
      if (batch.length === 0) break
      existingProducts = existingProducts.concat(batch)
      if (batch.length < 100) break
      page++
    }
    console.log(`[SYNC] Found ${existingProducts.length} existing FA products`)

    // 4. Build lookup maps
    const byCode = new Map<string, any>()
    const byBarcode = new Map<string, any>()
    const byName = new Map<string, any>()
    for (const p of existingProducts) {
      if (p.code) byCode.set(p.code.toLowerCase(), p)
      if (p.barcode) byBarcode.set(p.barcode.toLowerCase(), p)
      if (p.name) byName.set(p.name.toLowerCase(), p)
    }

    // 5. Sync each product
    let created = 0, updated = 0, failed = 0
    const errors: string[] = []

    for (const product of products) {
      try {
        const faData = {
          type: 3, // 3 = inventory product (นับสต็อก)
          name: product.name_th || product.name_en || '-',
          sellDescription: product.description_th || product.name_en || '',
          buyDescription: '',
          unitName: product.unit || 'ชิ้น',
          code: product.sku || '',
          barcode: product.barcode || '',
          sellPrice: product.selling_price_excl_vat || product.base_price || 0,
          sellVatType: 3,
          buyPrice: product.cost_price || 0,
          buyVatType: 7,
        }

        // Match by code > barcode > name
        let existing: any = null
        if (product.sku) existing = byCode.get(product.sku.toLowerCase())
        if (!existing && product.barcode) existing = byBarcode.get(product.barcode.toLowerCase())
        if (!existing && product.name_th) existing = byName.get(product.name_th.toLowerCase())

        if (existing) {
          await faRequest(token, baseUrl, `products/${existing.id}`, 'PUT', JSON.stringify(faData))
          updated++
        } else {
          await faRequest(token, baseUrl, 'products', 'POST', JSON.stringify(faData))
          created++
        }
      } catch (err: any) {
        failed++
        errors.push(`${product.name_th || product.sku}: ${err.message.substring(0, 100)}`)
      }
    }

    const summary = {
      message: `Product sync completed`,
      total: products.length,
      created,
      updated,
      failed,
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString()
    }

    console.log(`[SYNC] Done:`, JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[SYNC] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Sync failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
