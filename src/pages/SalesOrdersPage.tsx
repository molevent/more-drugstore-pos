import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListOrdered, Search, Calendar, Eye, Edit } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { supabase } from '../services/supabase'

interface SalesOrder {
  id: string
  order_number: string
  customer_name?: string
  payment_method_name?: string
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

export default function SalesOrdersPage() {
  const navigate = useNavigate()
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

  useEffect(() => {
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
          payment_method_name,
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
    return SALES_CHANNELS[platformId] || platformId
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
        .select(`
          *,
          products(name)
        `)
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
      }

      setSelectedOrder({
        ...order,
        order_items: items || []
      })
      setShowDetailModal(true)
    } catch (err: any) {
      console.error('Exception viewing order:', err)
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleEditOrder = (orderId: string) => {
    console.log('Navigating to edit order:', orderId)
    navigate(`/pos?edit=${orderId}`)
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedOrder(null)
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
            <ListOrdered className="h-7 w-7 text-blue-600" />
            ยอดขาย/รายงาน
          </h1>
          <p className="text-gray-600 mt-1">รายการขายและยอดขายรวม</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-4 sm:px-0">
        <Card className="bg-white border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
              <ListOrdered className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">จำนวนรายการขาย</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center shadow-sm">
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
          <div className="overflow-x-auto">
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
                        {order.payment_method_name || '-'}
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
                        <Button variant="primary" size="sm" onClick={() => handleEditOrder(order.id)}>
                          <Edit className="h-4 w-4 mr-1" />
                          แก้ไข
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
                      <p className="font-medium">{selectedOrder.payment_method_name || '-'}</p>
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
                              <td className="px-3 py-2">{item.product_name || item.products?.name || 'สินค้า'}</td>
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
    </div>
  )
}
