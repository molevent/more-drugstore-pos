import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { ArrowRightLeft, Search, Calendar, Package, Warehouse, ArrowLeft, Download, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'

interface StockTransfer {
  id: string
  product_id: string
  from_warehouse_id: string
  to_warehouse_id: string
  quantity: number
  notes: string
  transfer_date: string
  created_at: string
  product?: { name_th: string; name_en?: string; barcode?: string }
  from_warehouse?: { name: string; code: string }
  to_warehouse?: { name: string; code: string }
  created_by?: { email?: string; raw_user_meta_data?: { name?: string } }
}

interface WarehouseType {
  id: string
  name: string
  code: string
}

export default function StockTransferReportPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [filteredTransfers, setFilteredTransfers] = useState<StockTransfer[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedFromWarehouse, setSelectedFromWarehouse] = useState('')
  const [selectedToWarehouse, setSelectedToWarehouse] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [transfers, searchTerm, dateFrom, dateTo, selectedFromWarehouse, selectedToWarehouse])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch transfers with related data
      const { data: transfersData, error: transfersError } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          product:products(id, name_th, name_en, barcode),
          from_warehouse:warehouses!from_warehouse_id(id, name, code),
          to_warehouse:warehouses!to_warehouse_id(id, name, code)
        `)
        .order('transfer_date', { ascending: false })
        .limit(1000)

      if (transfersError) {
        console.error('Error fetching transfers:', transfersError)
        setError('ไม่สามารถโหลดข้อมูลการโอนสินค้าได้')
        return
      }

      // Fetch warehouses
      const { data: warehousesData } = await supabase
        .from('warehouses')
        .select('*')
        .order('is_main', { ascending: false })

      setTransfers(transfersData || [])
      setFilteredTransfers(transfersData || [])
      setWarehouses(warehousesData || [])
    } catch (err) {
      console.error('Exception fetching data:', err)
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...transfers]

    // Search by product name or barcode
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.product?.name_th?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.product?.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.product?.barcode?.includes(searchTerm)
      )
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.transfer_date) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.transfer_date) <= new Date(dateTo + 'T23:59:59'))
    }

    // Warehouse filters
    if (selectedFromWarehouse) {
      filtered = filtered.filter(t => t.from_warehouse_id === selectedFromWarehouse)
    }
    if (selectedToWarehouse) {
      filtered = filtered.filter(t => t.to_warehouse_id === selectedToWarehouse)
    }

    setFilteredTransfers(filtered)
  }

  const handleReset = () => {
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
    setSelectedFromWarehouse('')
    setSelectedToWarehouse('')
  }

  const handleExport = () => {
    const csvContent = [
      ['วันที่', 'สินค้า', 'บาร์โค้ด', 'จากคลัง', 'ไปคลัง', 'จำนวน', 'หมายเหตุ'].join(','),
      ...filteredTransfers.map(t => [
        new Date(t.transfer_date).toLocaleDateString('th-TH'),
        `"${t.product?.name_th || '-'}"`,
        t.product?.barcode || '-',
        `"${t.from_warehouse?.name || '-'}"`,
        `"${t.to_warehouse?.name || '-'}"`,
        t.quantity,
        `"${t.notes || '-'}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock-transfer-report-${new Date().toISOString().split('T')[0]}.csv`
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

  return (
    <div className="min-h-screen bg-white">
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
              <ArrowRightLeft className="h-7 w-7 text-[#7D735F]" />
              รายงานการโอนสินค้าระหว่างคลัง
            </h1>
            <p className="text-gray-600 mt-1">ตรวจสอบและติดตามการเคลื่อนย้ายสินค้าระหว่างคลัง</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 px-4 sm:px-0">
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#7D735F] flex items-center justify-center shadow-sm">
              <ArrowRightLeft className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">จำนวนการโอนทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">{filteredTransfers.length.toLocaleString()} รายการ</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#B8C9B8] flex items-center justify-center shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">จำนวนสินค้าที่โอน</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredTransfers.reduce((sum, t) => sum + t.quantity, 0).toLocaleString()} ชิ้น
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-[#B8C9B8] shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-[#A67B5B] flex items-center justify-center shadow-sm">
              <Warehouse className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">จำนวนคลังที่มีการโอน</p>
              <p className="text-2xl font-bold text-gray-900">{warehouses.length} คลัง</p>
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
              ค้นหาสินค้า
            </label>
            <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-2.5 border border-transparent focus-within:border-[#7D735F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B8C9B8] transition-all">
              <input
                type="text"
                placeholder="ชื่อสินค้า, บาร์โค้ด..."
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
              <Warehouse className="h-4 w-4 inline mr-1" />
              จากคลัง
            </label>
            <select
              value={selectedFromWarehouse}
              onChange={(e) => setSelectedFromWarehouse(e.target.value)}
              className="w-full px-3 py-2 border border-[#B8C9B8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D735F] bg-white"
            >
              <option value="">ทั้งหมด</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Warehouse className="h-4 w-4 inline mr-1" />
              ไปคลัง
            </label>
            <select
              value={selectedToWarehouse}
              onChange={(e) => setSelectedToWarehouse(e.target.value)}
              className="w-full px-3 py-2 border border-[#B8C9B8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D735F] bg-white"
            >
              <option value="">ทั้งหมด</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={fetchData}>
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

      {/* Transfers Table */}
      <Card className="px-4 sm:px-0 bg-white border-[#B8C9B8] shadow-sm">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D735F] mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-500">
            <p>{error}</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ArrowRightLeft className="h-16 w-16 mx-auto mb-4 text-[#B8C9B8]" />
            <p>ไม่พบรายการโอนสินค้า</p>
          </div>
        ) : (
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-[#B8C9B8]">
              <thead className="bg-[#F5F0E6]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7D735F] uppercase tracking-wider">
                    วันที่โอน
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7D735F] uppercase tracking-wider">
                    สินค้า
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7D735F] uppercase tracking-wider">
                    บาร์โค้ด
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7D735F] uppercase tracking-wider">
                    จากคลัง
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7D735F] uppercase tracking-wider">
                    ไปคลัง
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#7D735F] uppercase tracking-wider">
                    จำนวน
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7D735F] uppercase tracking-wider">
                    หมายเหตุ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#B8C9B8]">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-[#F5F0E6] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transfer.transfer_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transfer.product?.name_th || '-'}</div>
                      {transfer.product?.name_en && (
                        <div className="text-xs text-gray-500">{transfer.product.name_en}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {transfer.product?.barcode || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {transfer.from_warehouse?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {transfer.to_warehouse?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {transfer.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {transfer.notes || '-'}
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
