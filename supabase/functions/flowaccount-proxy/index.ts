// Supabase Edge Function for FlowAccount API Proxy
// Test version with detailed logging

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Hardcoded credentials for testing
const CLIENT_ID = 'somsaang-sandbox-client';
const CLIENT_SECRET = 'c29tc2FhZ2ctc2FuZGJveC1jbGllbnQ=';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const results = {
    step1_auth: null as any,
    step2_token: null as any,
    step3_api_tests: [] as any[],
    error: null as string | null
  };

  try {
    // Step 1: Authenticate with FlowAccount
    console.log('STEP 1: Authenticating...');
    
    const authUrl = 'https://openapi.flowaccount.com/test/token';
    const authBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'flowaccount-api'
    });

    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: authBody.toString()
    });

    const authText = await authRes.text();
    results.step1_auth = {
      status: authRes.status,
      response_preview: authText.substring(0, 200)
    };
    console.log('Auth status:', authRes.status);

    if (!authRes.ok) {
      throw new Error(`Auth failed: ${authRes.status} - ${authText}`);
    }

    // Step 2: Parse token
    let token: string;
    try {
      const authData = JSON.parse(authText);
      token = authData.access_token;
      results.step2_token = {
        obtained: !!token,
        length: token?.length || 0,
        preview: token ? token.substring(0, 20) + '...' : null,
        expires_in: authData.expires_in
      };
      console.log('Token obtained:', !!token);
    } catch (e) {
      throw new Error(`Failed to parse auth response: ${authText}`);
    }

    if (!token) {
      throw new Error('No access_token in response');
    }

    // Step 3: Test API with different auth methods
    const testUrl = 'https://openapi.flowaccount.com/test/company/profile';
    
    // Test 1: Bearer token
    console.log('Testing Bearer token...');
    const r1 = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const b1 = await r1.text();
    results.step3_api_tests.push({
      method: 'Bearer',
      status: r1.status,
      body: b1.substring(0, 100)
    });
    console.log('Bearer status:', r1.status);

    // Test 2: Access token as query param
    console.log('Testing query param...');
    const r2 = await fetch(`${testUrl}?access_token=${token}`);
    const b2 = await r2.text();
    results.step3_api_tests.push({
      method: 'Query param',
      status: r2.status,
      body: b2.substring(0, 100)
    });
    console.log('Query param status:', r2.status);

    // Test 3: X-Access-Token header
    console.log('Testing X-Access-Token...');
    const r3 = await fetch(testUrl, {
      headers: {
        'X-Access-Token': token,
        'Accept': 'application/json'
      }
    });
    const b3 = await r3.text();
    results.step3_api_tests.push({
      method: 'X-Access-Token',
      status: r3.status,
      body: b3.substring(0, 100)
    });
    console.log('X-Access-Token status:', r3.status);

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    results.error = error.message;
    console.error('Error:', error);
    
    return new Response(JSON.stringify(results, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
