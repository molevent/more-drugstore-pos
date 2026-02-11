import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { AlertTriangle, Calendar, Search, Package, History } from 'lucide-react'

interface BatchWithProduct {
  id: string
  batch_number: string
  lot_number: string
  expiry_date: string
  quantity: number
  supplier: string
  product_id: string
  product_name: string
  product_barcode: string
  product_unit: string
}

interface StockMovement {
  id: string
  product_id: string
  movement_type: string
  quantity: number
  quantity_before: number
  quantity_after: number
  reason: string
  movement_date: string
}

export default function NearExpiryReportPage() {
  const [batches, setBatches] = useState<BatchWithProduct[]>([])
  const [filteredBatches, setFilteredBatches] = useState<BatchWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(30)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<BatchWithProduct | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [showMovementModal, setShowMovementModal] = useState(false)

  useEffect(() => {
    fetchNearExpiryBatches()
  }, [daysFilter])

  useEffect(() => {
    filterBatches()
  }, [batches, searchTerm])

  const fetchNearExpiryBatches = async () => {
    setLoading(true)
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() + daysFilter)

      const { data, error } = await supabase
        .from('stock_batches')
        .select(`
          id,
          batch_number,
          lot_number,
          expiry_date,
          quantity,
          supplier,
          product_id,
          products:product_id (name_th, barcode, unit_of_measure)
        `)
        .lte('expiry_date', cutoffDate.toISOString().split('T')[0])
        .gt('quantity', 0)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true })

      if (error) throw error

      const formattedBatches: BatchWithProduct[] = (data || []).map((batch: any) => ({
        id: batch.id,
        batch_number: batch.batch_number,
        lot_number: batch.lot_number,
        expiry_date: batch.expiry_date,
        quantity: batch.quantity,
        supplier: batch.supplier,
        product_id: batch.product_id,
        product_name: batch.products?.name_th || 'Unknown',
        product_barcode: batch.products?.barcode || '',
        product_unit: batch.products?.unit_of_measure || 'ชิ้น'
      }))

      setBatches(formattedBatches)
    } catch (error) {
      console.error('Error fetching near expiry batches:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBatches = () => {
    if (!searchTerm.trim()) {
      setFilteredBatches(batches)
      return
    }

    const filtered = batches.filter(batch =>
      batch.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.product_barcode.includes(searchTerm) ||
      batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredBatches(filtered)
  }

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getExpiryStatus = (days: number) => {
    if (days <= 0) return { color: 'bg-red-100 text-red-700 border-red-200', text: 'หมดอายุแล้ว', urgent: true }
    if (days <= 7) return { color: 'bg-red-100 text-red-700 border-red-200', text: 'เหลือน้อยมาก', urgent: true }
    if (days <= 14) return { color: 'bg-orange-100 text-orange-700 border-orange-200', text: 'เหลือน้อย', urgent: false }
    if (days <= 30) return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', text: 'ใกล้หมดอายุ', urgent: false }
    return { color: 'bg-green-100 text-green-700 border-green-200', text: 'ปกติ', urgent: false }
  }

  const fetchMovements = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('movement_date', { ascending: false })
        .limit(20)

      if (error) throw error
      setMovements(data || [])
    } catch (error) {
      console.error('Error fetching movements:', error)
    }
  }

  const handleViewMovements = (batch: BatchWithProduct) => {
    setSelectedBatch(batch)
    fetchMovements(batch.product_id)
    setShowMovementModal(true)
  }

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      purchase: 'รับเข้า',
      sale: 'ขายออก',
      adjustment: 'ปรับยอด',
      return: 'รับคืน',
      supplier_return: 'คืนซัพพลายเออร์',
      expired: 'หมดอายุ',
      damaged: 'เสียหาย',
      transfer: 'โอนย้าย'
    }
    return types[type] || type
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-orange-500" />
            รายงานสินค้าใกล้หมดอายุ
          </h1>
          <p className="text-gray-600 mt-1">แสดงสินค้าที่ใกล้หมดอายุตามจำนวนวันที่กำหนด</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">หมดอายุในอีก:</span>
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value={7}>7 วัน</option>
            <option value={14}>14 วัน</option>
            <option value={30}>30 วัน</option>
            <option value={60}>60 วัน</option>
            <option value={90}>90 วัน</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">หมดอายุแล้ว</p>
              <p className="text-2xl font-bold text-red-700">
                {filteredBatches.filter(b => getDaysUntilExpiry(b.expiry_date) <= 0).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-600">เหลือ ≤ 7 วัน</p>
              <p className="text-2xl font-bold text-orange-700">
                {filteredBatches.filter(b => {
                  const days = getDaysUntilExpiry(b.expiry_date)
                  return days > 0 && days <= 7
                }).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">เหลือ ≤ 14 วัน</p>
              <p className="text-2xl font-bold text-yellow-700">
                {filteredBatches.filter(b => {
                  const days = getDaysUntilExpiry(b.expiry_date)
                  return days > 7 && days <= 14
                }).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">รายการทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-700">{filteredBatches.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วยชื่อสินค้า บาร์โค้ด หรือหมายเลข Batch..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
            />
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">ไม่พบสินค้าที่ใกล้หมดอายุในช่วง {daysFilter} วัน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">สินค้า</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Batch/Lot</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">วันหมดอายุ</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">เหลือ (วัน)</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">จำนวน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ซัพพลายเออร์</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBatches.map((batch) => {
                  const daysUntil = getDaysUntilExpiry(batch.expiry_date)
                  const status = getExpiryStatus(daysUntil)
                  return (
                    <tr key={batch.id} className={status.urgent ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{batch.product_name}</p>
                          <p className="text-sm text-gray-500">{batch.product_barcode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{batch.batch_number}</p>
                          {batch.lot_number && (
                            <p className="text-sm text-gray-500">Lot: {batch.lot_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900">
                          {new Date(batch.expiry_date).toLocaleDateString('th-TH')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${status.color}`}>
                          {daysUntil <= 0 ? 'หมดอายุ' : `${daysUntil} วัน`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {batch.quantity} {batch.product_unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{batch.supplier || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewMovements(batch)}
                          className="flex items-center gap-1"
                        >
                          <History className="h-4 w-4" />
                          ประวัติ
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Movement History Modal */}
      {showMovementModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">ประวัติการเคลื่อนไหว</h3>
                <p className="text-sm text-gray-600">
                  {selectedBatch.product_name} (Batch: {selectedBatch.batch_number})
                </p>
              </div>
              <button
                onClick={() => setShowMovementModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {movements.length === 0 ? (
                <p className="text-center text-gray-600 py-8">ไม่มีประวัติการเคลื่อนไหว</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((movement) => (
                    <div key={movement.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            movement.quantity > 0 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {getMovementTypeLabel(movement.movement_type)}
                          </span>
                          <p className="text-sm text-gray-900 mt-1">
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity} {selectedBatch.product_unit}
                          </p>
                          {movement.reason && (
                            <p className="text-xs text-gray-600">{movement.reason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">
                            {new Date(movement.movement_date).toLocaleDateString('th-TH')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {movement.quantity_before} → {movement.quantity_after}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
