import { useState, useRef, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { ScanLine, Package, CheckCircle, AlertCircle, Save, Trash2, Plus, Barcode, Calculator, FileSpreadsheet } from 'lucide-react'

interface StockCheckItem {
  id: string
  product_id: string
  barcode: string
  name_th: string
  unit_of_measure: string
  system_quantity: number
  counted_quantity: number
  difference: number
  value_difference: number
  cost_price: number
}

interface StockCheckSession {
  id: string
  session_name: string
  created_at: string
  total_items: number
  total_difference: number
  status: 'in_progress' | 'completed'
}

export default function StockCheckReportPage() {
  const [scanInput, setScanInput] = useState('')
  const [countInput, setCountInput] = useState('')
  const [checkedItems, setCheckedItems] = useState<StockCheckItem[]>([])
  const [sessions, setSessions] = useState<StockCheckSession[]>([])
  const [loading, setLoading] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [viewMode, setViewMode] = useState<'scan' | 'sessions'>('scan')
  const [lastScannedProduct, setLastScannedProduct] = useState<StockCheckItem | null>(null)

  const scanInputRef = useRef<HTMLInputElement>(null)
  const countInputRef = useRef<HTMLInputElement>(null)
  const isScanningRef = useRef(false)
  const lastScanTimeRef = useRef(0)

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    // Auto-focus scan input when in scan mode
    if (viewMode === 'scan' && scanInputRef.current) {
      scanInputRef.current.focus()
    }
  }, [viewMode])

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_check_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const processBarcodeScan = async (barcode: string) => {
    // Timestamp-based debounce: prevent scan within 1000ms of last scan
    const now = Date.now()
    if (!barcode || isScanningRef.current || (now - lastScanTimeRef.current < 1000)) {
      console.log('Scan blocked:', { barcode, isScanning: isScanningRef.current, timeSinceLast: now - lastScanTimeRef.current })
      return
    }

    console.log('Processing scan:', barcode)
    const currentBarcode = barcode
    
    // Clear input immediately to prevent duplicate processing
    setScanInput('')
    
    lastScanTimeRef.current = now
    isScanningRef.current = true
    setLoading(true)
    try {
      // Find product by barcode or SKU
      const { data: products, error } = await supabase
        .from('products')
        .select('id, barcode, sku, name_th, unit_of_measure, stock_quantity, cost_price')
        .or(`barcode.eq.${currentBarcode},sku.eq.${currentBarcode}`)
        .limit(1)

      if (error) throw error

      if (!products || products.length === 0) {
        alert('ไม่พบสินค้าในระบบ')
        return
      }

      const product = products[0]

      // Check if already scanned in current session
      const existingItem = checkedItems.find(item => item.product_id === product.id)
      if (existingItem) {
        // Continuous mode: add 1 to existing count
        const newCount = existingItem.counted_quantity + 1
        setCheckedItems(items => items.map(item => {
          if (item.id === existingItem.id) {
            const difference = newCount - item.system_quantity
            return {
              ...item,
              counted_quantity: newCount,
              difference,
              value_difference: difference * item.cost_price
            }
          }
          return item
        }))
        setLastScannedProduct(existingItem)
        // Play beep sound or visual feedback
        setCountInput(newCount.toString())
        // Auto clear and focus back to scan input after short delay
        setTimeout(() => {
          setCountInput('')
          scanInputRef.current?.focus()
        }, 500)
      } else {
        // New item: default count is 1
        const newItem: StockCheckItem = {
          id: crypto.randomUUID(),
          product_id: product.id,
          barcode: product.barcode,
          name_th: product.name_th,
          unit_of_measure: product.unit_of_measure || 'ชิ้น',
          system_quantity: product.stock_quantity,
          counted_quantity: 1,
          difference: 1 - product.stock_quantity,
          value_difference: (1 - product.stock_quantity) * (product.cost_price || 0),
          cost_price: product.cost_price || 0
        }
        setCheckedItems([newItem, ...checkedItems])
        setLastScannedProduct(newItem)
        setCountInput('1')
        // Auto clear and focus back to scan input after short delay
        setTimeout(() => {
          setCountInput('')
          scanInputRef.current?.focus()
        }, 500)
      }

      // Focus count input after scan
      setTimeout(() => countInputRef.current?.focus(), 100)
    } catch (error) {
      console.error('Error scanning product:', error)
      alert('เกิดข้อผิดพลาดในการค้นหาสินค้า')
    } finally {
      setLoading(false)
      // Clear scanning flag after a short delay to prevent double triggers
      setTimeout(() => {
        isScanningRef.current = false
      }, 300)
    }
  }

  const handleCountSubmit = () => {
    if (!lastScannedProduct || countInput === '') return

    const count = parseInt(countInput)
    if (isNaN(count) || count < 0) {
      alert('กรุณาระบุจำนวนที่ถูกต้อง')
      return
    }

    setCheckedItems(items => items.map(item => {
      if (item.id === lastScannedProduct.id) {
        const difference = count - item.system_quantity
        return {
          ...item,
          counted_quantity: count,
          difference,
          value_difference: difference * item.cost_price
        }
      }
      return item
    }))

    setCountInput('')
    setLastScannedProduct(null)
    // Focus back to scan input
    setTimeout(() => scanInputRef.current?.focus(), 100)
  }

  const handleDeleteItem = (itemId: string) => {
    if (!confirm('ต้องการลบรายการนี้?')) return
    setCheckedItems(items => items.filter(item => item.id !== itemId))
  }

  const handleSaveSession = async () => {
    if (!sessionName.trim()) {
      alert('กรุณาระบุชื่อรอบการตรวจนับ')
      return
    }

    if (checkedItems.length === 0) {
      alert('ไม่มีข้อมูลสำหรับบันทึก')
      return
    }

    setLoading(true)
    try {
      // Calculate totals
      const totalDifference = checkedItems.reduce((sum, item) => sum + item.difference, 0)
      const totalValueDifference = checkedItems.reduce((sum, item) => sum + item.value_difference, 0)

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('stock_check_sessions')
        .insert({
          session_name: sessionName,
          total_items: checkedItems.length,
          total_difference: totalDifference,
          total_value_difference: totalValueDifference,
          status: 'completed'
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Insert check items
      const { error: itemsError } = await supabase
        .from('stock_check_items')
        .insert(
          checkedItems.map(item => ({
            session_id: session.id,
            product_id: item.product_id,
            barcode: item.barcode,
            name_th: item.name_th,
            system_quantity: item.system_quantity,
            counted_quantity: item.counted_quantity,
            difference: item.difference,
            value_difference: item.value_difference,
            unit_of_measure: item.unit_of_measure
          }))
        )

      if (itemsError) throw itemsError

      alert('บันทึกรอบการตรวจนับเรียบร้อย')
      setCheckedItems([])
      setSessionName('')
      setShowSaveModal(false)
      fetchSessions()
      setViewMode('sessions')
    } catch (error) {
      console.error('Error saving session:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const getDifferenceStyle = (difference: number) => {
    if (difference === 0) return 'text-gray-600'
    if (difference > 0) return 'text-green-600'
    return 'text-red-600'
  }

  const getDifferenceBadge = (difference: number) => {
    if (difference === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          ตรง
        </span>
      )
    }
    if (difference > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Plus className="h-3 w-3 mr-1" />
          +{difference}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertCircle className="h-3 w-3 mr-1" />
        {difference}
      </span>
    )
  }

  const exportToCSV = () => {
    if (checkedItems.length === 0) return

    const headers = 'บาร์โค้ด,ชื่อสินค้า,หน่วย,สต็อกระบบ,นับจริง,ผลต่าง,มูลค่าผลต่าง'
    const rows = checkedItems.map(item => 
      `${item.barcode},"${item.name_th}",${item.unit_of_measure},${item.system_quantity},${item.counted_quantity},${item.difference},${item.value_difference.toFixed(2)}`
    ).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock_check_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScanLine className="h-7 w-7 text-blue-600" />
            รายงานเช็คสต็อก
          </h1>
          <p className="text-gray-600 mt-1">ยิงบาร์โค้ด นับสินค้า และเปรียบเทียบกับสต็อกในระบบ</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'scan' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('scan')}
          >
            <Barcode className="h-4 w-4 mr-1" />
            เริ่มนับ
          </Button>
          <Button
            variant={viewMode === 'sessions' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('sessions')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            ประวัติ
          </Button>
        </div>
      </div>

      {viewMode === 'scan' ? (
        <>
          {/* Scan Section */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Barcode className="h-4 w-4 inline mr-1" />
                  สแกนบาร์โค้ด / รหัสสินค้า
                </label>
                <form onSubmit={(e) => { e.preventDefault(); processBarcodeScan(scanInput); }}>
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="สแกนหรือพิมพ์บาร์โค้ดแล้วกด Enter..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                    disabled={loading}
                  />
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading || !scanInput.trim()}
                    className="mt-2 w-full"
                  >
                    {loading ? 'กำลังค้นหา...' : 'ค้นหาสินค้า'}
                  </Button>
                </form>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calculator className="h-4 w-4 inline mr-1" />
                  จำนวนที่นับได้
                </label>
                <input
                  ref={countInputRef}
                  type="number"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCountSubmit()}
                  placeholder="ระบุจำนวน..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                  disabled={!lastScannedProduct}
                  min="0"
                />
                <Button
                  variant="primary"
                  onClick={handleCountSubmit}
                  disabled={!lastScannedProduct || countInput === ''}
                  className="mt-2 w-full"
                >
                  บันทึกจำนวน
                </Button>
              </div>
            </div>

            {lastScannedProduct && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">สินค้าล่าสุด:</p>
                <p className="font-medium text-gray-900">{lastScannedProduct.name_th}</p>
                <p className="text-sm text-gray-600">
                  สต็อกระบบ: {lastScannedProduct.system_quantity} {lastScannedProduct.unit_of_measure}
                </p>
              </div>
            )}
          </Card>

          {/* Summary Cards */}
          {checkedItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">รายการที่นับ</p>
                    <p className="text-2xl font-bold text-blue-700">{checkedItems.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600">ตรงกับระบบ</p>
                    <p className="text-2xl font-bold text-green-700">
                      {checkedItems.filter(i => i.difference === 0).length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-red-600">ไม่ตรงกับระบบ</p>
                    <p className="text-2xl font-bold text-red-700">
                      {checkedItems.filter(i => i.difference !== 0).length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calculator className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-600">มูลค่าผลต่าง</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      ฿{checkedItems.reduce((sum, i) => sum + i.value_difference, 0).toFixed(0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Results Table */}
          {checkedItems.length > 0 && (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">รายการตรวจนับ ({checkedItems.length})</h3>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={exportToCSV}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowSaveModal(true)}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    บันทึกรอบนับ
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">สินค้า</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">สต็อกระบบ</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">นับจริง</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">ผลต่าง</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">มูลค่าผลต่าง</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {checkedItems.map((item) => (
                      <tr key={item.id} className={item.difference !== 0 ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.name_th}</p>
                            <p className="text-sm text-gray-500">{item.barcode}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-900">
                            {item.system_quantity} {item.unit_of_measure}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-blue-600">
                            {item.counted_quantity} {item.unit_of_measure}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getDifferenceBadge(item.difference)}
                        </td>
                        <td className={`px-4 py-3 text-right ${getDifferenceStyle(item.value_difference)}`}>
                          ฿{item.value_difference.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        /* Sessions List */
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">ประวัติรอบการตรวจนับ</h3>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <ScanLine className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">ไม่มีประวัติรอบการตรวจนับ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{session.session_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(session.created_at).toLocaleDateString('th-TH')} {' '}
                        {new Date(session.created_at).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{session.total_items} รายการ</p>
                      <p className={`text-sm font-medium ${session.total_difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ผลต่าง: {session.total_difference > 0 ? '+' : ''}{session.total_difference}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">บันทึกรอบการตรวจนับ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อรอบการตรวจนับ</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="เช่น ตรวจนับประจำเดือน มกราคม 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="text-gray-600">สรุปรายการ:</p>
                <ul className="mt-1 space-y-1 text-gray-700">
                  <li>• จำนวนรายการ: {checkedItems.length}</li>
                  <li>• ตรงกับระบบ: {checkedItems.filter(i => i.difference === 0).length}</li>
                  <li>• ไม่ตรงกับระบบ: {checkedItems.filter(i => i.difference !== 0).length}</li>
                  <li>• มูลค่าผลต่างรวม: ฿{checkedItems.reduce((sum, i) => sum + i.value_difference, 0).toFixed(2)}</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleSaveSession}
                disabled={loading}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowSaveModal(false)}
                disabled={loading}
              >
                ยกเลิก
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
