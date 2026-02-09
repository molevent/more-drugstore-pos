import { useState, useEffect } from 'react'
import { ClipboardList, Search, Package, User, Calendar } from 'lucide-react'
import Card from '../components/common/Card'
import { supabase } from '../services/supabase'

interface StockAdjustment {
  id: string
  product_id: string
  quantity_change: number
  previous_stock: number
  new_stock: number
  reason?: string
  transaction_type: string
  created_at: string
  user_id?: string
  user?: { full_name: string; email: string }[]
  product?: { name_th: string; name_en?: string; barcode?: string; base_price: number }[]
}

export default function StockAdjustmentReportPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalAdjustments, setTotalAdjustments] = useState(0)

  useEffect(() => {
    fetchAdjustments()
  }, [dateFrom, dateTo])

  const fetchAdjustments = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('stock_transactions')
        .select(`
          id,
          product_id,
          quantity_change,
          previous_stock,
          new_stock,
          reason,
          transaction_type,
          created_at,
          user_id,
          user:users(full_name, email),
          product:products(name_th, name_en, barcode, base_price)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      // Apply date filters if provided
      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00')
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data, error } = await query

      if (error) {
        // Silently handle missing table
        if (error.code === '42P01' || error.message?.includes('stock_transactions')) {
          console.log('stock_transactions table not found')
          setAdjustments([])
          setTotalAdjustments(0)
          return
        }
        throw error
      }

      setAdjustments(data || [])
      setTotalAdjustments(data?.length || 0)
    } catch (err: any) {
      console.error('Error fetching stock adjustments:', err)
      setAdjustments([])
    } finally {
      setLoading(false)
    }
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

  const filteredAdjustments = adjustments.filter(adj => {
    const productName = adj.product?.[0]?.name_th || ''
    const productNameEn = adj.product?.[0]?.name_en || ''
    const barcode = adj.product?.[0]?.barcode || ''
    const userName = adj.user?.[0]?.full_name || ''
    const userEmail = adj.user?.[0]?.email || ''
    
    return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           productNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
           barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
           userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-[#7D735F]" />
            รายงานการปรับยอดสต็อก
          </h1>
          <p className="text-gray-600 mt-1">รายการปรับยอดสต็อกสินค้าทั้งหมด พร้อมผู้ดำเนินการและเหตุผล</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 px-4 sm:px-0">
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#7D735F] flex items-center justify-center shadow-sm">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">จำนวนรายการปรับยอด</p>
              <p className="text-2xl font-bold text-gray-900">{totalAdjustments.toLocaleString()}</p>
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
                placeholder="ชื่อสินค้า, บาร์โค้ด, ผู้ใช้งาน..."
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              ถึงวันที่
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="px-4 sm:px-0 bg-white border-gray-200">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>ไม่พบรายการปรับยอดสต็อก</p>
            <p className="text-sm text-gray-400 mt-1">ระบบจะบันทึกเมื่อมีการปรับยอดสต็อก</p>
          </div>
        ) : (
          <div className="min-w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่/เวลา
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สินค้า
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวนเปลี่ยนแปลง
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สต็อกก่อน
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สต็อกหลัง
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ประเภท
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เหตุผล
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้ดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(adj.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {adj.product?.[0]?.name_th || '-'}
                      </div>
                      {adj.product?.[0]?.barcode && (
                        <div className="text-xs text-gray-500">
                          บาร์โค้ด: {adj.product[0].barcode}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded-full ${
                        adj.quantity_change > 0 
                          ? 'text-green-700 bg-green-100' 
                          : adj.quantity_change < 0 
                            ? 'text-red-700 bg-red-100' 
                            : 'text-gray-700 bg-gray-100'
                      }`}>
                        {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {adj.previous_stock}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${
                        adj.new_stock < 0 ? 'text-red-600 font-bold' : 'text-gray-900'
                      }`}>
                        {adj.new_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {adj.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      {adj.reason || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        {adj.user?.[0]?.full_name || adj.user?.[0]?.email || adj.user_id || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
