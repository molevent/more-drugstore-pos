import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { AlertTriangle, Search, Calendar, ArrowLeft, Download, Filter, DollarSign, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AbnormalOrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  base_price: number
  discount: number
  total_price: number
  price_difference: number
  is_free: boolean
  is_price_edited: boolean
}

interface AbnormalOrder {
  id: string
  order_number: string
  created_at: string
  customer_name?: string
  platform_name?: string
  payment_method?: string
  total: number
  subtotal: number
  discount: number
  item_count: number
  has_price_edit: boolean
  has_free_items: boolean
  total_discount_amount: number
  items: AbnormalOrderItem[]
}

export default function AbnormalOrdersReportPage() {
  const [orders, setOrders] = useState<AbnormalOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<AbnormalOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'price_edited' | 'free_items' | 'high_discount'>('all')

  useEffect(() => {
    fetchAbnormalOrders()
  }, [dateFrom, dateTo])

  useEffect(() => {
    applyFilters()
  }, [orders, searchTerm, filterType])

  const fetchAbnormalOrders = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch orders with items and product base prices
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          customer_name,
          total,
          subtotal,
          discount,
          payment_method,
          platform:platforms(name),
          items:order_items(
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            discount,
            total_price,
            product:products(base_price)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500)

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00')
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data: ordersData, error: ordersError } = await query

      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        setError('ไม่สามารถโหลดข้อมูลออเดอร์ได้')
        return
      }

      // Process orders to identify abnormal items
      const processedOrders: AbnormalOrder[] = (ordersData || []).map((order: any) => {
        const items: AbnormalOrderItem[] = (order.items || []).map((item: any) => {
          const basePrice = item.product?.[0]?.base_price || item.unit_price
          const priceDifference = item.unit_price - basePrice
          const isFree = item.total_price === 0 || item.unit_price === 0
          const isPriceEdited = Math.abs(priceDifference) > 0.01 || item.discount > 0
          
          return {
            id: item.id,
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            base_price: basePrice,
            discount: item.discount,
            total_price: item.total_price,
            price_difference: priceDifference,
            is_free: isFree,
            is_price_edited: isPriceEdited
          }
        }).filter((item: AbnormalOrderItem) => item.is_price_edited || item.is_free)

        const hasPriceEdit = items.some(item => item.is_price_edited && !item.is_free)
        const hasFreeItems = items.some(item => item.is_free)
        const totalDiscountAmount = items.reduce((sum: number, item: AbnormalOrderItem) => {
          if (item.is_free) return sum + (item.base_price * item.quantity)
          if (item.is_price_edited) return sum + (item.price_difference * item.quantity)
          return sum
        }, 0)

        return {
          id: order.id,
          order_number: order.order_number,
          created_at: order.created_at,
          customer_name: order.customer_name,
          platform_name: order.platform?.[0]?.name,
          payment_method: order.payment_method,
          total: order.total,
          subtotal: order.subtotal,
          discount: order.discount,
          item_count: items.length,
          has_price_edit: hasPriceEdit,
          has_free_items: hasFreeItems,
          total_discount_amount: totalDiscountAmount,
          items: items
        }
      }).filter(order => order.items.length > 0)

      setOrders(processedOrders)
      setFilteredOrders(processedOrders)
    } catch (err) {
      console.error('Exception fetching orders:', err)
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orders]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.items.some(item => item.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Type filter
    if (filterType === 'price_edited') {
      filtered = filtered.filter(o => o.has_price_edit)
    } else if (filterType === 'free_items') {
      filtered = filtered.filter(o => o.has_free_items)
    } else if (filterType === 'high_discount') {
      filtered = filtered.filter(o => o.total_discount_amount > 100)
    }

    setFilteredOrders(filtered)
  }

  const handleReset = () => {
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
    setFilterType('all')
  }

  const handleExport = () => {
    const csvContent = [
      ['เลขที่ออเดอร์', 'วันที่', 'ลูกค้า', 'สินค้า', 'ประเภท', 'ราคาขาย', 'ราคาปกติ', 'ส่วนลด', 'จำนวน', 'ยอดเสียหาย'].join(','),
      ...filteredOrders.flatMap(order => 
        order.items.map(item => [
          order.order_number,
          new Date(order.created_at).toLocaleDateString('th-TH'),
          order.customer_name || '-',
          `"${item.product_name}"`,
          item.is_free ? 'แถมฟรี' : 'แก้ไขราคา',
          item.unit_price,
          item.base_price,
          item.discount,
          item.quantity,
          item.is_free ? (item.base_price * item.quantity) : (item.price_difference * item.quantity)
        ].join(','))
      )
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `abnormal-orders-report-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOrderTypeLabel = (order: AbnormalOrder) => {
    if (order.has_free_items && order.has_price_edit) {
      return { label: 'แก้ไขราคา + แถมฟรี', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
    } else if (order.has_free_items) {
      return { label: 'มีของแถม', color: 'bg-purple-100 text-purple-700', icon: Gift }
    } else {
      return { label: 'แก้ไขราคา', color: 'bg-amber-100 text-amber-700', icon: DollarSign }
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
        <div className="flex items-center gap-3">
          <Link to="/settings">
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              กลับ
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-7 w-7 text-[#D4756A]" />
              รายงานออเดอร์ไม่ปกติ
            </h1>
            <p className="text-gray-600 mt-1">ตรวจสอบออเดอร์ที่มีการแก้ไขราคา หรือมีของแถม</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 px-4 sm:px-0">
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#D4756A] flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">ออเดอร์ไม่ปกติทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.length.toLocaleString()} รายการ</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#7D735F] flex items-center justify-center shadow-sm">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">แก้ไขราคา</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredOrders.filter(o => o.has_price_edit).length.toLocaleString()} รายการ
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#B8C9B8] flex items-center justify-center shadow-sm">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">มีของแถม</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredOrders.filter(o => o.has_free_items).length.toLocaleString()} รายการ
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#A67B5B] flex items-center justify-center shadow-sm">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">ยอดเสียหายรวม</p>
              <p className="text-2xl font-bold text-gray-900">
                ฿{filteredOrders.reduce((sum, o) => sum + o.total_discount_amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 px-4 sm:px-0 bg-white border-[#B8C9B8] shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="h-4 w-4 inline mr-1" />
              ค้นหา
            </label>
            <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-2.5 border border-transparent focus-within:border-[#7D735F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B8C9B8] transition-all">
              <input
                type="text"
                placeholder="เลขที่ออเดอร์, ชื่อลูกค้า, สินค้า..."
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="h-4 w-4 inline mr-1" />
              ประเภท
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-[#B8C9B8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D735F] bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="price_edited">แก้ไขราคา</option>
              <option value="free_items">มีของแถม</option>
              <option value="high_discount">ส่วนลดสูง</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={fetchAbnormalOrders}>
              <Filter className="h-4 w-4 mr-1" />
              ค้นหา
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              รีเซ็ต
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              ส่งออก CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Orders List */}
      <div className="space-y-4 px-4 sm:px-0">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D735F] mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-500">
            <p>{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-[#B8C9B8]" />
            <p>ไม่พบออเดอร์ที่ไม่ปกติ</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const typeInfo = getOrderTypeLabel(order)
            const TypeIcon = typeInfo.icon
            const isExpanded = expandedOrder === order.id
            
            return (
              <Card key={order.id} className="bg-white border-[#B8C9B8] shadow-sm overflow-hidden">
                <div 
                  className="p-4 cursor-pointer hover:bg-[#F5F0E6] transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${typeInfo.color} flex items-center justify-center`}>
                        <TypeIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.created_at)} · {order.customer_name || 'ไม่ระบุลูกค้า'} · {order.platform_name || 'ไม่ระบุช่องทาง'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">฿{order.total.toLocaleString()}</p>
                      <p className="text-sm text-red-600">
                        -฿{order.total_discount_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">รายการสินค้าที่ไม่ปกติ</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">ราคาขาย</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">ราคาปกติ</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">ยอดเสียหาย</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 text-right">
                              {item.is_free ? 'ฟรี' : `฿${item.unit_price.toLocaleString()}`}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 text-right">
                              ฿{item.base_price.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm text-red-600 text-right">
                              {item.is_free 
                                ? `฿${(item.base_price * item.quantity).toLocaleString()}`
                                : `฿${(item.price_difference * item.quantity).toLocaleString()}`
                              }
                            </td>
                            <td className="px-3 py-2 text-center">
                              {item.is_free ? (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">แถมฟรี</span>
                              ) : (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">แก้ไขราคา</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
