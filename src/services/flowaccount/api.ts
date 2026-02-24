import { isSandboxMode } from './config';

// Common types for FlowAccount API
export interface FlowAccountContact {
  id?: number;
  contactName?: string;
  contactAddress?: string;
  contactZipCode?: string;
  contactTaxId?: string;
  contactBranchCode?: string;
  contactBranch?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactMobile?: string;
  contactBankId?: string;
  contactBankAccountNumber?: string;
  contactBankBranch?: string;
  contactBankAccountType?: string;
  contactCreditDays?: string;
  contactOffice?: string;
  contactFax?: string;
  contactWebsite?: string;
  contactShippingAddress?: string;
  contactNote?: string;
  contactType?: number; // 3 = Customer, 5 = Supplier, 7 = Customer&Supplier
  contactGroup?: number;
  contactCode?: string;
}

export interface FlowAccountInvoiceItem {
  id?: string;
  name: string;
  nameLocal?: string;
  description?: string;
  unitName?: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  vatRate?: number;
  vatAmount?: number;
  netAmount?: number;
}

export interface FlowAccountInvoice {
  id?: string;
  documentSerial?: string;
  documentNumber?: string;
  documentDate?: string;
  dueDate?: string;
  saleName?: string;
  projectName?: string;
  reference?: string;
  isVat?: boolean;
  vatRate?: number;
  discountPercentage?: number;
  discountAmount?: number;
  totalAfterDiscount?: number;
  vatAmount?: number;
  grandTotal?: number;
  totalAmount?: number;
  totalAmountInWords?: string;
  contactId?: string;
  contactName?: string;
  contact?: FlowAccountContact;
  items: FlowAccountInvoiceItem[];
  published?: boolean;
  isDraft?: boolean;
  createdDateTime?: string;
  modifiedDateTime?: string;
}

export interface FlowAccountCompany {
  id?: string;
  name: string;
  nameLocal?: string;
  taxId?: string;
  branch?: string;
  address?: string;
  addressLocal?: string;
  district?: string;
  amphure?: string;
  province?: string;
  zipCode?: string;
  country?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
}

// Use Supabase Edge Function as proxy to avoid CORS
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flowaccount-proxy`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Make authenticated API request to FlowAccount via Edge Function proxy
 */
interface FlowAccountResponse<T> {
  status: boolean;
  message: string;
  code: number;
  data: {
    total: string;
    currentPage: string;
    list: T[];
    isDB: string;
  };
}

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<FlowAccountResponse<T>> => {
  const env = isSandboxMode() ? 'sandbox' : 'production';
  const url = `${EDGE_FUNCTION_URL}/${endpoint}?env=${env}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  if (result.status === false) {
    throw new Error(`FlowAccount Error ${result.code}: ${result.message}`);
  }

  return result;
};

/**
 * Company/Profile API
 */
export const getCompanyProfile = async (): Promise<FlowAccountResponse<FlowAccountCompany>> => {
  return apiRequest<FlowAccountCompany>('/companies/profile');
};

/**
 * Contacts API
 */
export const getContacts = async (page: number = 1, limit: number = 50): Promise<FlowAccountContact[]> => {
  const result = await apiRequest<FlowAccountContact>(`/contacts?page=${page}&pageSize=${limit}`);
  return result.data.list;
};

export const getContactById = async (id: number): Promise<FlowAccountContact | null> => {
  const result = await apiRequest<FlowAccountContact>(`/contacts/${id}`);
  return result.data.list[0] || null;
};

export const createContact = async (contact: FlowAccountContact): Promise<FlowAccountContact> => {
  const result = await apiRequest<FlowAccountContact>('/contacts', {
    method: 'POST',
    body: JSON.stringify(contact)
  });
  return result.data.list[0];
};

export const updateContact = async (id: number, contact: Partial<FlowAccountContact>): Promise<FlowAccountContact> => {
  const result = await apiRequest<FlowAccountContact>(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contact)
  });
  return result.data.list[0];
};

/**
 * Search contacts by name in FlowAccount
 */
export const searchContactByName = async (name: string): Promise<FlowAccountContact | null> => {
  const contacts = await getContacts(1, 100);
  return contacts.find(c => c.contactName === name) || null;
};

/**
 * Sync contact to FlowAccount (upsert: create if not exists, update if exists)
 */
export const syncContactToFlowAccount = async (contactData: FlowAccountContact): Promise<{ action: 'created' | 'updated'; contact: FlowAccountContact }> => {
  const existing = await searchContactByName(contactData.contactName || '');
  
  if (existing && existing.id) {
    const updated = await updateContact(existing.id, contactData);
    return { action: 'updated', contact: updated };
  } else {
    const created = await createContact(contactData);
    return { action: 'created', contact: created };
  }
};

/**
 * Invoices API
 */
export const getInvoices = async (
  type: 'cash-invoice' | 'invoice' = 'invoice',
  page: number = 1,
  limit: number = 50
): Promise<FlowAccountInvoice[]> => {
  const result = await apiRequest<FlowAccountInvoice>(`/documents/${type}?page=${page}&pageSize=${limit}`);
  return result.data.list;
};

export const getInvoiceById = async (
  id: number,
  type: 'cash-invoice' | 'invoice' = 'invoice'
): Promise<FlowAccountInvoice | null> => {
  const result = await apiRequest<FlowAccountInvoice>(`/documents/${type}/${id}`);
  return result.data.list[0] || null;
};

export const createInvoice = async (
  invoice: FlowAccountInvoice,
  type: 'cash-invoice' | 'invoice' = 'invoice'
): Promise<FlowAccountInvoice> => {
  const result = await apiRequest<FlowAccountInvoice>(`/documents/${type}`, {
    method: 'POST',
    body: JSON.stringify(invoice)
  });
  return result.data.list[0];
};

export const updateInvoice = async (
  id: number,
  invoice: Partial<FlowAccountInvoice>,
  type: 'cash-invoice' | 'invoice' = 'invoice'
): Promise<FlowAccountInvoice> => {
  const result = await apiRequest<FlowAccountInvoice>(`/documents/${type}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(invoice)
  });
  return result.data.list[0];
};

/**
 * Convert More Drugstore contact to FlowAccount format
 */
export const convertContactToFlowAccount = (
  contact: {
    id: string;
    name: string;
    type?: 'buyer' | 'seller' | 'both';
    person_type?: 'individual' | 'company';
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    tax_id?: string;
    office_type?: 'headquarters' | 'branch';
    branch_code?: string;
    postal_code?: string;
    company_name?: string;
    notes?: string;
  }
): FlowAccountContact => {
  // contactType: 3=Customer, 5=Supplier, 7=Customer&Supplier
  let contactType = 3;
  if (contact.type === 'seller') contactType = 5;
  else if (contact.type === 'both') contactType = 7;

  return {
    contactName: contact.name,
    contactEmail: contact.email || '',
    contactOffice: contact.phone || '',
    contactMobile: contact.mobile || '',
    contactAddress: contact.address || '',
    contactTaxId: contact.tax_id || '',
    contactBranch: contact.office_type === 'branch' ? 'สาขา' : 'สำนักงานใหญ่',
    contactBranchCode: contact.branch_code || '',
    contactZipCode: contact.postal_code || '',
    contactNote: contact.notes || '',
    contactType,
  };
};

/**
 * Convert More Drugstore quotation to FlowAccount invoice format
 */
export const convertQuotationToInvoice = (
  quotation: {
    id: string;
    customer_name: string;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      unit?: string;
    }>;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    created_at: string;
    due_date?: string;
  },
  contactId?: string
): FlowAccountInvoice => {
  const items: FlowAccountInvoiceItem[] = quotation.items.map((item, index) => ({
    id: String(index + 1),
    name: item.product_name,
    nameLocal: item.product_name,
    quantity: item.quantity,
    pricePerUnit: item.unit_price,
    total: item.quantity * item.unit_price,
    unitName: item.unit || 'ชิ้น',
    vatRate: 7,
    vatAmount: (item.quantity * item.unit_price) * 0.07,
    netAmount: item.quantity * item.unit_price * 1.07
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = subtotal * 0.07;
  const grandTotal = subtotal + vatAmount;

  return {
    documentDate: quotation.created_at.split('T')[0],
    dueDate: quotation.due_date || quotation.created_at.split('T')[0],
    contactId: contactId,
    contactName: quotation.customer_name,
    isVat: true,
    vatRate: 7,
    vatAmount: vatAmount,
    grandTotal: grandTotal,
    totalAmount: grandTotal,
    totalAfterDiscount: subtotal,
    items: items,
    isDraft: true
  };
};
