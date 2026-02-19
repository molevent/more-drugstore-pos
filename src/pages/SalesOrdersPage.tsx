import { useState, useEffect } from 'react'
import { ListOrdered, Search, Calendar, Eye, Edit, Trash2, Receipt, BookOpen, FileText } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import OrderEditModal from '../components/OrderEditModal'
import { supabase } from '../services/supabase'

interface SalesOrder {
  id: string
  order_number: string
  customer_name?: string
  payment_method?: string
  total: number
  subtotal: number
  discount: number
  platform_id: string
  is_cancelled?: boolean
  created_at: string
  updated_at: string
  order_source?: string
  order_items_count: number
  order_items?: OrderItem[]
}

interface OrderItem {
  id: string
  product_name?: string
  quantity: number
  unit_price: number
  discount: number
  total_price: number
  products?: { name: string }
}

interface OrderDetail extends SalesOrder {
  order_items: OrderItem[]
}

const SALES_CHANNELS: Record<string, string> = {
  'walk-in': 'หน้าร้าน',
  'grab': 'GRAB',
  'shopee': 'SHOPEE',
  'lineman': 'LINEMAN',
  'lazada': 'LAZADA',
  'line_shopping': 'LINE Shopping',
  'tiktok': 'TikTok Shop',
  'website': 'Website'
}

const PAYMENT_METHODS: Record<string, string> = {
  'cash': 'เงินสด',
  'transfer': 'โอนเงิน',
  'credit_card': 'บัตรเครดิต',
  'promptpay': 'พร้อมเพย์'
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editingOrderSource, setEditingOrderSource] = useState<'pos' | 'website'>('pos')
  const [platformsMap, setPlatformsMap] = useState<Record<string, string>>({})

  // Fetch platforms for mapping UUID to name
  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('id, name, code')
      
      if (error) {
        console.error('Error fetching platforms:', error)
        return
      }
      
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((p: any) => {
          map[p.id] = p.name || p.code || 'ไม่ระบุ'
        })
        setPlatformsMap(map)
        console.log('Platforms map:', map)
      }
    } catch (err) {
      console.error('Exception fetching platforms:', err)
    }
  }

  useEffect(() => {
    fetchPlatforms()
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      console.log('Fetching orders from Supabase...')
      
      // Fetch regular orders
      let regularQuery = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          payment_method,
          total,
          subtotal,
          discount,
          platform_id,
          created_at,
          updated_at,
          order_items(count)
        `)
        .order('created_at', { ascending: false })

      if (dateFrom) {
        regularQuery = regularQuery.gte('created_at', dateFrom + 'T00:00:00')
      }
      if (dateTo) {
        regularQuery = regularQuery.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data: regularOrders, error: regularError } = await regularQuery

      // Fetch web orders (e-commerce)
      let webQuery = supabase
        .from('web_orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          total_amount,
          subtotal,
          shipping_fee,
          status,
          created_at,
          updated_at,
          web_order_items(count)
        `)
        .order('created_at', { ascending: false })

      if (dateFrom) {
        webQuery = webQuery.gte('created_at', dateFrom + 'T00:00:00')
      }
      if (dateTo) {
        webQuery = webQuery.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data: webOrders, error: webError } = await webQuery

      if (regularError) {
        console.error('Supabase error (regular orders):', regularError)
      }
      if (webError) {
        console.error('Supabase error (web orders):', webError)
      }

      // Format regular orders
      const formattedRegularOrders = (regularOrders || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        payment_method: order.payment_method,
        total: order.total,
        subtotal: order.subtotal,
        discount: order.discount,
        platform_id: order.platform_id,
        order_source: 'pos',
        created_at: order.created_at,
        updated_at: order.updated_at,
        order_items_count: order.order_items?.[0]?.count || 0
      }))

      // Format web orders
      const formattedWebOrders = (webOrders || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        payment_method: null,
        total: order.total_amount,
        subtotal: order.subtotal,
        discount: order.discount ?? 0,
        shipping_fee: order.shipping_fee,
        status: order.status,
        platform_id: 'website',
        order_source: 'website',
        created_at: order.created_at,
        updated_at: order.updated_at,
        order_items_count: order.web_order_items?.[0]?.count || 0
      }))

      // Combine and sort by date
      const allOrders = [...formattedRegularOrders, ...formattedWebOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log('Formatted orders:', allOrders)
      setOrders(allOrders)
    } catch (err: any) {
      console.error('Exception fetching orders:', err)
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchOrders()
  }

  const handleReset = () => {
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
    fetchOrders()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getPlatformName = (platformId: string | null | undefined) => {
    if (!platformId) return 'ไม่ระบุ'
    // First check if it's a UUID in platformsMap
    if (platformsMap[platformId]) {
      return platformsMap[platformId]
    }
    // Fall back to SALES_CHANNELS code mapping
    return SALES_CHANNELS[platformId] || platformId
  }

  const getPaymentMethodName = (paymentMethod: string | null | undefined) => {
    if (!paymentMethod) return '-'
    return PAYMENT_METHODS[paymentMethod] || paymentMethod
  }

  const handleViewOrder = async (orderId: string, orderSource?: string) => {
    setLoadingDetail(true)
    try {
      // Check if this is a web order
      const isWebOrder = orderSource === 'website'
      
      const tableName = isWebOrder ? 'web_orders' : 'orders'
      const itemsTableName = isWebOrder ? 'web_order_items' : 'order_items'
      const orderIdColumn = isWebOrder ? 'web_order_id' : 'order_id'
      
      const { data: order, error: orderError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) {
        console.error('Error fetching order:', orderError)
        alert('ไม่สามารถโหลดข้อมูลออเดอร์ได้')
        return
      }

      const { data: items, error: itemsError } = await supabase
        .from(itemsTableName)
        .select('*')
        .eq(orderIdColumn, orderId)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
      }

      // Merge duplicate items by product_id
      const itemMap = new Map<string, any>()
      items?.forEach((item: any) => {
        const key = item.product_id
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)
          existing.quantity += item.quantity
          existing.total_price += item.total_price
          existing.discount = (existing.discount || 0) + (item.discount || 0)
        } else {
          itemMap.set(key, { ...item })
        }
      })
      const mergedItems = Array.from(itemMap.values())

      setSelectedOrder({
        ...order,
        order_source: orderSource || 'pos',
        order_items: mergedItems || []
      })
      setShowDetailModal(true)
    } catch (err: any) {
      console.error('Exception viewing order:', err)
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedOrder(null)
  }

  const handleDeleteOrder = async (orderId: string, orderSource?: string) => {
    if (!confirm('ต้องการลบออเดอร์นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      return
    }

    try {
      const isWebOrder = orderSource === 'website'
      const itemsTable = isWebOrder ? 'web_order_items' : 'order_items'
      const orderTable = isWebOrder ? 'web_orders' : 'orders'
      const orderIdColumn = isWebOrder ? 'web_order_id' : 'order_id'
      
      console.log('Deleting order:', orderId, 'isWebOrder:', isWebOrder)
      console.log('Tables:', itemsTable, orderTable, 'Column:', orderIdColumn)
      
      // Delete order items first (due to foreign key constraint)
      const { data: deletedItems, error: itemsError } = await supabase
        .from(itemsTable)
        .delete()
        .eq(orderIdColumn, orderId)
        .select()

      console.log('Deleted items:', deletedItems, 'Error:', itemsError)

      if (itemsError) {
        console.error('Error deleting order items:', itemsError)
        alert('ไม่สามารถลบรายการสินค้าในออเดอร์ได้: ' + itemsError.message)
        return
      }

      // Delete order
      const { data: deletedOrder, error: orderError } = await supabase
        .from(orderTable)
        .delete()
        .eq('id', orderId)
        .select()

      console.log('Deleted order:', deletedOrder, 'Error:', orderError)

      if (orderError) {
        console.error('Error deleting order:', orderError)
        alert('ไม่สามารถลบออเดอร์ได้: ' + orderError.message)
        return
      }

      if (!deletedOrder || deletedOrder.length === 0) {
        console.error('No order was deleted - order may not exist')
        alert('ไม่พบออเดอร์ที่ต้องการลบ')
        return
      }

      alert('ลบออเดอร์สำเร็จ')
      await fetchOrders() // Refresh the orders list
      console.log('Orders refreshed, count:', orders.length)
    } catch (err: any) {
      console.error('Exception deleting order:', err)
      alert('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  // Print receipt for an order
  const handlePrintReceipt = async (orderId: string, orderSource?: string) => {
    try {
      const isWebOrder = orderSource === 'website'
      const tableName = isWebOrder ? 'web_orders' : 'orders'
      const itemsTableName = isWebOrder ? 'web_order_items' : 'order_items'
      
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (orderError || !order) {
        alert('ไม่พบข้อมูลออเดอร์')
        return
      }

      // Fetch order items with product details
      const { data: items, error: itemsError } = await supabase
        .from(itemsTableName)
        .select(`
          *,
          product:products(name_th)
        `)
        .eq(isWebOrder ? 'web_order_id' : 'order_id', orderId)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        alert('ไม่สามารถโหลดรายการสินค้าได้')
        return
      }

      // Calculate totals
      const subtotal = items?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0
      const discount = order.discount || 0
      const total = order.total || order.total_amount || subtotal - discount

      // Generate receipt content
      const receiptContent = `
        <div style="font-family: monospace; width: 80mm; padding: 10px;">
          <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <h2 style="margin: 0; font-size: 18px;">MORE DRUGSTORE</h2>
            <p style="margin: 5px 0; font-size: 12px;">ใบเสร็จรับเงิน / Receipt</p>
            <p style="margin: 5px 0; font-size: 11px;">เลขที่: ${order.order_number}</p>
            <p style="margin: 5px 0; font-size: 11px;">${new Date(order.created_at).toLocaleString('th-TH')}</p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <p style="margin: 3px 0; font-size: 11px;">ลูกค้า: ${order.customer_name || 'ลูกค้าทั่วไป'}</p>
            ${order.customer_tax_id ? `<p style="margin: 3px 0; font-size: 11px;">เลขประจำตัวผู้เสียภาษี: ${order.customer_tax_id}</p>` : ''}
            <p style="margin: 3px 0; font-size: 11px;">ช่องทาง: ${getPlatformName(order.platform_id)}</p>
          </div>
          
          <div style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            ${items?.map((item: any) => {
              const isFree = item.unit_price === 0
              return `
              <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px;">
                <span>${isFree ? '🎁 ของแถม: ' : ''}${item.product?.name_th || item.product_name || 'สินค้า'} x${item.quantity}</span>
                <span>${isFree ? 'ฟรี' : '฿' + (item.total_price || 0).toFixed(2)}</span>
              </div>
            `}).join('')}
          </div>
          
          <div style="text-align: right; margin-bottom: 10px;">
            <p style="margin: 3px 0; font-size: 12px;">ยอดรวม: ฿${subtotal.toFixed(2)}</p>
            ${discount > 0 ? `<p style="margin: 3px 0; font-size: 12px;">ส่วนลด: ฿${discount.toFixed(2)}</p>` : ''}
            <p style="margin: 5px 0; font-size: 16px; font-weight: bold;">ยอดชำระ: ฿${total.toFixed(2)}</p>
          </div>
          
          <div style="text-align: center; border-top: 1px dashed #000; padding-top: 10px; font-size: 11px;">
            <p style="margin: 5px 0;">ขอบคุณที่ใช้บริการ</p>
            <p style="margin: 5px 0;">Thank you for your purchase</p>
          </div>
        </div>
      `
      
      // Open print window
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>ใบเสร็จรับเงิน - ${order.order_number}</title>
              <style>
                @media print {
                  body { margin: 0; }
                  * { -webkit-print-color-adjust: exact !important; }
                }
              </style>
            </head>
            <body>${receiptContent}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    } catch (err: any) {
      console.error('Error printing receipt:', err)
      alert('เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ')
    }
  }

  // Convert receipt to tax invoice and print
  const handleConvertToTaxInvoice = async (orderId: string, orderSource?: string) => {
    try {
      const isWebOrder = orderSource === 'website'
      const tableName = isWebOrder ? 'web_orders' : 'orders'
      const itemsTableName = isWebOrder ? 'web_order_items' : 'order_items'
      
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (orderError || !order) {
        alert('ไม่พบข้อมูลออเดอร์')
        return
      }

      // Prompt for customer tax information if not already present
      let customerTaxId = order.customer_tax_id || ''
      let customerAddress = order.customer_address || ''
      
      if (!customerTaxId) {
        customerTaxId = prompt('กรุณากรอกเลขประจำตัวผู้เสียภาษีของลูกค้า:') || ''
        if (!customerTaxId) {
          alert('กรุณากรอกเลขประจำตัวผู้เสียภาษีเพื่อออกใบกำกับภาษี')
          return
        }
      }
      
      if (!customerAddress && order.customer_name) {
        customerAddress = prompt('กรุณากรอกที่อยู่ลูกค้า (สำหรับใบกำกับภาษี):') || ''
      }

      // Generate tax invoice number (TI-YYYYMMDD-XXX format)
      const today = new Date()
      const yy = String(today.getFullYear()).slice(-2)
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const datePrefix = `TI${yy}${mm}${dd}`
      
      // Check existing tax invoice numbers for today
      const { data: existingTi } = await supabase
        .from('tax_invoices')
        .select('tax_invoice_number')
        .ilike('tax_invoice_number', `${datePrefix}-%`)
        .order('tax_invoice_number', { ascending: false })
        .limit(1)
      
      let sequence = 1
      if (existingTi && existingTi.length > 0) {
        const lastNumber = existingTi[0].tax_invoice_number
        const lastSequence = parseInt(lastNumber.split('-')[1]) || 0
        sequence = lastSequence + 1
      }
      
      const taxInvoiceNumber = `${datePrefix}-${String(sequence).padStart(3, '0')}`

      // Save tax invoice record
      const { error: tiError } = await supabase
        .from('tax_invoices')
        .insert([{
          order_id: orderId,
          order_source: isWebOrder ? 'web' : 'pos',
          tax_invoice_number: taxInvoiceNumber,
          customer_name: order.customer_name || 'ลูกค้าทั่วไป',
          customer_tax_id: customerTaxId,
          customer_address: customerAddress,
          total_amount: order.total || order.total_amount,
          vat_amount: (order.total || order.total_amount) * 0.07 / 1.07,
          created_at: new Date().toISOString()
        }])

      if (tiError) {
        console.error('Error saving tax invoice:', tiError)
      }

      // Update order with tax information
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          customer_tax_id: customerTaxId,
          customer_address: customerAddress,
          tax_invoice_number: taxInvoiceNumber,
          document_type: 'tax_invoice'
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('Error updating order:', updateError)
      }

      // Fetch order items
      const { data: items, error: itemsError } = await supabase
        .from(itemsTableName)
        .select(`
          *,
          product:products(name_th)
        `)
        .eq(isWebOrder ? 'web_order_id' : 'order_id', orderId)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
      }

      // Calculate VAT
      const totalAmount = order.total || order.total_amount || 0
      const vatAmount = totalAmount * 0.07 / 1.07
      const baseAmount = totalAmount - vatAmount

      // Fetch shop settings
      const { data: shopData } = await supabase
        .from('shop_settings')
        .select('name, address, tax_id, phone')
        .single()

      const shopName = shopData?.name || 'ห้างหุ้นส่วนจำกัด สะอางพาณิชย์'
      const shopAddress = shopData?.address || ''
      const shopTaxId = shopData?.tax_id || ''
      const shopPhone = shopData?.phone || ''

      // Generate professional tax invoice content matching the example format
      const taxInvoiceContent = `
        <div style="font-family: 'TH Sarabun New', 'Angsana New', sans-serif; width: 210mm; min-height: 297mm; padding: 15px; font-size: 14px; box-sizing: border-box;">
          <!-- Header Section -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <!-- Logo/Company Info -->
              <td style="width: 60%; vertical-align: top;">
                <div style="border: 2px solid #333; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                  <span style="font-size: 12px; text-align: center; color: #666;">Logo</span>
                </div>
                <p style="margin: 3px 0; font-size: 13px; font-weight: bold;">${shopName}</p>
                <p style="margin: 3px 0; font-size: 12px;">${shopAddress}</p>
                <p style="margin: 3px 0; font-size: 12px;">เลขประจำตัวผู้เสียภาษี: ${shopTaxId}</p>
                <p style="margin: 3px 0; font-size: 12px;">โทร: ${shopPhone}</p>
              </td>
              <!-- Invoice Details -->
              <td style="width: 40%; vertical-align: top; text-align: right;">
                <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">ใบกำกับภาษี/ใบเสร็จรับเงิน</h2>
                <p style="margin: 3px 0; font-size: 11px; color: #666;">ต้นฉบับ (เอกสารออกเป็นคู่ฉบับ)</p>
                <table style="width: 100%; margin-top: 10px; font-size: 12px;">
                  <tr>
                    <td style="text-align: left; padding: 2px 0;">เลขที่</td>
                    <td style="text-align: right; padding: 2px 0;">${taxInvoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 2px 0;">วันที่</td>
                    <td style="text-align: right; padding: 2px 0;">${new Date().toLocaleDateString('th-TH')}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 2px 0;">ครบกำหนด</td>
                    <td style="text-align: right; padding: 2px 0;">${new Date().toLocaleDateString('th-TH')}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding: 2px 0;">อ้างอิง</td>
                    <td style="text-align: right; padding: 2px 0;">${order.order_number}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Customer Section -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <td style="padding: 10px; vertical-align: top; width: 50%; border-right: 1px solid #333;">
                <p style="margin: 3px 0; font-size: 12px; color: #666;">ลูกค้า</p>
                <p style="margin: 5px 0; font-size: 13px; font-weight: bold;">${order.customer_name || 'ลูกค้าทั่วไป'}</p>
                <p style="margin: 3px 0; font-size: 12px;">${customerAddress || '-'}</p>
                <p style="margin: 3px 0; font-size: 12px;">เลขประจำตัวผู้เสียภาษี: ${customerTaxId}</p>
              </td>
              <td style="padding: 10px; vertical-align: top; width: 50%;">
                <p style="margin: 3px 0; font-size: 12px; color: #666;">เรื่อง</p>
                <p style="margin: 5px 0; font-size: 13px;">ขายสินค้า</p>
                <p style="margin: 10px 0 3px 0; font-size: 12px; color: #666;">เรื่อง</p>
                <p style="margin: 3px 0; font-size: 12px;">-</p>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-bottom: 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 5%; font-size: 12px;">#</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: left; width: 35%; font-size: 12px;">รายละเอียด</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 10%; font-size: 12px;">จำนวน</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 10%; font-size: 12px;">หน่วย</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 15%; font-size: 12px;">ราคาต่อหน่วย</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 12%; font-size: 12px;">ส่วนลด</th>
                <th style="border: 1px solid #333; padding: 8px; text-align: right; width: 13%; font-size: 12px;">มูลค่า</th>
              </tr>
            </thead>
            <tbody>
              ${items?.map((item: any, index: number) => {
                const itemTotal = item.total_price || 0
                const unitPrice = item.quantity > 0 ? itemTotal / item.quantity : 0
                return `
                  <tr>
                    <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">${index + 1}</td>
                    <td style="border: 1px solid #333; padding: 6px; font-size: 12px;">${item.product?.name_th || item.product_name || 'สินค้า'}</td>
                    <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">${item.quantity}</td>
                    <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 12px;">ชิ้น</td>
                    <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${unitPrice.toFixed(2)}</td>
                    <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">-</td>
                    <td style="border: 1px solid #333; padding: 6px; text-align: right; font-size: 12px;">${itemTotal.toFixed(2)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <!-- Totals Section -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; border-top: none;">
            <tr>
              <td style="width: 50%; border-right: 1px solid #333; padding: 10px; vertical-align: top; font-size: 11px;">
                <p style="margin: 3px 0;">(หนึ่งหมื่นห้าพันสองร้อยห้าสิบบาทถ้วน)</p>
                <p style="margin: 10px 0 3px 0; font-weight: bold;">หมายเหตุ</p>
                <p style="margin: 3px 0;">1. กรุณาตรวจสอบสินค้าและจำนวนให้ถูกต้องก่อนรับสินค้า</p>
                <p style="margin: 3px 0;">2. สินค้าที่ขายแล้วไม่รับคืน</p>
              </td>
              <td style="width: 50%; padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">รวมเป็นเงิน</td>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd; width: 120px;">${totalAmount.toFixed(2)} บาท</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">ภาษีมูลค่าเพิ่ม 7%</td>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">${vatAmount.toFixed(2)} บาท</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">ราคาไม่รวมภาษีมูลค่าเพิ่ม</td>
                    <td style="padding: 6px 10px; text-align: right; font-size: 12px; border-bottom: 1px solid #ddd;">${baseAmount.toFixed(2)} บาท</td>
                  </tr>
                  <tr style="background-color: #f5f5f5;">
                    <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: bold; border-top: 2px solid #333;">จำนวนเงินรวมทั้งสิ้น</td>
                    <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: bold; border-top: 2px solid #333;">${totalAmount.toFixed(2)} บาท</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Payment Section -->
          <table style="width: 100%; border: 1px solid #333; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 10px; vertical-align: top; width: 60%;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">ชำระเงินโดย:</p>
                <div style="font-size: 12px;">
                  <span style="margin-right: 15px;"><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> เงินสด</span>
                  <span style="margin-right: 15px;"><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> เช็ค</span>
                  <span style="margin-right: 15px;"><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> โอนเงิน</span>
                  <span><span style="border: 1px solid #333; display: inline-block; width: 12px; height: 12px; margin-right: 3px; vertical-align: middle;"></span> บัตรเครดิต</span>
                </div>
                <table style="width: 100%; margin-top: 10px; font-size: 11px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px; border: 1px solid #ddd; width: 30%;">ธนาคาร</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">เลขที่</td>
                    <td style="padding: 4px; border: 1px solid #ddd; width: 25%;">วันที่</td>
                    <td style="padding: 4px; border: 1px solid #ddd; width: 25%;">จำนวนเงิน</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                    <td style="padding: 4px; border: 1px solid #ddd;">&nbsp;</td>
                  </tr>
                </table>
              </td>
              <td style="padding: 10px; vertical-align: top; width: 40%; text-align: center;">
                <p style="margin: 0 0 5px 0; font-size: 11px; color: #666;">ขอแสดงความนับถือ</p>
                <div style="margin-top: 40px;">
                  <p style="margin: 0; font-size: 12px;">_____________________</p>
                  <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้จ่ายเงิน</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Footer Section -->
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="width: 35%; text-align: center; vertical-align: top; padding: 10px;">
                <p style="margin: 0; font-size: 12px;">_____________________</p>
                <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้จ่ายเงิน</p>
              </td>
              <td style="width: 30%; text-align: center; vertical-align: middle; padding: 10px;">
                <div style="border: 2px solid #0066cc; border-radius: 50%; width: 100px; height: 100px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #0066cc; font-weight: bold;">
                  <span style="font-size: 11px; text-align: center;">ตราบริษัท<br/>Saang</span>
                </div>
              </td>
              <td style="width: 35%; text-align: center; vertical-align: top; padding: 10px;">
                <p style="margin: 0; font-size: 12px;">_____________________</p>
                <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้รับเงิน</p>
                <p style="margin: 3px 0 0 0; font-size: 11px; color: #666;">${new Date().toLocaleDateString('th-TH')}</p>
              </td>
            </tr>
          </table>
        </div>
      `
      
      // Open print window
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>ใบกำกับภาษี - ${taxInvoiceNumber}</title>
              <style>
                @media print {
                  body { margin: 0; }
                  * { -webkit-print-color-adjust: exact !important; }
                }
              </style>
            </head>
            <body>${taxInvoiceContent}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
      
      alert('ออกใบกำกับภาษีเรียบร้อยแล้ว: ' + taxInvoiceNumber)
      fetchOrders() // Refresh to show updated status
    } catch (err: any) {
      console.error('Error converting to tax invoice:', err)
      alert('เกิดข้อผิดพลาดในการออกใบกำกับภาษี')
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesOrderNumber = order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCustomerName = order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    // Check if any order items contain the search term in product_name
    const matchesProductName = order.order_items?.some((item: OrderItem) => 
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return matchesOrderNumber || matchesCustomerName || matchesProductName
  })

  const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = filteredOrders.length

  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListOrdered className="h-7 w-7 text-[#7D735F]" />
            รายการขาย
          </h1>
          <p className="text-gray-600 mt-1">รายการขายและยอดขายรวม</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
          className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
          title="คู่มือการใช้งาน"
        >
          <BookOpen className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-4 sm:px-0">
        <Card className="bg-[#F5E6C8]/30 border-[#F5E6C8]">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#8B7355] flex items-center justify-center shadow-sm">
              <ListOrdered className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-[#8B7355]">จำนวนรายการขาย</p>
              <p className="text-2xl font-bold text-[#5C4A32]">{totalOrders.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[#B8D4E3]/30 border-[#B8D4E3]">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#2E5266] flex items-center justify-center shadow-sm">
              <ListOrdered className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-[#2E5266]">ยอดขายรวม</p>
              <p className="text-2xl font-bold text-[#2E5266]">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 px-4 sm:px-0 bg-[#F5EFE6] border-[#E8E0D5]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 border border-transparent focus-within:border-[#B8D4E3] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B8D4E3]/30 transition-all">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">ค้นหา</span>
              <input
                type="text"
                placeholder="เลขที่ออเดอร์, ชื่อลูกค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm min-w-0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              จากวันที่
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              ถึงวันที่
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSearch}>
              ค้นหา
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              รีเซ็ต
            </Button>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="px-4 sm:px-0 bg-white border-[#E8E0D5]">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ListOrdered className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>ไม่พบรายการขาย</p>
          </div>
        ) : (
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F5EFE6]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลขที่ออเดอร์
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ช่องทาง
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วิธีชำระ
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวนรายการ
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ยอดรวม
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ดูรายละเอียด
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E8E0D5]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F5EFE6]/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-[#C5C9E8] text-[#4A5568] text-xs rounded-full">
                        {getPlatformName(order.platform_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {order.customer_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-[#C5D5C8] text-[#5C4A32] text-xs rounded-full">
                        {getPaymentMethodName(order.payment_method)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {order.order_items_count} รายการ
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Button variant="secondary" size="sm" onClick={() => handleViewOrder(order.id, order.order_source)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={() => {
                            setEditingOrderId(order.id)
                            setEditingOrderSource(order.order_source as 'pos' | 'website')
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          แก้ไข
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handlePrintReceipt(order.id, order.order_source)}
                          title="พิมพ์ใบเสร็จ"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={() => handleConvertToTaxInvoice(order.id, order.order_source)}
                          title="ออกใบกำกับภาษี"
                          className="bg-[#7D735F] hover:bg-[#6B6351]"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          ใบกำกับภาษี
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteOrder(order.id, order.order_source)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  รายละเอียดออเดอร์ {selectedOrder.order_number}
                </h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {loadingDetail ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6D96A6] mx-auto"></div>
                  <p className="text-sm text-[#6D96A6]/70 mt-2">กำลังโหลด...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 bg-[#F0E4D6]/50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-[#CCBAA5]">วันที่</p>
                      <p className="font-medium text-[#6D96A6]">{formatDate(selectedOrder.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ช่องทาง</p>
                      <p className="font-medium">{getPlatformName(selectedOrder.platform_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ลูกค้า</p>
                      <p className="font-medium">{selectedOrder.customer_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">วิธีชำระ</p>
                      <p className="font-medium">{getPaymentMethodName(selectedOrder.payment_method)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">สถานะ</p>
                      <p className="font-medium">{selectedOrder.is_cancelled ? 'ยกเลิก' : 'สำเร็จ'}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">รายการสินค้า</h3>
                    {selectedOrder.order_items?.length === 0 ? (
                      <p className="text-sm text-gray-500">ไม่พบรายการสินค้า</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left">สินค้า</th>
                            <th className="px-3 py-2 text-right">จำนวน</th>
                            <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                            <th className="px-3 py-2 text-right">รวม</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedOrder.order_items?.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">{item.product_name || 'สินค้า'}</td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">รวมก่อนลด</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ส่วนลด</span>
                      <span className="text-red-600">-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>ยอดรวม</span>
                      <span className="text-blue-600">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end pt-4">
                    <Button onClick={closeDetailModal}>
                      ปิด
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Edit Modal - Add key to force remount */}
      {editingOrderId && (
        <OrderEditModal
          key={editingOrderId}
          orderId={editingOrderId}
          orderSource={editingOrderSource}
          onClose={() => {
            setEditingOrderId(null)
            setEditingOrderSource('pos')
          }}
          onSave={async () => {
            setEditingOrderId(null)
            setEditingOrderSource('pos')
            await fetchOrders() // Refresh orders list
            // Also refresh order detail if it's showing the edited order
            if (showDetailModal && selectedOrder?.id === editingOrderId) {
              // Clear first then refetch to ensure fresh data
              setSelectedOrder(null)
              setTimeout(() => handleViewOrder(editingOrderId, editingOrderSource), 500)
            }
          }}
        />
      )}
    </div>
  )
}
