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

export interface FlowAccountQuotation {
  id?: number;
  documentSerial?: string;
  documentNumber?: string;
  documentDate?: string;
  dueDate?: string;
  contactName?: string;
  contactAddress?: string;
  contactTaxId?: string;
  contactBranch?: string;
  contactEmail?: string;
  publishedOn?: string;
  creditType?: number;
  creditDays?: number;
  items?: FlowAccountQuotationItem[];
  subTotal?: number;
  totalDiscount?: number;
  totalAfterDiscount?: number;
  isVat?: boolean;
  vatAmount?: number;
  grandTotal?: number;
  remarks?: string;
  internalNotes?: string;
  status?: number;
  statusString?: string;
}

export interface FlowAccountQuotationItem {
  name?: string;
  description?: string;
  quantity?: number;
  unitName?: string;
  pricePerUnit?: number;
  discount?: number;
  total?: number;
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
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const env = isSandboxMode() ? 'sandbox' : 'production';
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const separator = cleanEndpoint.includes('?') ? '&' : '?';
  const url = `${EDGE_FUNCTION_URL}/${cleanEndpoint}${separator}env=${env}`;

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

  return response.json();
};

/**
 * Company/Profile API
 */
export const getCompanyProfile = async (): Promise<FlowAccountCompany> => {
  return apiRequest<FlowAccountCompany>('/companies/profile');
};

/**
 * Contacts API
 */
export const getContacts = async (page: number = 1, limit: number = 50): Promise<FlowAccountContact[]> => {
  return apiRequest<FlowAccountContact[]>(`/contacts?page=${page}&limit=${limit}`);
};

export const getContactById = async (id: string): Promise<FlowAccountContact> => {
  return apiRequest<FlowAccountContact>(`/contacts/${id}`);
};

export const createContact = async (contact: FlowAccountContact): Promise<FlowAccountContact> => {
  return apiRequest<FlowAccountContact>('/contacts', {
    method: 'POST',
    body: JSON.stringify(contact)
  });
};

export const updateContact = async (id: string, contact: Partial<FlowAccountContact>): Promise<FlowAccountContact> => {
  return apiRequest<FlowAccountContact>(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contact)
  });
};

/**
 * Quotations API (FlowAccount uses /quotations endpoint)
 */
export const getQuotations = async (page: number = 1, limit: number = 50): Promise<any> => {
  return apiRequest<any>(`quotations?currentPage=${page}&pageSize=${limit}&sortBy=&filter=`);
};

export const getQuotationById = async (id: number): Promise<any> => {
  return apiRequest<any>(`quotations/${id}`);
};

export const createQuotation = async (quotation: any): Promise<any> => {
  return apiRequest<any>('quotations', {
    method: 'POST',
    body: JSON.stringify(quotation)
  });
};

export const updateQuotation = async (id: number, quotation: any): Promise<any> => {
  return apiRequest<any>(`quotations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(quotation)
  });
};

/**
 * Products API (สินค้า - FlowAccount uses /products endpoint)
 * Response format: { data: { total, list: [...] } }
 * Product fields: id, code (=SKU), name, barcode, sellPrice, sellVatType, unitName, sellDescription, buyPrice, type
 */
export const getFlowProducts = async (page: number = 1, limit: number = 100): Promise<any> => {
  const result = await apiRequest<any>(`products?currentPage=${page}&pageSize=${limit}&sortBy=&filter=`);
  return result?.data?.list || [];
};

export const getFlowProductById = async (id: number): Promise<any> => {
  return apiRequest<any>(`products/${id}`);
};

export const createFlowProduct = async (product: any): Promise<any> => {
  return apiRequest<any>('products', {
    method: 'POST',
    body: JSON.stringify(product)
  });
};

export const updateFlowProduct = async (id: number, product: any): Promise<any> => {
  return apiRequest<any>(`products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product)
  });
};

export const deleteFlowProduct = async (id: number): Promise<any> => {
  return apiRequest<any>(`products/${id}`, {
    method: 'DELETE'
  });
};

/**
 * Convert local product to FlowAccount product format
 */
export const convertProductToFlowAccount = (product: {
  sku?: string;
  barcode?: string;
  name_th: string;
  name_en?: string;
  description_th?: string;
  base_price: number;
  cost_price?: number;
  selling_price_incl_vat?: number;
  selling_price_excl_vat?: number;
  unit?: string;
  product_type?: string;
}): any => {
  const sellPrice = product.selling_price_excl_vat || product.base_price || 0;
  const buyPrice = product.cost_price || 0;
  
  return {
    type: 3, // 3 = inventory product (นับสต็อก), 1 = service (บริการ)
    name: product.name_th || product.name_en || '-',
    sellDescription: product.description_th || product.name_en || '',
    buyDescription: '',
    unitName: product.unit || 'ชิ้น',
    code: product.sku || '',
    barcode: product.barcode || '',
    sellPrice: sellPrice,
    sellVatType: 3, // 3 = VAT 7%
    buyPrice: buyPrice,
    buyVatType: 7, // 7 = No VAT
  };
};

/**
 * Sync products to FlowAccount with duplicate detection by code/barcode/name
 * Returns { created, updated, skipped, failed, results }
 */
export const syncProductsToFlowAccount = async (
  products: Array<{
    id: string;
    sku?: string;
    barcode?: string;
    name_th: string;
    name_en?: string;
    description_th?: string;
    base_price: number;
    cost_price?: number;
    selling_price_incl_vat?: number;
    selling_price_excl_vat?: number;
    unit?: string;
    product_type?: string;
  }>
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: Array<{ localId: string; faId?: number; action: string; error?: string }>;
}> => {
  // 1. Fetch all existing FA products for matching
  let existingProducts: any[] = [];
  let page = 1;
  while (true) {
    const batch = await getFlowProducts(page, 100);
    if (!batch || batch.length === 0) break;
    existingProducts = existingProducts.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  console.log('FA existing products:', existingProducts.length);

  // 2. Build lookup maps
  const byCode = new Map<string, any>();
  const byBarcode = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const p of existingProducts) {
    if (p.code) byCode.set(p.code.toLowerCase(), p);
    if (p.barcode) byBarcode.set(p.barcode.toLowerCase(), p);
    if (p.name) byName.set(p.name.toLowerCase(), p);
  }

  let created = 0, updated = 0, skipped = 0, failed = 0;
  const results: Array<{ localId: string; faId?: number; action: string; error?: string }> = [];

  // 3. Process each product
  for (const product of products) {
    try {
      const faData = convertProductToFlowAccount(product);
      
      // Find existing by code (SKU) > barcode > name
      let existing: any = null;
      if (product.sku) existing = byCode.get(product.sku.toLowerCase());
      if (!existing && product.barcode) existing = byBarcode.get(product.barcode.toLowerCase());
      if (!existing && product.name_th) existing = byName.get(product.name_th.toLowerCase());

      if (existing) {
        const existingType = String(existing.type);
        if (existingType !== '3') {
          // Existing is not inventory type — delete and recreate as type 3
          await deleteFlowProduct(existing.id);
          const result = await createFlowProduct(faData);
          const newId = result?.data?.list?.[0]?.id;
          updated++;
          results.push({ localId: product.id, faId: newId, action: 'recreated' });
        } else {
          // Same type — update without type field to avoid ProductTypeNotMatch
          const { type, ...updateData } = faData;
          const result = await updateFlowProduct(existing.id, updateData);
          const updatedId = result?.data?.list?.[0]?.id || existing.id;
          updated++;
          results.push({ localId: product.id, faId: updatedId, action: 'updated' });
        }
      } else {
        // Create new
        const result = await createFlowProduct(faData);
        const newId = result?.data?.list?.[0]?.id;
        created++;
        results.push({ localId: product.id, faId: newId, action: 'created' });
      }
    } catch (err: any) {
      failed++;
      results.push({ localId: product.id, action: 'failed', error: err.message });
    }
  }

  return { created, updated, skipped, failed, results };
};

/**
 * Cash Invoices API (ขายเงินสด - FlowAccount uses /cash-invoices endpoint)
 */
export const getCashInvoices = async (page: number = 1, limit: number = 50): Promise<any> => {
  return apiRequest<any>(`cash-invoices?currentPage=${page}&pageSize=${limit}&sortBy=&filter=`);
};

export const getCashInvoicesByDateRange = async (
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 100
): Promise<any> => {
  // FlowAccount GET /cash-invoices does not support date filtering via query params.
  // Fetch all and filter client-side.
  const result = await apiRequest<any>(`cash-invoices?currentPage=${page}&pageSize=${limit}&sortBy=&filter=`);
  
  // Debug: log raw response structure
  console.log('FA cash-invoices raw response keys:', Object.keys(result || {}))
  console.log('FA cash-invoices raw response preview:', JSON.stringify(result).substring(0, 500))
  
  // FlowAccount returns { data: { totalDocument, list: [...] } }
  const allInvoices = result?.data?.list || result?.data || result?.list || (Array.isArray(result) ? result : []);
  const invoices = Array.isArray(allInvoices) ? allInvoices : [];
  console.log('FA cash-invoices: parsed', invoices.length, 'invoices from response');
  
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T23:59:59')
  
  const filtered = invoices.filter((inv: any) => {
    const dateStr = inv.publishedOn || inv.documentDate || inv.createdOn || ''
    if (!dateStr) return true // include if no date
    const d = new Date(dateStr)
    return d >= start && d <= end
  })
  
  return filtered;
};

export const createCashInvoice = async (invoice: any): Promise<any> => {
  return apiRequest<any>('cash-invoices', {
    method: 'POST',
    body: JSON.stringify(invoice)
  });
};

/**
 * Convert POS order to FlowAccount cash invoice format
 */
export const convertOrderToCashInvoice = (
  order: {
    order_number: string;
    customer_name?: string;
    total: number;
    subtotal: number;
    discount: number;
    payment_method?: string;
    created_at: string;
    platform_name?: string;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      discount: number;
      total_price: number;
    }>;
  }
): any => {
  const items = order.items
    .filter(item => item.total_price > 0 || item.unit_price > 0)
    .map(item => ({
      name: item.product_name || 'สินค้า',
      description: '',
      quantity: item.quantity,
      unitName: 'ชิ้น',
      pricePerUnit: item.unit_price,
      discount: item.discount || 0,
      total: item.total_price
    }));

  // If no priced items, include all items
  const finalItems = items.length > 0 ? items : order.items.map(item => ({
    name: item.product_name || 'สินค้า',
    description: '',
    quantity: item.quantity,
    unitName: 'ชิ้น',
    pricePerUnit: item.unit_price,
    discount: item.discount || 0,
    total: item.total_price
  }));

  const orderDate = order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    documentDate: orderDate,
    dueDate: orderDate,
    contactName: order.customer_name || 'ลูกค้าทั่วไป',
    items: finalItems,
    subTotal: order.subtotal || order.total,
    totalDiscount: order.discount || 0,
    totalAfterDiscount: (order.subtotal || order.total) - (order.discount || 0),
    isVat: false,
    vatAmount: 0,
    grandTotal: order.total,
    remarks: `${order.platform_name || ''} ${order.order_number} ${order.payment_method || ''}`.trim(),
    internalNotes: ''
  };
};

/**
 * Invoices API
 */
export const getInvoices = async (
  type: 'cash-invoice' | 'invoice' = 'invoice',
  page: number = 1,
  limit: number = 50
): Promise<FlowAccountInvoice[]> => {
  return apiRequest<FlowAccountInvoice[]>(`/documents/${type}?page=${page}&limit=${limit}`);
};

export const getInvoiceById = async (
  id: number,
  type: 'cash-invoice' | 'invoice' = 'invoice'
): Promise<FlowAccountInvoice> => {
  return apiRequest<FlowAccountInvoice>(`/documents/${type}/${id}`);
};

export const createInvoice = async (
  invoice: FlowAccountInvoice,
  type: 'cash-invoice' | 'invoice' = 'invoice'
): Promise<FlowAccountInvoice> => {
  return apiRequest<FlowAccountInvoice>(`/documents/${type}`, {
    method: 'POST',
    body: JSON.stringify(invoice)
  });
};

export const updateInvoice = async (
  id: number,
  invoice: Partial<FlowAccountInvoice>,
  type: 'cash-invoice' | 'invoice' = 'invoice'
): Promise<FlowAccountInvoice> => {
  return apiRequest<FlowAccountInvoice>(`/documents/${type}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(invoice)
  });
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
 * Convert More Drugstore quotation to FlowAccount quotation format
 */
export const convertQuotationToFlowAccount = (
  quotation: {
    id?: string;
    quotation_number?: string;
    contact_name: string;
    contact_company?: string;
    contact_address?: string;
    contact_tax_id?: string;
    contact_phone?: string;
    issue_date: string;
    expiry_date: string;
    items: Array<{
      product_name: string;
      description?: string;
      quantity: number;
      unit?: string;
      unit_price: number;
      discount_amount?: number;
      total: number;
    }>;
    subtotal: number;
    discount_amount?: number;
    discount_percent?: number;
    tax_amount?: number;
    tax_rate?: number;
    total_amount: number;
    notes?: string;
    terms?: string;
  }
): any => {
  const items = quotation.items.map(item => {
    const name = item.product_name?.trim() || ''
    const details = ((item as any).details || '')?.trim()
    const desc = (item.description || '')?.trim()
    
    // If name is empty but details/description exist, use '-' as name and keep details as description
    return {
      name: name || '-',
      description: name ? (details || desc) : (details || desc || ''),
      quantity: item.quantity,
      unitName: item.unit || 'ชิ้น',
      pricePerUnit: item.unit_price,
      discount: item.discount_amount || 0,
      total: item.total
    }
  });

  return {
    documentDate: quotation.issue_date,
    dueDate: quotation.expiry_date,
    contactName: quotation.contact_name,
    contactAddress: quotation.contact_address || '',
    contactTaxId: quotation.contact_tax_id || '',
    items,
    subTotal: quotation.subtotal,
    totalDiscount: quotation.discount_amount || 0,
    totalAfterDiscount: quotation.subtotal - (quotation.discount_amount || 0),
    isVat: (quotation.tax_rate || 0) > 0,
    vatAmount: quotation.tax_amount || 0,
    grandTotal: quotation.total_amount,
    remarks: quotation.notes || '',
    internalNotes: quotation.terms || ''
  };
};

/**
 * Convert More Drugstore quotation to FlowAccount invoice format (legacy)
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
