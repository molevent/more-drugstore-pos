import { getFlowAccountConfig } from './config';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/**
 * Get access token using OAuth2 Client Credentials flow
 * https://developers.flowaccount.com/api-reference#authentication
 */
export const getAccessToken = async (): Promise<string> => {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }

  const config = getFlowAccountConfig();

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
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
    }

    const data: TokenResponse = await response.json();

    // Cache the token
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    return data.access_token;
  } catch (error) {
    console.error('Failed to get FlowAccount access token:', error);
    throw error;
  }
};

/**
 * Clear cached token (useful for testing or when switching environments)
 */
export const clearToken = (): void => {
  cachedToken = null;
};

/**
 * Test authentication connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await getAccessToken();
    return true;
  } catch (error) {
    console.error('FlowAccount connection test failed:', error);
    return false;
  }
};
