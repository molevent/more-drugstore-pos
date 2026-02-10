// Use Netlify Function proxy to bypass CORS
const ZORTOUT_BASE_URL = '/.netlify/functions/zortout-proxy'

interface ZortOutCredentials {
  storename: string
  apikey: string
  apisecret: string
}

interface ZortOutProduct {
  id: number
  sku: string
  name: string
  barcode: string
  price: number
  cost: number
  stockquantity: number
  unit: string
  category: string
  description: string
  active: boolean
  updateddate?: string
  createddate?: string
}

interface ZortOutOrder {
  id: number
  ordernumber: string
  customername: string
  customerphone: string
  total: number
  status: string
  createddatetime: string
  saleschannel?: string
  items: Array<{
    productid: number
    sku: string
    name: string
    quantity: number
    price: number
  }>
}

interface ZortOutDocument {
  id: number
  documentnumber: string
  referencenumber: string
  documentdate: string
  total: number
}

interface ZortOutPurchaseOrder {
  id: number
  number: string
  customername: string
  customerphone: string
  customeremail: string
  customeridnumber: string
  status: string
  paymentstatus: string
  amount: number
  vatamount: number
  purchaseorderdate: string
  warehousecode: string
  list: Array<{
    productid: number
    sku: string
    name: string
    number: number
    pricepernumber: number
    totalprice: number
    discount: string
    vat_status: number
  }>
  createddatetime: string
}

interface ZortOutResponse<T> {
  res: number
  resCode?: string
  resDesc?: string
  list: T[]
  count: number
  orderid?: number
  id?: number
}

export class ZortOutService {
  private credentials: ZortOutCredentials

  constructor(credentials: ZortOutCredentials) {
    this.credentials = credentials
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ZortOutResponse<T>> {
    // Parse endpoint to separate path and query params
    const [path, queryString] = endpoint.split('?')
    
    // Build URL with path as query param for Netlify Function proxy
    let url = `${ZORTOUT_BASE_URL}`
    const params = new URLSearchParams()
    params.set('path', path)
    
    // Add original query params
    if (queryString) {
      const originalParams = new URLSearchParams(queryString)
      originalParams.forEach((value, key) => {
        params.set(key, value)
      })
    }
    
    url += '?' + params.toString()
    
    const headers = {
      'Content-Type': 'application/json',
      'storename': this.credentials.storename,
      'apikey': this.credentials.apikey,
      'apisecret': this.credentials.apisecret,
      ...options.headers
    }

    console.log('ZortOut API Request:', { url, method: options.method || 'GET', endpoint, headers: { storename: headers.storename, apikey: headers.apikey?.slice(0, 10) + '...' } })

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      console.log('ZortOut API Response:', { status: response.status, statusText: response.statusText, ok: response.ok })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ZortOut API Error Response:', errorText)
        throw new Error(`ZortOut API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('ZortOut API Response Data:', data)
      return data
    } catch (error: any) {
      console.error('ZortOut API Request Failed:', {
        url,
        error: error.message,
        type: error.name
      })
      throw error
    }
  }

  // ==================== PRODUCTS ====================
  
  async getProducts(page: number = 1, limit: number = 200): Promise<ZortOutProduct[]> {
    const data = await this.request<ZortOutProduct>(`/Product/GetProducts?page=${page}&limit=${limit}`)
    return data.list || []
  }

  async getProductBySku(sku: string): Promise<ZortOutProduct | null> {
    const data = await this.request<ZortOutProduct>(`/Product/GetProductBySku?sku=${encodeURIComponent(sku)}`)
    return data.list?.[0] || null
  }

  async addProduct(product: Partial<ZortOutProduct>): Promise<any> {
    return this.request('/Product/AddProduct', {
      method: 'POST',
      body: JSON.stringify(product)
    })
  }

  async updateProduct(product: Partial<ZortOutProduct> & { id: number }): Promise<any> {
    return this.request('/Product/UpdateProduct', {
      method: 'POST',
      body: JSON.stringify(product)
    })
  }

  async updateStock(productId: number, quantity: number, warehouseId?: number): Promise<any> {
    return this.request('/Product/UpdateStock', {
      method: 'POST',
      body: JSON.stringify({
        productid: productId,
        quantity: quantity,
        warehouseid: warehouseId
      })
    })
  }

  // ==================== ORDERS ====================
  
  async getOrders(
    page: number = 1, 
    limit: number = 200,
    startDate?: string,
    endDate?: string,
    salesChannel?: string
  ): Promise<ZortOutOrder[]> {
    let url = `/Order/GetOrders?page=${page}&limit=${limit}`
    if (startDate) url += `&startdate=${startDate}`
    if (endDate) url += `&enddate=${endDate}`
    if (salesChannel) url += `&saleschannel=${encodeURIComponent(salesChannel)}`
    
    const data = await this.request<ZortOutOrder>(url)
    return data.list || []
  }

  async addOrder(order: Partial<ZortOutOrder>): Promise<any> {
    return this.request('/Order/AddOrder', {
      method: 'POST',
      body: JSON.stringify(order)
    })
  }

  // ==================== DOCUMENTS ====================
  
  async getDocuments(
    page: number = 1,
    limit: number = 200,
    documentType?: number,
    createdAfter?: string,
    createdBefore?: string
  ): Promise<ZortOutDocument[]> {
    let url = `/Document/GetDocuments?page=${page}&limit=${limit}`
    if (documentType) url += `&documenttype=${documentType}`
    if (createdAfter) url += `&createdafter=${createdAfter}`
    if (createdBefore) url += `&createdbefore=${createdBefore}`
    
    const data = await this.request<ZortOutDocument>(url)
    return data.list || []
  }

  async addDocumentOrder(orderId: number): Promise<any> {
    return this.request(`/Document/AddDocumentOrder?id=${orderId}`, {
      method: 'POST'
    })
  }

  // ==================== POS SYNC ====================
  
  async createOrderInZortOut(orderData: {
    customername?: string
    customerphone?: string
    items: Array<{
      productid?: number
      sku: string
      name: string
      quantity: number
      price: number
    }>
    total: number
    paymentmethod?: string
    notes?: string
  }): Promise<{ success: boolean; orderId?: number; error?: string }> {
    try {
      // First, add the order to ZortOut
      const orderPayload = {
        customername: orderData.customername || 'ลูกค้าทั่วไป',
        customerphone: orderData.customerphone || '',
        items: orderData.items.map(item => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: orderData.total,
        paymentmethod: orderData.paymentmethod || 'เงินสด',
        notes: orderData.notes || ''
      }

      const result = await this.request('/Orders/AddOrder', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      })

      if (result.res !== 200 && result.resCode !== '200') {
        return { success: false, error: result.resDesc || 'Failed to create order' }
      }

      const orderId = result.orderid || result.id

      // Generate document (receipt) for the order
      if (orderId) {
        try {
          await this.addDocumentOrder(orderId)
        } catch (docError) {
          console.warn('Failed to generate document for order:', docError)
        }
      }

      return { success: true, orderId }
    } catch (error: any) {
      console.error('Error creating order in ZortOut:', error)
      return { success: false, error: error.message }
    }
  }

  async updateProductStockBySku(sku: string, quantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      // First get product by SKU to get product ID
      const product = await this.getProductBySku(sku)
      
      if (!product) {
        return { success: false, error: `Product with SKU ${sku} not found in ZortOut` }
      }

      // Update stock in ZortOut (deduct the sold quantity)
      // ZortOut UpdateStock API replaces the stock quantity, so we need to calculate remaining
      const newStockQuantity = Math.max(0, product.stockquantity - quantity)
      
      const result = await this.updateStock(product.id, newStockQuantity)

      if (result.res !== 200 && result.resCode !== '200') {
        return { success: false, error: result.resDesc || 'Failed to update stock' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error updating stock in ZortOut:', error)
      return { success: false, error: error.message }
    }
  }

  async updateProductStockBySkuForReceiving(
    sku: string, 
    receivedQuantity: number, 
    newTotalQuantity: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First get product by SKU to get product ID
      const product = await this.getProductBySku(sku)
      
      if (!product) {
        return { success: false, error: `Product with SKU ${sku} not found in ZortOut` }
      }

      // Update stock in ZortOut (set to new total quantity)
      // When receiving stock, we set the new total quantity directly
      const result = await this.updateStock(product.id, newTotalQuantity)

      if (result.res !== 200 && result.resCode !== '200') {
        return { success: false, error: result.resDesc || 'Failed to update stock' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error updating stock in ZortOut for receiving (+', receivedQuantity, '):', error)
      return { success: false, error: error.message }
    }
  }

  async syncOrderAndStockToZortOut(orderData: {
    customername?: string
    customerphone?: string
    items: Array<{
      productid?: number
      sku: string
      name: string
      quantity: number
      price: number
    }>
    total: number
    paymentmethod?: string
    notes?: string
  }): Promise<{ orderSuccess: boolean; stockUpdates: Array<{ sku: string; success: boolean; error?: string }>; orderId?: number; error?: string }> {
    const result: {
      orderSuccess: boolean
      stockUpdates: Array<{ sku: string; success: boolean; error?: string }>
      orderId?: number
      error?: string
    } = {
      orderSuccess: false,
      stockUpdates: []
    }

    // Create order in ZortOut
    const orderResult = await this.createOrderInZortOut(orderData)
    
    if (!orderResult.success) {
      result.error = orderResult.error
      return result
    }

    result.orderSuccess = true
    result.orderId = orderResult.orderId

    // Update stock for each item
    for (const item of orderData.items) {
      const stockResult = await this.updateProductStockBySku(item.sku, item.quantity)
      result.stockUpdates.push({
        sku: item.sku,
        success: stockResult.success,
        error: stockResult.error
      })
    }

    return result
  }

  // ==================== SYNC HELPERS ====================
  
  async syncAllProducts(): Promise<ZortOutProduct[]> {
    const products: ZortOutProduct[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const batch = await this.getProducts(page, 200)
      if (batch.length === 0) {
        hasMore = false
      } else {
        products.push(...batch)
        page++
        if (batch.length < 200) hasMore = false
      }
    }

    return products
  }

  async syncAllOrders(startDate?: string, endDate?: string, salesChannel?: string): Promise<ZortOutOrder[]> {
    const orders: ZortOutOrder[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const batch = await this.getOrders(page, 200, startDate, endDate, salesChannel)
      if (batch.length === 0) {
        hasMore = false
      } else {
        orders.push(...batch)
        page++
        if (batch.length < 200) hasMore = false
      }
    }

    return orders
  }

  // ==================== PULL SPECIFIC ORDERS ====================
  
  async getOrderByNumber(orderNumber: string): Promise<ZortOutOrder | null> {
    try {
      // Search orders by order number pattern
      const orders = await this.getOrders(1, 200)
      return orders.find(o => o.ordernumber === orderNumber) || null
    } catch (error) {
      console.error('Error getting order by number:', error)
      return null
    }
  }

  async getOrdersByDateRange(startDate: string, endDate: string, salesChannel?: string): Promise<ZortOutOrder[]> {
    return this.syncAllOrders(startDate, endDate, salesChannel)
  }

  async getRecentChanges(since: string): Promise<{
    orders: ZortOutOrder[]
    products: ZortOutProduct[]
  }> {
    const sinceDate = new Date(since).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    
    const [orders, products] = await Promise.all([
      this.syncAllOrders(sinceDate, today),
      this.syncAllProducts()
    ])

    // Filter products that changed since the given date
    const recentProducts = products.filter(p => {
      if (!p.updateddate) return false
      return new Date(p.updateddate) >= new Date(since)
    })

    return { orders, products: recentProducts }
  }

  // Test if PurchaseOrder API is available for this account
  async testPurchaseOrderAPI(): Promise<{ available: boolean; message: string }> {
    try {
      const result = await this.request('/PurchaseOrder/GetPurchaseOrders?page=1&limit=1')
      console.log('PurchaseOrder API Test Result:', result)
      
      if (result.res === 200 || result.resCode === '200') {
        return { available: true, message: 'Purchase Order API is available' }
      }
      return { available: false, message: result.resDesc || 'API returned error' }
    } catch (error: any) {
      console.error('PurchaseOrder API Test Error:', error)
      return { available: false, message: error.message }
    }
  }

  async addPurchaseOrder(poData: {
    number: string
    customername: string
    customerphone?: string
    customeremail?: string
    customeridnumber?: string
    customercode?: string
    purchaseorderdate: string
    amount: number
    vatamount?: number
    vattype?: 1 | 2 | 3  // 1=No Vat, 2=Exclude, 3=Include
    warehousecode?: string
    discount?: string
    description?: string
    reference?: string
    items: Array<{
      sku: string
      name: string
      quantity: number
      pricepernumber: number
      totalprice: number
      discount?: string
      vat_status?: number
    }>
  }): Promise<{ success: boolean; poId?: number; error?: string }> {
    try {
      // Generate unique number to prevent duplicates
      const uniqueNumber = `PO-${poData.number}-${Date.now()}`

      const payload = {
        number: poData.number,
        customername: poData.customername,
        customerphone: poData.customerphone || '',
        customeremail: poData.customeremail || '',
        customeridnumber: poData.customeridnumber || '',
        customercode: poData.customercode || '',
        purchaseorderdate: poData.purchaseorderdate,
        amount: poData.amount,
        vatamount: poData.vatamount || 0,
        vattype: poData.vattype || 1,
        warehousecode: poData.warehousecode || '',
        discount: poData.discount || '',
        description: poData.description || '',
        reference: poData.reference || '',
        status: 'Pending', // Default status
        list: poData.items.map(item => ({
          sku: item.sku,
          name: item.name,
          number: item.quantity,
          pricepernumber: item.pricepernumber,
          totalprice: item.totalprice,
          discount: item.discount || '',
          vat_status: item.vat_status || 0,
          producttype: 0 // Product type
        }))
      }

      console.log('ZortOut AddPurchaseOrder Request:', {
        url: `/PurchaseOrder/AddPurchaseOrder?uniquenumber=${uniqueNumber}`,
        payload: JSON.stringify(payload, null, 2)
      })

      const result = await this.request(`/PurchaseOrder/AddPurchaseOrder?uniquenumber=${encodeURIComponent(uniqueNumber)}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      console.log('ZortOut AddPurchaseOrder Response:', result)

      if (result.res !== 200 && result.resCode !== '200') {
        return { success: false, error: result.resDesc || `Failed to create purchase order (res: ${result.res}, resCode: ${result.resCode})` }
      }

      // Try to get PO ID from different possible response fields
      const poId = result.id || result.orderid
      if (!poId) {
        console.error('No PO ID in response:', result)
        return { success: false, error: 'No PO ID returned from ZortOut' }
      }

      return { success: true, poId }
    } catch (error: any) {
      console.error('Error creating purchase order in ZortOut:', error)
      return { success: false, error: error.message }
    }
  }

  async updatePurchaseOrderStatus(
    number: string,
    status: 'Pending' | 'Success' | 'Waiting' | 'Shipping' | 'Voided',
    warehousecode?: string,
    actionDate?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const statusMap: Record<string, number> = {
        'Pending': 1,
        'Success': 1,
        'Waiting': 3,
        'Shipping': 6,
        'Voided': 4
      }

      const payload: any = {
        number: number,
        status: statusMap[status] || 1
      }

      if (warehousecode) {
        payload.warehousecode = warehousecode
      }

      if (actionDate) {
        payload.actionDate = actionDate
      }

      const result = await this.request('/PurchaseOrder/UpdatePurchaseOrderStatus', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (result.res !== 200 && result.resCode !== '200') {
        return { success: false, error: result.resDesc || 'Failed to update purchase order status' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error updating purchase order status in ZortOut:', error)
      return { success: false, error: error.message }
    }
  }

  async addPurchaseOrderPayment(poData: {
    number: string
    paymentamount: number
    paymentmethod: string
    paymentdate?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        number: poData.number,
        paymentamount: poData.paymentamount,
        paymentmethod: poData.paymentmethod,
        paymentdate: poData.paymentdate || new Date().toISOString().slice(0, 16).replace('T', ' ')
      }

      const result = await this.request('/PurchaseOrder/UpdatePurchaseOrderPayment', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (result.res !== 200 && result.resCode !== '200') {
        return { success: false, error: result.resDesc || 'Failed to add purchase order payment' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error adding purchase order payment to ZortOut:', error)
      return { success: false, error: error.message }
    }
  }

  async getPurchaseOrders(
    page: number = 1,
    limit: number = 200,
    startDate?: string,
    endDate?: string
  ): Promise<ZortOutPurchaseOrder[]> {
    let url = `/PurchaseOrder/GetPurchaseOrders?page=${page}&limit=${limit}`
    if (startDate) url += `&purchaseorderdateafter=${startDate}`
    if (endDate) url += `&purchaseorderdatebefore=${endDate}`

    const data = await this.request<ZortOutPurchaseOrder>(url)
    return data.list || []
  }

  async getPurchaseOrderByNumber(number: string): Promise<ZortOutPurchaseOrder | null> {
    try {
      const url = `/PurchaseOrder/GetPurchaseOrders?page=1&limit=1&keyword=${encodeURIComponent(number)}`
      const data = await this.request<ZortOutPurchaseOrder>(url)
      return data.list?.find(po => po.number === number) || null
    } catch (error) {
      console.error('Error getting purchase order by number:', error)
      return null
    }
  }

  // ==================== POLLING ====================
  
  async pollForNewOrders(lastCheckTime: string): Promise<ZortOutOrder[]> {
    const since = new Date(lastCheckTime).toISOString().split('T')[0]
    const now = new Date().toISOString().split('T')[0]
    
    try {
      const orders = await this.syncAllOrders(since, now)
      // Filter orders created after last check
      return orders.filter(o => {
        if (!o.createddatetime) return false
        return new Date(o.createddatetime) > new Date(lastCheckTime)
      })
    } catch (error) {
      console.error('Error polling for new orders:', error)
      return []
    }
  }
}

export const zortOutService = new ZortOutService({
  storename: 'moredrugstore.cm@gmail.com',
  apikey: '2qxdu3x9UrF25s4inXnrQrLyhLaRIcIoFJJUl427uNE=',
  apisecret: 'WJVD5cuM8bnQdFueTQOH5gc3Uy/8xpMcnvxTnBQRwg='
})

export type { ZortOutProduct, ZortOutOrder, ZortOutDocument, ZortOutCredentials }
