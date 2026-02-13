import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Receipt,
  FileText,
  ChevronLeft,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock
} from 'lucide-react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_tax_id: string
  total: number
  receipt_requested: boolean
  receipt_printed: boolean
  tax_invoice_requested: boolean
  tax_invoice_printed: boolean
  created_at: string
}

export default function ReceiptTaxInvoiceReportPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'receipt' | 'tax_invoice'>('all')
  const [status, setStatus] = useState<'all' | 'requested' | 'printed'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [filter, status])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .or('receipt_requested.eq.true,tax_invoice_requested.eq.true')
        .order('created_at', { ascending: false })

      if (filter === 'receipt') {
        query = query.eq('receipt_requested', true)
      } else if (filter === 'tax_invoice') {
        query = query.eq('tax_invoice_requested', true)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error

      let filteredData = data || []
      
      if (status === 'requested') {
        filteredData = filteredData.filter(o => 
          (o.receipt_requested && !o.receipt_printed) ||
          (o.tax_invoice_requested && !o.tax_invoice_printed)
        )
      } else if (status === 'printed') {
        filteredData = filteredData.filter(o => 
          o.receipt_printed || o.tax_invoice_printed
        )
      }

      if (searchTerm) {
        filteredData = filteredData.filter(o =>
          o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      setOrders(filteredData)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsPrinted = async (orderId: string, type: 'receipt' | 'tax_invoice') => {
    try {
      const updateData = type === 'receipt' 
        ? { receipt_printed: true }
        : { tax_invoice_printed: true }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error marking as printed:', error)
      alert('เกิดข้อผิดพลาดในการอัพเดตสถานะ')
    }
  }

  const getStatusBadge = (order: Order) => {
    const badges = []
    
    if (order.receipt_requested) {
      badges.push(
        <span key="receipt" className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
          order.receipt_printed 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {order.receipt_printed ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          ใบเสร็จ{order.receipt_printed ? ' (พิมพ์แล้ว)' : ' (รอพิมพ์)'}
        </span>
      )
    }
    
    if (order.tax_invoice_requested) {
      badges.push(
        <span key="tax" className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
          order.tax_invoice_printed 
            ? 'bg-green-100 text-green-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {order.tax_invoice_printed ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          ใบกำกับภาษี{order.tax_invoice_printed ? ' (พิมพ์แล้ว)' : ' (รอพิมพ์)'}
        </span>
      )
    }
    
    return <div className="flex flex-wrap gap-1">{badges}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/settings"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-7 w-7 text-[#7D735F]" />
              รายงานใบเสร็จและใบกำกับภาษี
            </h1>
            <p className="text-gray-600 mt-1">ตรวจสอบรายการที่ลูกค้าขอใบเสร็จหรือใบกำกับภาษี</p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={fetchOrders}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="receipt">ใบเสร็จรับเงิน</option>
              <option value="tax_invoice">ใบกำกับภาษี</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="requested">รอพิมพ์</option>
              <option value="printed">พิมพ์แล้ว</option>
            </select>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขออเดอร์หรือชื่อลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchOrders()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">ไม่พบรายการ</p>
            <p className="text-sm text-gray-500 mt-1">ยังไม่มีลูกค้าขอใบเสร็จหรือใบกำกับภาษี</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขออเดอร์</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ลูกค้า</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ยอดรวม</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-900">{order.customer_name || 'ไม่ระบุ'}</p>
                        {order.customer_tax_id && (
                          <p className="text-xs text-gray-500">Tax ID: {order.customer_tax_id}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">฿{order.total?.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {order.receipt_requested && !order.receipt_printed && (
                          <button
                            onClick={() => markAsPrinted(order.id, 'receipt')}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="พิมพ์ใบเสร็จ"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        )}
                        {order.tax_invoice_requested && !order.tax_invoice_printed && (
                          <button
                            onClick={() => markAsPrinted(order.id, 'tax_invoice')}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title="พิมพ์ใบกำกับภาษี"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Summary */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">ขอใบเสร็จ</p>
                <p className="text-2xl font-bold text-blue-900">
                  {orders.filter(o => o.receipt_requested).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">ขอใบกำกับภาษี</p>
                <p className="text-2xl font-bold text-green-900">
                  {orders.filter(o => o.tax_invoice_requested).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-600">รอพิมพ์</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {orders.filter(o => 
                    (o.receipt_requested && !o.receipt_printed) ||
                    (o.tax_invoice_requested && !o.tax_invoice_printed)
                  ).length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
