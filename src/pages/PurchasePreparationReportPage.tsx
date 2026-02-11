import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  ShoppingCart, 
  RefreshCw, 
  Search, 
  Eye, 
  EyeOff, 
  Trash2, 
  Clock,
  AlertTriangle,
  Package,
  History,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Store
} from 'lucide-react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

interface Product {
  id: string
  name_th: string
  name_en: string
  barcode: string
  stock_quantity: number
  min_stock_level: number
  reorder_point: number
  unit_of_measure: string
  purchase_link_1?: string
  purchase_link_2?: string
  purchase_link_3?: string
  last_restocked_at?: string
  is_hidden_from_purchase_report: boolean
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
  reference_type: string
  created_by: string
}

interface ProductWithMovements extends Product {
  movements: StockMovement[]
  totalSold: number
  daysSinceLastRestock: number | null
}

export default function PurchasePreparationReportPage() {
  const [products, setProducts] = useState<ProductWithMovements[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [showShortageSection, setShowShortageSection] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [selectedDate])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Fetch products with stock issues
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name_th,
          name_en,
          barcode,
          stock_quantity,
          min_stock_level,
          reorder_point,
          unit_of_measure,
          purchase_link_1,
          purchase_link_2,
          purchase_link_3,
          last_restocked_at,
          is_hidden_from_purchase_report
        `)
        .eq('is_active', true)
        .or(`stock_quantity.eq.0,stock_quantity.lte.${'reorder_point'}`)
        .order('name_th')

      if (productsError) throw productsError

      // Fetch stock movements for the selected date
      const startOfDay = `${selectedDate}T00:00:00.000Z`
      const endOfDay = `${selectedDate}T23:59:59.999Z`
      
      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select('*')
        .gte('movement_date', startOfDay)
        .lte('movement_date', endOfDay)
        .order('movement_date', { ascending: false })

      if (movementsError) throw movementsError

      // Calculate days since last restock
      const now = new Date()
      const productsWithData = productsData?.map(product => {
        const productMovements = movementsData?.filter(m => m.product_id === product.id) || []
        const totalSold = productMovements
          .filter(m => m.movement_type === 'sale' || m.quantity < 0)
          .reduce((sum, m) => sum + Math.abs(m.quantity), 0)
        
        let daysSinceLastRestock: number | null = null
        if (product.last_restocked_at) {
          const lastRestock = new Date(product.last_restocked_at)
          daysSinceLastRestock = Math.floor((now.getTime() - lastRestock.getTime()) / (1000 * 60 * 60 * 24))
        }

        return {
          ...product,
          movements: productMovements,
          totalSold,
          daysSinceLastRestock
        }
      }) || []

      setProducts(productsWithData)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleHide = async (productId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_hidden_from_purchase_report: !currentValue })
        .eq('id', productId)

      if (error) throw error

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_hidden_from_purchase_report: !currentValue } : p
      ))
    } catch (error) {
      console.error('Error updating product:', error)
      alert('เกิดข้อผิดพลาดในการซ่อน/แสดงสินค้า')
    }
  }

  const handleDeleteFromReport = (productId: string) => {
    if (confirm('ต้องการลบสินค้านี้ออกจากรายงาน? (สินค้าจะยังอยู่ในสต็อก)')) {
      setProducts(prev => prev.filter(p => p.id !== productId))
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    
    const matchesHidden = showHidden ? true : !product.is_hidden_from_purchase_report
    
    return matchesSearch && matchesHidden
  })

  // Separate products into two groups
  const shortageProducts = filteredProducts.filter(p => 
    p.daysSinceLastRestock !== null && p.daysSinceLastRestock > 7
  )
  const normalProducts = filteredProducts.filter(p => 
    p.daysSinceLastRestock === null || p.daysSinceLastRestock <= 7
  )

  const getStatusColor = (stock: number, minLevel: number) => {
    if (stock === 0) return 'bg-red-100 text-red-700 border-red-200'
    if (stock <= minLevel) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const renderProductRow = (product: ProductWithMovements, isShortage = false) => {
    const isExpanded = expandedProduct === product.id
    const hasPurchaseLinks = product.purchase_link_1 || product.purchase_link_2 || product.purchase_link_3

    return (
      <div key={product.id} className={`border-b border-gray-200 last:border-b-0 ${isShortage ? 'bg-red-50/50' : ''}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{product.name_th}</h3>
                {isShortage && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    ขาดตลาด {product.daysSinceLastRestock} วัน
                  </span>
                )}
                {product.is_hidden_from_purchase_report && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    <EyeOff className="h-3 w-3" />
                    ซ่อน
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{product.barcode}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(product.stock_quantity, product.min_stock_level)}`}>
                  คงเหลือ: {product.stock_quantity} {product.unit_of_measure}
                </span>
                <span className="text-xs text-gray-500">
                  ขายวันนี้: {product.totalSold} {product.unit_of_measure}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Purchase Links */}
              {hasPurchaseLinks && (
                <div className="flex items-center gap-1">
                  {product.purchase_link_1 && (
                    <a
                      href={product.purchase_link_1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      title="ลิงก์สั่งซื้อ 1"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  )}
                  {product.purchase_link_2 && (
                    <a
                      href={product.purchase_link_2}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                      title="ลิงก์สั่งซื้อ 2"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  )}
                  {product.purchase_link_3 && (
                    <a
                      href={product.purchase_link_3}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors"
                      title="ลิงก์สั่งซื้อ 3"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <button
                onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="ดูประวัติการเคลื่อนไหว"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleToggleHide(product.id, product.is_hidden_from_purchase_report)}
                className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title={product.is_hidden_from_purchase_report ? 'แสดง' : 'ซ่อน'}
              >
                {product.is_hidden_from_purchase_report ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleDeleteFromReport(product.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="ลบออกจากรายงาน"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expanded Movement History */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">ประวัติการเคลื่อนไหววันนี้</h4>
              {product.movements.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {product.movements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between text-sm py-1 px-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${movement.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </span>
                        <span className="text-gray-600">{movement.reason || movement.movement_type}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(movement.movement_date).toLocaleTimeString('th-TH')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">ไม่มีการเคลื่อนไหวในวันนี้</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/stock-management"
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-7 w-7 text-blue-600" />
              รายงานเตรียมสั่งซื้อสินค้า
            </h1>
            <p className="text-gray-600 mt-1">
              สินค้าที่ต้องสั่งซื้อ พร้อมลิงก์และประวัติการเคลื่อนไหว
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={fetchProducts}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">วันที่:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาด้วยชื่อสินค้า หรือบาร์โค้ด..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">แสดงรายการที่ซ่อน</span>
          </label>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Package className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">สินค้าที่ต้องสั่งซื้อ</p>
              <p className="text-2xl font-bold text-red-700">{normalProducts.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-600">สินค้าขาดตลาด &gt;7 วัน</p>
              <p className="text-2xl font-bold text-amber-700">{shortageProducts.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">มีลิงก์สั่งซื้อ</p>
              <p className="text-2xl font-bold text-blue-700">
                {products.filter(p => p.purchase_link_1 || p.purchase_link_2 || p.purchase_link_3).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {/* Normal Products Section */}
          <Card className="mb-6">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                สินค้าที่ต้องสั่งซื้อ
                <span className="text-sm font-normal text-gray-500">({normalProducts.length} รายการ)</span>
              </h2>
            </div>
            {normalProducts.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {normalProducts.map(product => renderProductRow(product, false))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ไม่มีสินค้าที่ต้องสั่งซื้อในขณะนี้</p>
              </div>
            )}
          </Card>

          {/* Shortage Products Section */}
          {shortageProducts.length > 0 && (
            <Card className="border-red-200">
              <button
                onClick={() => setShowShortageSection(!showShortageSection)}
                className="w-full p-4 border-b border-red-200 bg-red-50 flex items-center justify-between"
              >
                <h2 className="font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  สินค้าขาดตลาด (ไม่เข้าสต็อกเกิน 1 สัปดาห์)
                  <span className="text-sm font-normal text-red-600">({shortageProducts.length} รายการ)</span>
                </h2>
                {showShortageSection ? <ChevronUp className="h-5 w-5 text-red-600" /> : <ChevronDown className="h-5 w-5 text-red-600" />}
              </button>
              {showShortageSection && (
                <div className="divide-y divide-red-100">
                  {shortageProducts.map(product => renderProductRow(product, true))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
