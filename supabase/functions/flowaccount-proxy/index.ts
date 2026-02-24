// Supabase Edge Function for FlowAccount API Proxy
// This function acts as a proxy to handle CORS issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface FlowAccountConfig {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  grantType: string;
}

// Sandbox configuration
const SANDBOX_CONFIG: FlowAccountConfig = {
  baseUrl: 'https://openapi.flowaccount.com/test',
  authUrl: 'https://openapi.flowaccount.com/test/token',
  clientId: Deno.env.get('FLOWACCOUNT_CLIENT_ID') || 'somsaang-sandbox-client',
  clientSecret: Deno.env.get('FLOWACCOUNT_CLIENT_SECRET') || 'c29tc2FhZ2ctc2FuZGJveC1jbGllbnQ=',
  scope: 'flowaccount-api',
  grantType: 'client_credentials'
}

// Production configuration
const PROD_CONFIG: FlowAccountConfig = {
  baseUrl: 'https://openapi.flowaccount.com/v1',
  authUrl: 'https://openapi.flowaccount.com/v1/token',
  clientId: Deno.env.get('FLOWACCOUNT_PROD_CLIENT_ID') || '',
  clientSecret: Deno.env.get('FLOWACCOUNT_PROD_CLIENT_SECRET') || '',
  scope: 'flowaccount-api',
  grantType: 'client_credentials'
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null

async function getAccessToken(isSandbox: boolean = true): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.accessToken
  }

  const config = isSandbox ? SANDBOX_CONFIG : PROD_CONFIG

  try {
    const response = await fetch(config.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: config.grantType,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: config.scope
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Authentication failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Cache the token
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    }

    return data.access_token
  } catch (error) {
    console.error('Failed to get FlowAccount access token:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/flowaccount-proxy/', '')
    
    // Get environment from query param or default to sandbox
    const isSandbox = url.searchParams.get('env') !== 'production'
    const config = isSandbox ? SANDBOX_CONFIG : PROD_CONFIG
    
    // Get access token
    const accessToken = await getAccessToken(isSandbox)
    
    // Construct target URL
    const targetUrl = `${config.baseUrl}/${path}${url.search}`
    
    // Forward the request
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body || undefined
    })

    const responseData = await response.text()
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('FlowAccount proxy error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Proxy request failed', 
        message: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
