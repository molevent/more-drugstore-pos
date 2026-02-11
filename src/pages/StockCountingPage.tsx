import { useState, useRef, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { ScanLine, Package, CheckCircle, AlertCircle, Save, Trash2, Plus, Barcode, FileSpreadsheet, Pause, Play, Warehouse, Search, X, ChevronDown } from 'lucide-react'

// Default warehouses (can be moved to database later)
const WAREHOUSES = [
  { id: 'main', name: 'คลังหลัก', is_default: true },
  { id: 'retail', name: 'คลังหน้าร้าน', is_default: false },
  { id: 'online', name: 'คลังออนไลน์', is_default: false },
  { id: 'consignment', name: 'คลังฝากขาย', is_default: false },
]

interface CountingItem {
  id: string
  product_id: string
  barcode: string
  sku: string
  name_th: string
  name_en?: string
  unit_of_measure: string
  system_quantity: number
  counted_quantity: number
  difference: number
  cost_price: number
  value_difference: number
  warehouse_id: string
  warehouse_name: string
}

interface CountingSession {
  id: string
  session_name: string
  warehouse_id: string
  warehouse_name: string
  created_at: string
  updated_at: string
  total_items: number
  matched_items: number
  unmatched_items: number
  total_value_difference: number
  status: 'in_progress' | 'paused' | 'completed'
  items: CountingItem[]
}

export default function StockCountingPage() {
  // Search and input states
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [countInput, setCountInput] = useState('')
  
  // Session states
  const [countingItems, setCountingItems] = useState<CountingItem[]>([])
  const [sessions, setSessions] = useState<CountingSession[]>([])
  const [currentSession, setCurrentSession] = useState<CountingSession | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState(WAREHOUSES[0])
  const [showWarehouseSelector, setShowWarehouseSelector] = useState(false)
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'counting' | 'sessions' | 'report'>('counting')
  const [showNewSessionModal, setShowNewSessionModal] = useState(false)
  const [lastAddedProduct, setLastAddedProduct] = useState<CountingItem | null>(null)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const countInputRef = useRef<HTMLInputElement>(null)

  // Load sessions on mount
  useEffect(() => {
    loadSessionsFromStorage()
  }, [])

  // Auto-focus search input
  useEffect(() => {
    if (viewMode === 'counting' && searchInputRef.current && !showNewSessionModal) {
      searchInputRef.current.focus()
    }
  }, [viewMode, showNewSessionModal])

  // Load sessions from localStorage (can be moved to Supabase later)
  const loadSessionsFromStorage = () => {
    try {
      const saved = localStorage.getItem('stock_counting_sessions')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSessions(parsed)
        // Check for in-progress session
        const inProgress = parsed.find((s: CountingSession) => s.status === 'in_progress')
        if (inProgress) {
          setCurrentSession(inProgress)
          setCountingItems(inProgress.items || [])
          setSessionName(inProgress.session_name)
          setSelectedWarehouse(WAREHOUSES.find(w => w.id === inProgress.warehouse_id) || WAREHOUSES[0])
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  // Save sessions to localStorage
  const saveSessionsToStorage = (updatedSessions: CountingSession[]) => {
    try {
      localStorage.setItem('stock_counting_sessions', JSON.stringify(updatedSessions))
    } catch (error) {
      console.error('Error saving sessions:', error)
    }
  }

  // Search products by barcode or name
  const handleSearch = async () => {
    if (!searchInput.trim()) return

    setLoading(true)
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, barcode, sku, name_th, name_en, unit_of_measure, stock_quantity, cost_price')
        .or(`barcode.ilike.%${searchInput}%,sku.ilike.%${searchInput}%,name_th.ilike.%${searchInput}%`)
        .limit(10)

      if (error) throw error

      if (!products || products.length === 0) {
        alert('ไม่พบสินค้าในระบบ')
        setSearchInput('')
        return
      }

      if (products.length === 1) {
        // Auto-select if only one result
        addProductToCounting(products[0])
      } else {
        // Show results for selection
        setSearchResults(products)
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error('Error searching:', error)
      alert('เกิดข้อผิดพลาดในการค้นหา')
    } finally {
      setLoading(false)
    }
  }

  // Add product to counting list
  const addProductToCounting = (product: any) => {
    // Check if already in list
    const existing = countingItems.find(item => item.product_id === product.id)
    if (existing) {
      setLastAddedProduct(existing)
      setCountInput(existing.counted_quantity.toString())
      alert(`สินค้านี้อยู่ในรายการนับแล้ว (${existing.counted_quantity} ${existing.unit_of_measure})`)
      setSearchInput('')
      setShowSearchResults(false)
      countInputRef.current?.focus()
      return
    }

    const newItem: CountingItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      barcode: product.barcode,
      sku: product.sku,
      name_th: product.name_th,
      name_en: product.name_en,
      unit_of_measure: product.unit_of_measure || 'ชิ้น',
      system_quantity: product.stock_quantity || 0,
      counted_quantity: 0,
      difference: 0 - (product.stock_quantity || 0),
      cost_price: product.cost_price || 0,
      value_difference: (0 - (product.stock_quantity || 0)) * (product.cost_price || 0),
      warehouse_id: selectedWarehouse.id,
      warehouse_name: selectedWarehouse.name,
    }

    setCountingItems(prev => [newItem, ...prev])
    setLastAddedProduct(newItem)
    setSearchInput('')
    setShowSearchResults(false)
    setCountInput('')
    countInputRef.current?.focus()
  }

  // Update counted quantity
  const updateCountedQuantity = (itemId: string, quantity: number) => {
    setCountingItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const difference = quantity - item.system_quantity
        return {
          ...item,
          counted_quantity: quantity,
          difference,
          value_difference: difference * item.cost_price
        }
      }
      return item
    }))
  }

  // Remove item from counting
  const removeItem = (itemId: string) => {
    if (confirm('ยืนยันลบรายการนี้?')) {
      setCountingItems(prev => prev.filter(item => item.id !== itemId))
    }
  }

  // Calculate summary
  const calculateSummary = () => {
    const totalItems = countingItems.length
    const matchedItems = countingItems.filter(item => item.difference === 0).length
    const unmatchedItems = totalItems - matchedItems
    const totalValueDifference = countingItems.reduce((sum, item) => sum + item.value_difference, 0)
    
    return {
      totalItems,
      matchedItems,
      unmatchedItems,
      totalValueDifference,
      overstockItems: countingItems.filter(item => item.difference > 0),
      understockItems: countingItems.filter(item => item.difference < 0)
    }
  }

  // Save session
  const saveSession = () => {
    if (countingItems.length === 0) {
      alert('ไม่มีรายการสินค้าให้บันทึก')
      return
    }

    const name = sessionName || `นับสต็อก ${selectedWarehouse.name} - ${new Date().toLocaleDateString('th-TH')}`
    const summary = calculateSummary()

    const session: CountingSession = {
      id: currentSession?.id || crypto.randomUUID(),
      session_name: name,
      warehouse_id: selectedWarehouse.id,
      warehouse_name: selectedWarehouse.name,
      created_at: currentSession?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_items: summary.totalItems,
      matched_items: summary.matchedItems,
      unmatched_items: summary.unmatchedItems,
      total_value_difference: summary.totalValueDifference,
      status: 'paused',
      items: countingItems
    }

    const updatedSessions = currentSession 
      ? sessions.map(s => s.id === currentSession.id ? session : s)
      : [...sessions, session]

    setSessions(updatedSessions)
    saveSessionsToStorage(updatedSessions)
    setCurrentSession(session)
    
    alert('บันทึกรอบการนับสำเร็จ')
  }

  // Complete session
  const completeSession = () => {
    if (!confirm('ยืนยันการเสร็จสิ้นรอบการนับสต็อก?')) return

    const summary = calculateSummary()
    const completedSession: CountingSession = {
      ...currentSession!,
      status: 'completed',
      updated_at: new Date().toISOString(),
      total_items: summary.totalItems,
      matched_items: summary.matchedItems,
      unmatched_items: summary.unmatchedItems,
      total_value_difference: summary.totalValueDifference,
      items: countingItems
    }

    const updatedSessions = sessions.map(s => 
      s.id === currentSession?.id ? completedSession : s
    )
    
    setSessions(updatedSessions)
    saveSessionsToStorage(updatedSessions)
    setCurrentSession(null)
    setCountingItems([])
    setSessionName('')
    setViewMode('sessions')
    
    alert('รอบการนับสต็อกเสร็จสิ้น')
  }

  // Start new session
  const startNewSession = () => {
    if (currentSession && countingItems.length > 0) {
      if (!confirm('มีรอบการนับที่ยังไม่เสร็จ ต้องการบันทึกก่อนเริ่มใหม่หรือไม่?')) return
      saveSession()
    }
    
    setShowNewSessionModal(true)
  }

  // Confirm new session
  const confirmNewSession = () => {
    setCurrentSession(null)
    setCountingItems([])
    setSessionName('')
    setSelectedWarehouse(WAREHOUSES[0])
    setViewMode('counting')
    setShowNewSessionModal(false)
  }

  // Resume session
  const resumeSession = (session: CountingSession) => {
    setCurrentSession(session)
    setCountingItems(session.items || [])
    setSessionName(session.session_name)
    setSelectedWarehouse(WAREHOUSES.find(w => w.id === session.warehouse_id) || WAREHOUSES[0])
    setViewMode('counting')
  }

  // Export to CSV
  const exportToCSV = () => {
    const summary = calculateSummary()
    const headers = ['บาร์โค้ด', 'SKU', 'ชื่อสินค้า', 'หน่วย', 'สต็อกระบบ', 'นับจริง', 'ผลต่าง', 'ต้นทุน', 'มูลค่าผลต่าง', 'สถานะ', 'คลัง']
    
    const rows = countingItems.map(item => [
      item.barcode,
      item.sku,
      item.name_th,
      item.unit_of_measure,
      item.system_quantity,
      item.counted_quantity,
      item.difference,
      item.cost_price,
      item.value_difference,
      item.difference === 0 ? 'ตรง' : item.difference > 0 ? 'เกิน' : 'ขาด',
      item.warehouse_name
    ])

    // Add summary rows
    rows.push([])
    rows.push(['สรุปรายงาน'])
    rows.push(['จำนวนรายการทั้งหมด', summary.totalItems])
    rows.push(['รายการตรงกับระบบ', summary.matchedItems])
    rows.push(['รายการไม่ตรง', summary.unmatchedItems])
    rows.push(['มูลค่าผลต่างรวม', summary.totalValueDifference])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock-counting-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const summary = calculateSummary()

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6" />
          ระบบนับสต็อกสินค้า
        </h1>
        <p className="text-gray-600">ยิงบาร์โค้ดหรือพิมพ์ชื่อสินค้า นับจำนวน และเปรียบเทียบกับสต็อกระบบ</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={viewMode === 'counting' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('counting')}
          className="flex items-center gap-2"
        >
          <Barcode className="w-4 h-4" />
          นับสต็อก
        </Button>
        <Button
          variant={viewMode === 'sessions' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('sessions')}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          ประวัติรอบนับ
        </Button>
        <Button
          variant={viewMode === 'report' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('report')}
          className="flex items-center gap-2"
          disabled={countingItems.length === 0}
        >
          <FileSpreadsheet className="w-4 h-4" />
          รายงานสรุป
        </Button>
      </div>

      {/* Counting View */}
      {viewMode === 'counting' && (
        <div className="space-y-4">
          {/* Session Info & Controls */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowWarehouseSelector(!showWarehouseSelector)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Warehouse className="w-4 h-4" />
                    <span>{selectedWarehouse.name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showWarehouseSelector && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                      {WAREHOUSES.map(warehouse => (
                        <button
                          key={warehouse.id}
                          onClick={() => {
                            setSelectedWarehouse(warehouse)
                            setShowWarehouseSelector(false)
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${warehouse.id === selectedWarehouse.id ? 'bg-blue-50 text-blue-600' : ''}`}
                        >
                          {warehouse.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {currentSession && (
                  <span className="text-sm text-gray-600">
                    รอบ: {currentSession.session_name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={startNewSession}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  เริ่มใหม่
                </Button>
                <Button
                  variant="secondary"
                  onClick={saveSession}
                  disabled={countingItems.length === 0}
                  className="flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  พักไว้
                </Button>
                <Button
                  variant="primary"
                  onClick={completeSession}
                  disabled={countingItems.length === 0}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  เสร็จสิ้น
                </Button>
              </div>
            </div>
          </Card>

          {/* Search Input */}
          <Card className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    if (e.target.value.length >= 2) {
                      handleSearch()
                    } else {
                      setShowSearchResults(false)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                  placeholder="สแกนบาร์โค้ด หรือพิมพ์ชื่อสินค้า..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-10 max-h-64 overflow-auto">
                    {searchResults.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addProductToCounting(product)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-0"
                      >
                        <div className="font-medium">{product.name_th}</div>
                        <div className="text-sm text-gray-600">
                          บาร์โค้ด: {product.barcode} | SKU: {product.sku} | สต็อก: {product.stock_quantity}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="primary"
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <ScanLine className="w-4 h-4" />
                ค้นหา
              </Button>
            </div>

            {/* Quick Count Input for Last Added */}
            {lastAddedProduct && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">นับจำนวน:</span>
                    <span className="ml-2 font-medium">{lastAddedProduct.name_th}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={countInputRef}
                      type="number"
                      value={countInput}
                      onChange={(e) => setCountInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const qty = parseInt(countInput) || 0
                          updateCountedQuantity(lastAddedProduct.id, qty)
                          setLastAddedProduct(null)
                          setCountInput('')
                          searchInputRef.current?.focus()
                        }
                      }}
                      placeholder="จำนวน"
                      className="w-24 px-3 py-2 border rounded-lg text-center"
                      autoFocus
                    />
                    <span className="text-gray-600">{lastAddedProduct.unit_of_measure}</span>
                    <Button
                      variant="primary"
                      onClick={() => {
                        const qty = parseInt(countInput) || 0
                        updateCountedQuantity(lastAddedProduct.id, qty)
                        setLastAddedProduct(null)
                        setCountInput('')
                        searchInputRef.current?.focus()
                      }}
                    >
                      บันทึก
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Items Table */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">รายการนับสต็อก ({countingItems.length} รายการ)</h3>
              {countingItems.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
            </div>

            {countingItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>ยังไม่มีรายการนับสต็อก</p>
                <p className="text-sm">เริ่มต้นด้วยการสแกนบาร์โค้ดหรือพิมพ์ชื่อสินค้า</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">สินค้า</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">สต็อกระบบ</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">นับจริง</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">ผลต่าง</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">มูลค่าผลต่าง</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">สถานะ</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {countingItems.map(item => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-gray-50 ${item.difference !== 0 ? 'bg-red-50' : 'bg-green-50'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name_th}</div>
                          <div className="text-sm text-gray-500">
                            {item.barcode} | {item.unit_of_measure}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{item.system_quantity}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.counted_quantity}
                            onChange={(e) => updateCountedQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border rounded text-center"
                            min="0"
                          />
                        </td>
                        <td className={`px-4 py-3 text-center font-medium ${
                          item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {item.difference > 0 ? `+${item.difference}` : item.difference}
                        </td>
                        <td className={`px-4 py-3 text-right ${
                          item.value_difference > 0 ? 'text-green-600' : item.value_difference < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {item.value_difference.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.difference === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              <CheckCircle className="w-3 h-3" />
                              ตรง
                            </span>
                          ) : item.difference > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              <Plus className="w-3 h-3" />
                              เกิน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                              <AlertCircle className="w-3 h-3" />
                              ขาด
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Summary Card */}
          {countingItems.length > 0 && (
            <Card className="p-4 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{summary.totalItems}</div>
                  <div className="text-sm text-gray-600">จำนวนรายการ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.matchedItems}</div>
                  <div className="text-sm text-gray-600">ตรงกับระบบ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.unmatchedItems}</div>
                  <div className="text-sm text-gray-600">ไม่ตรง</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${summary.totalValueDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.totalValueDifference.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                  </div>
                  <div className="text-sm text-gray-600">มูลค่าผลต่างรวม</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Sessions View */}
      {viewMode === 'sessions' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">ประวัติรอบการนับสต็อก</h3>
            <Button
              variant="primary"
              onClick={startNewSession}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              เริ่มรอบใหม่
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Save className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>ยังไม่มีประวัติการนับสต็อก</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">{session.session_name}</div>
                    <div className="text-sm text-gray-600">
                      คลัง: {session.warehouse_name} | 
                      รายการ: {session.total_items} | 
                      ตรง: {session.matched_items} | 
                      ไม่ตรง: {session.unmatched_items}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleString('th-TH')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      session.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                      session.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {session.status === 'in_progress' ? 'กำลังนับ' :
                       session.status === 'paused' ? 'พักไว้' : 'เสร็จสิ้น'}
                    </span>
                    {session.status !== 'completed' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => resumeSession(session)}
                        className="flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        ทำต่อ
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Report View */}
      {viewMode === 'report' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">รายงานสรุปการนับสต็อก</h3>
              <Button
                variant="secondary"
                onClick={exportToCSV}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{summary.totalItems}</div>
                <div className="text-sm text-gray-600">รายการทั้งหมด</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{summary.matchedItems}</div>
                <div className="text-sm text-gray-600">ตรงกับระบบ</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">{summary.unmatchedItems}</div>
                <div className="text-sm text-gray-600">ไม่ตรงกับระบบ</div>
              </div>
              <div className={`p-4 rounded-lg text-center ${summary.totalValueDifference >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`text-2xl font-bold ${summary.totalValueDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.totalValueDifference.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                </div>
                <div className="text-sm text-gray-600">มูลค่าผลต่างรวม</div>
              </div>
            </div>

            {/* Overstock Items */}
            {summary.overstockItems.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  รายการเกิน ({summary.overstockItems.length} รายการ)
                </h4>
                <div className="bg-green-50 rounded-lg p-3">
                  {summary.overstockItems.map(item => (
                    <div key={item.id} className="flex justify-between py-1 border-b border-green-100 last:border-0">
                      <span>{item.name_th} (+{item.difference} {item.unit_of_measure})</span>
                      <span className="text-green-600">+{item.value_difference.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Understock Items */}
            {summary.understockItems.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  รายการขาด ({summary.understockItems.length} รายการ)
                </h4>
                <div className="bg-red-50 rounded-lg p-3">
                  {summary.understockItems.map(item => (
                    <div key={item.id} className="flex justify-between py-1 border-b border-red-100 last:border-0">
                      <span>{item.name_th} ({item.difference} {item.unit_of_measure})</span>
                      <span className="text-red-600">{item.value_difference.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">เริ่มรอบการนับสต็อกใหม่</h3>
              <button onClick={() => setShowNewSessionModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรอบการนับ</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder={`นับสต็อก ${selectedWarehouse.name} - ${new Date().toLocaleDateString('th-TH')}`}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">คลังสินค้า</label>
                <select
                  value={selectedWarehouse.id}
                  onChange={(e) => setSelectedWarehouse(WAREHOUSES.find(w => w.id === e.target.value) || WAREHOUSES[0])}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {WAREHOUSES.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} {warehouse.is_default ? '(ค่าเริ่มต้น)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowNewSessionModal(false)}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmNewSession}
                  className="flex-1"
                >
                  เริ่มนับสต็อก
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
