// FlowAccount API Configuration
// Sandbox environment for testing
// https://developers.flowaccount.com/api-reference

export interface FlowAccountConfig {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  grantType: string;
}

// Sandbox configuration (from email)
export const FLOWACCOUNT_SANDBOX_CONFIG: FlowAccountConfig = {
  baseUrl: 'https://openapi.flowaccount.com/test',
  authUrl: 'https://openapi.flowaccount.com/test/token',
  clientId: 'somsaang-sandbox-client',
  clientSecret: 'c29tc2Fhbmctc2FuZGJveC1jbGllbnQ=', // base64 encoded
  scope: 'flowaccount-api',
  grantType: 'client_credentials'
};

// Production configuration (to be configured by user)
export const FLOWACCOUNT_PROD_CONFIG: FlowAccountConfig = {
  baseUrl: 'https://openapi.flowaccount.com/v1',
  authUrl: 'https://openapi.flowaccount.com/v1/token',
  clientId: '',
  clientSecret: '',
  scope: 'flowaccount-api',
  grantType: 'client_credentials'
};

// Current active configuration
let currentConfig: FlowAccountConfig = FLOWACCOUNT_SANDBOX_CONFIG;

export const setFlowAccountConfig = (config: Partial<FlowAccountConfig>) => {
  currentConfig = { ...currentConfig, ...config };
};

export const getFlowAccountConfig = (): FlowAccountConfig => currentConfig;

export const isSandboxMode = (): boolean => {
  return currentConfig.baseUrl.includes('test');
};
