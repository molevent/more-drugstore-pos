// Supabase Edge Function for LINE Messaging API Proxy
// Replaces deprecated LINE Notify with LINE Messaging API (broadcast/push)
//
// Supports two modes:
// 1. "broadcast" — send message to all followers of the LINE Official Account
// 2. "push" — send message to a specific userId
//
// Requires: LINE_CHANNEL_ACCESS_TOKEN env variable (set in Supabase dashboard)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message, channelAccessToken, mode, userId } = await req.json();

    // Use provided token or env variable
    const token = channelAccessToken || Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing LINE Channel Access Token. Set LINE_CHANNEL_ACCESS_TOKEN in Supabase secrets or pass channelAccessToken.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messages = [{ type: 'text', text: message }];

    let apiUrl: string;
    let body: any;

    if (mode === 'push' && userId) {
      // Push message to specific user
      apiUrl = 'https://api.line.me/v2/bot/message/push';
      body = { to: userId, messages };
    } else {
      // Broadcast to all followers
      apiUrl = 'https://api.line.me/v2/bot/message/broadcast';
      body = { messages };
    }

    console.log('LINE API:', mode || 'broadcast', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    // LINE Messaging API returns empty body on success (200)
    const responseText = await response.text();
    console.log('LINE response:', response.status, responseText || '(empty = success)');

    if (response.ok) {
      return new Response(
        JSON.stringify({ status: 200, message: 'OK' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorData = responseText ? JSON.parse(responseText) : { message: 'Unknown error' };
      return new Response(
        JSON.stringify({ status: response.status, message: errorData.message || responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('LINE Messaging API proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Proxy error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
