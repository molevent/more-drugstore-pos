// FlowAccount API Service
// https://developers.flowaccount.com/api-reference

export { 
  getAccessToken, 
  testConnection, 
  clearToken 
} from './auth';

export { 
  getFlowAccountConfig, 
  setFlowAccountConfig,
  isSandboxMode,
  FLOWACCOUNT_SANDBOX_CONFIG,
  FLOWACCOUNT_PROD_CONFIG,
  type FlowAccountConfig
} from './config';

export {
  getCompanyProfile,
  getContacts,
  getContactById,
  createContact,
  updateContact,
  searchContactByName,
  syncContactToFlowAccount,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  convertContactToFlowAccount,
  convertQuotationToInvoice,
  type FlowAccountContact,
  type FlowAccountInvoice,
  type FlowAccountInvoiceItem,
  type FlowAccountCompany
} from './api';
