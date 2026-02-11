import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Package, Store, AlertCircle, RefreshCw, Search, CheckCircle } from 'lucide-react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

interface Platform {
  id: string
  name: string
  code: string
}

interface Product {
  id: string
  name_th: string
  name_en: string
  barcode: string
  stock_quantity: number
  min_stock_level: number
  reorder_point: number
  unit_of_measure: string
  platforms: Platform[]
}

interface StockAlert {
  product_id: string
  alert_type: 'low' | 'out'
  current_stock: number
}

export default function StockReplenishmentReportPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Fetch products with their platform prices (to determine which platforms they sell on)
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
          unit_of_measure
        `)
        .eq('is_active', true)
        .order('name_th')

      if (productsError) throw productsError

      // Fetch all platforms
      const { data: platformsData, error: platformsError } = await supabase
        .from('platforms')
        .select('id, name, code')
        .eq('is_active', true)

      if (platformsError) throw platformsError

      // Fetch platform prices to know which products are sold on which platforms
      const { data: platformPricesData, error: platformPricesError } = await supabase
        .from('platform_prices')
        .select('product_id, platform_id')

      if (platformPricesError) throw platformPricesError

      // Fetch stock alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('stock_alerts')
        .select('product_id, alert_type, current_stock')
        .eq('is_resolved', false)

      if (alertsError) throw alertsError

      // Create a map of product_id to platforms
      const productPlatformsMap: Record<string, Platform[]> = {}
      platformPricesData?.forEach((pp) => {
        const platform = platformsData?.find(p => p.id === pp.platform_id)
        if (platform) {
          if (!productPlatformsMap[pp.product_id]) {
            productPlatformsMap[pp.product_id] = []
          }
          if (!productPlatformsMap[pp.product_id].find(p => p.id === platform.id)) {
            productPlatformsMap[pp.product_id].push(platform)
          }
        }
      })

      // Combine products with their platforms
      const productsWithPlatforms = productsData?.map(product => ({
        ...product,
        platforms: productPlatformsMap[product.id] || []
      })) || []

      setProducts(productsWithPlatforms)
      setStockAlerts(alertsData || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (product: Product): { status: 'low' | 'out' | 'ok'; message: string } => {
    const alert = stockAlerts.find(a => a.product_id === product.id)
    
    if (product.stock_quantity === 0) {
      return { status: 'out', message: 'สินค้าหมดสต็อก' }
    }
    if (alert?.alert_type === 'low' || product.stock_quantity <= product.reorder_point) {
      return { status: 'low', message: 'สต็อกต่ำกว่าจุดสั่งซื้อ' }
    }
    return { status: 'ok', message: 'สต็อกปกติ' }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    
    if (!matchesSearch) return false
    
    if (showOnlyAlerts) {
      const status = getStockStatus(product)
      return status.status !== 'ok'
    }
    
    return true
  })

  const getStatusColor = (status: 'low' | 'out' | 'ok') => {
    switch (status) {
      case 'out': return 'bg-red-100 text-red-700 border-red-200'
      case 'low': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'ok': return 'bg-green-100 text-green-700 border-green-200'
    }
  }

  const getStatusIcon = (status: 'low' | 'out' | 'ok') => {
    switch (status) {
      case 'out': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'low': return <AlertCircle className="h-4 w-4 text-amber-600" />
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-600" />
    }
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
              <Package className="h-7 w-7 text-blue-600" />
              รายงานแจ้งเติมสต็อกสินค้า
            </h1>
            <p className="text-gray-600 mt-1">
              แสดงสินค้าที่ต้องเติมสต็อกและช่องทางการขายที่ต้องอัปเดต
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
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAlerts}
                onChange={(e) => setShowOnlyAlerts(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">แสดงเฉพาะที่ต้องเติมสต็อก</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">สินค้าหมดสต็อก</p>
              <p className="text-2xl font-bold text-red-700">
                {products.filter(p => getStockStatus(p).status === 'out').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-600">สต็อกต่ำ</p>
              <p className="text-2xl font-bold text-amber-700">
                {products.filter(p => getStockStatus(p).status === 'low').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Store className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">สินค้าทั้งหมด</p>
              <p className="text-2xl font-bold text-green-700">{products.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">สินค้า</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">สต็อกปัจจุบัน</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">จุดสั่งซื้อ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">สถานะ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ช่องทางการขายที่ต้องอัปเดต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product)
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{product.name_th}</p>
                          <p className="text-sm text-gray-500">{product.barcode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${
                          product.stock_quantity === 0 ? 'text-red-600' :
                          product.stock_quantity <= product.reorder_point ? 'text-amber-600' :
                          'text-gray-900'
                        }`}>
                          {product.stock_quantity} {product.unit_of_measure}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {product.reorder_point} {product.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(stockStatus.status)}`}>
                          {getStatusIcon(stockStatus.status)}
                          {stockStatus.message}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.platforms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.platforms.map((platform) => (
                              <span
                                key={platform.id}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {platform.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">ไม่มีช่องทางการขาย</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
