// Supabase Edge Function for FlowAccount API Proxy

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const SANDBOX_CLIENT_ID = Deno.env.get('FLOWACCOUNT_CLIENT_ID') || 'somsaang-sandbox-client';
const SANDBOX_CLIENT_SECRET = Deno.env.get('FLOWACCOUNT_CLIENT_SECRET') || 'c29tc2FhZ2ctc2FuZGJveC1jbGllbnQ=';
const PROD_CLIENT_ID = Deno.env.get('FLOWACCOUNT_PROD_CLIENT_ID') || '';
const PROD_CLIENT_SECRET = Deno.env.get('FLOWACCOUNT_PROD_CLIENT_SECRET') || '';

let cachedToken: { token: string; expiresAt: number; env: string } | null = null;

async function getAccessToken(isSandbox: boolean): Promise<string> {
  const envKey = isSandbox ? 'sandbox' : 'production';
  
  if (cachedToken && cachedToken.env === envKey && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    console.log('Using cached token');
    return cachedToken.token;
  }

  const clientId = isSandbox ? SANDBOX_CLIENT_ID : PROD_CLIENT_ID;
  const clientSecret = isSandbox ? SANDBOX_CLIENT_SECRET : PROD_CLIENT_SECRET;
  const authUrl = isSandbox
    ? 'https://openapi.flowaccount.com/test/token'
    : 'https://openapi.flowaccount.com/v1/token';

  console.log('Getting token from:', authUrl, 'client:', clientId.substring(0, 10) + '...');

  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'flowaccount-api'
    }).toString()
  });

  const text = await res.text();
  console.log('Auth status:', res.status);

  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} - ${text}`);
  }

  const data = JSON.parse(text);
  if (!data.access_token) {
    throw new Error('No access_token in auth response');
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    env: envKey
  };

  console.log('Token obtained, expires in:', data.expires_in, 'seconds');
  return data.access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/flowaccount-proxy/', '').replace(/^\/+/, '');
    const isSandbox = url.searchParams.get('env') !== 'production';
    const baseUrl = isSandbox
      ? 'https://openapi.flowaccount.com/test'
      : 'https://openapi.flowaccount.com/v1';

    // Remove env param from search before forwarding
    const forwardParams = new URLSearchParams(url.search);
    forwardParams.delete('env');
    const queryString = forwardParams.toString() ? `?${forwardParams.toString()}` : '';

    const targetUrl = `${baseUrl}/${path}${queryString}`;
    console.log('Proxy:', req.method, targetUrl);

    // Get access token
    const token = await getAccessToken(isSandbox);

    // Read request body for non-GET/HEAD
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.text();
        console.log('Body:', body.substring(0, 200));
      } catch {
        // no body
      }
    }

    // Forward request to FlowAccount
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const apiRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body || undefined
    });

    const responseText = await apiRes.text();
    console.log('Response:', apiRes.status, responseText.substring(0, 200));

    return new Response(responseText, {
      status: apiRes.status,
      headers: {
        ...corsHeaders,
        'Content-Type': apiRes.headers.get('Content-Type') || 'application/json'
      }
    });

  } catch (error: any) {
    console.error('Proxy error:', error);

    return new Response(
      JSON.stringify({ error: 'Proxy error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
