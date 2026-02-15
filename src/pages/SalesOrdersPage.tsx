import { useState, useEffect } from 'react'
import { ListOrdered, Search, Calendar, Eye, Edit, Trash2, Receipt, BookOpen } from 'lucide-react'
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
      
      let query = supabase
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
        query = query.gte('created_at', dateFrom + 'T00:00:00')
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data, error } = await query

      console.log('Supabase response:', { data, error, count: data?.length })

      if (error) {
        console.error('Supabase error:', error)
        alert('ไม่สามารถโหลดรายการขายได้: ' + error.message)
        return
      }

      if (!data || data.length === 0) {
        console.log('No orders found in database')
        setOrders([])
        return
      }

      const formattedOrders = data?.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        payment_method: order.payment_method,
        total: order.total,
        subtotal: order.subtotal,
        discount: order.discount,
        platform_id: order.platform_id,
        created_at: order.created_at,
        updated_at: order.updated_at,
        order_items_count: order.order_items?.[0]?.count || 0
      })) || []

      console.log('Formatted orders:', formattedOrders)
      setOrders(formattedOrders)
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

  const handleViewOrder = async (orderId: string) => {
    setLoadingDetail(true)
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) {
        console.error('Error fetching order:', orderError)
        alert('ไม่สามารถโหลดข้อมูลออเดอร์ได้')
        return
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

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

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('ต้องการลบออเดอร์นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      return
    }

    try {
      // Delete order items first (due to foreign key constraint)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('Error deleting order items:', itemsError)
        alert('ไม่สามารถลบรายการสินค้าในออเดอร์ได้')
        return
      }

      // Delete order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (orderError) {
        console.error('Error deleting order:', orderError)
        alert('ไม่สามารถลบออเดอร์ได้')
        return
      }

      alert('ลบออเดอร์สำเร็จ')
      fetchOrders() // Refresh the orders list
    } catch (err: any) {
      console.error('Exception deleting order:', err)
      alert('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  // Print receipt for an order
  const handlePrintReceipt = async (orderId: string) => {
    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (orderError || !order) {
        alert('ไม่พบข้อมูลออเดอร์')
        return
      }

      // Fetch order items with product details
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(name_th)
        `)
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        alert('ไม่สามารถโหลดรายการสินค้าได้')
        return
      }

      // Calculate totals
      const subtotal = items?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0
      const discount = order.discount || 0
      const total = order.total || subtotal - discount

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
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#7D735F] flex items-center justify-center shadow-sm">
              <ListOrdered className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">จำนวนรายการขาย</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#A67B5B] flex items-center justify-center shadow-sm">
              <ListOrdered className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">ยอดขายรวม</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 px-4 sm:px-0 bg-white border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="h-4 w-4 inline mr-1" />
              ค้นหา
            </label>
            <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-2.5 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                type="text"
                placeholder="เลขที่ออเดอร์, ชื่อลูกค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm"
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
      <Card className="px-4 sm:px-0 bg-white border-gray-200">
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
              <thead className="bg-gray-50">
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
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {getPlatformName(order.platform_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {order.customer_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
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
                        <Button variant="secondary" size="sm" onClick={() => handleViewOrder(order.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={() => setEditingOrderId(order.id)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          แก้ไข
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handlePrintReceipt(order.id)}
                          title="พิมพ์ใบเสร็จ"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteOrder(order.id)}
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
          onClose={() => setEditingOrderId(null)}
          onSave={async () => {
            setEditingOrderId(null)
            await fetchOrders() // Refresh orders list
            // Also refresh order detail if it's showing the edited order
            if (showDetailModal && selectedOrder?.id === editingOrderId) {
              // Clear first then refetch to ensure fresh data
              setSelectedOrder(null)
              setTimeout(() => handleViewOrder(editingOrderId), 500)
            }
          }}
        />
      )}
    </div>
  )
}
