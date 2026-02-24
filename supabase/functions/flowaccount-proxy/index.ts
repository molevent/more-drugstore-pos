// Supabase Edge Function for FlowAccount API Proxy
// Detailed diagnostics version

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

  const report: any = {
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      url: req.url
    },
    phase1_auth: null,
    phase2_token: null,
    phase3_api_call: null,
    phase4_response: null,
    error: null
  };

  try {
    // Phase 1: Get access token from FlowAccount
    console.log('=== PHASE 1: AUTHENTICATION ===');
    
    const authUrl = 'https://openapi.flowaccount.com/test/token';
    console.log('Auth URL:', authUrl);
    console.log('Client ID:', CLIENT_ID);

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
    report.phase1_auth = {
      status: authRes.status,
      statusText: authRes.statusText,
      responseBody: authText.substring(0, 500),
      headers: Object.fromEntries(authRes.headers)
    };

    console.log('Auth response status:', authRes.status);
    console.log('Auth response body:', authText.substring(0, 200));

    if (!authRes.ok) {
      throw new Error(`FlowAccount auth failed with status ${authRes.status}: ${authText}`);
    }

    // Phase 2: Parse token
    console.log('=== PHASE 2: TOKEN EXTRACTION ===');
    
    let token: string | null = null;
    let authData: any;
    
    try {
      authData = JSON.parse(authText);
      token = authData.access_token;
      
      report.phase2_token = {
        parsedSuccessfully: true,
        tokenExists: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token ? token.substring(0, 20) + '...' : null,
        expiresIn: authData.expires_in,
        tokenType: authData.token_type,
        fullAuthResponse: authData
      };
      
      console.log('Token extracted successfully');
      console.log('Token length:', token?.length);
      console.log('Token prefix:', token?.substring(0, 20));
    } catch (e: any) {
      report.phase2_token = {
        parsedSuccessfully: false,
        parseError: e.message,
        rawResponse: authText
      };
      throw new Error(`Failed to parse auth response as JSON: ${e.message}. Raw: ${authText.substring(0, 200)}`);
    }

    if (!token) {
      throw new Error('No access_token field in auth response');
    }

    // Phase 3: Make API call
    console.log('=== PHASE 3: API CALL ===');
    
    const url = new URL(req.url);
    const path = url.pathname.replace('/flowaccount-proxy/', '') || 'company/profile';
    const apiUrl = `https://openapi.flowaccount.com/test/${path}${url.search}`;
    
    console.log('API URL:', apiUrl);
    console.log('Request method:', req.method);

    // Get request body if not GET/HEAD
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.text();
        console.log('Request body:', body.substring(0, 200));
      } catch (e) {
        console.log('No request body');
      }
    }

    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
    
    if (body) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    report.phase3_api_call = {
      url: apiUrl,
      method: req.method,
      headersSent: requestHeaders,
      bodyLength: body?.length || 0
    };

    console.log('Headers sent:', JSON.stringify(requestHeaders, null, 2));

    const apiRes = await fetch(apiUrl, {
      method: req.method,
      headers: requestHeaders,
      body: body || undefined
    });

    const apiText = await apiRes.text();
    
    report.phase4_response = {
      status: apiRes.status,
      statusText: apiRes.statusText,
      responseHeaders: Object.fromEntries(apiRes.headers),
      responseBody: apiText.substring(0, 500)
    };

    console.log('API response status:', apiRes.status);
    console.log('API response body:', apiText.substring(0, 200));

    // Try to parse as JSON for pretty output
    let responseData;
    try {
      responseData = JSON.parse(apiText);
    } catch {
      responseData = { rawText: apiText };
    }

    return new Response(JSON.stringify({
      success: apiRes.ok,
      diagnostics: report,
      data: responseData
    }, null, 2), {
      status: apiRes.ok ? 200 : apiRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('=== ERROR ===');
    console.error(error);
    
    report.error = {
      message: error.message,
      stack: error.stack
    };

    return new Response(JSON.stringify({
      success: false,
      error: 'Proxy error occurred',
      diagnostics: report
    }, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
