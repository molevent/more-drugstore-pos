import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { Warehouse, Package, AlertTriangle, TrendingDown } from 'lucide-react'
import type { Product } from '../types/database'

export default function WarehousePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name_th')
    if (data) setProducts(data)
    setLoading(false)
  }

  const totalProducts = products.length
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level)
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0)
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">คลังสินค้า</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">สินค้าทั้งหมด</div>
              <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">ใกล้หมด</div>
              <div className="text-2xl font-bold text-yellow-700">{lowStockProducts.length}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">หมดสต็อก</div>
              <div className="text-2xl font-bold text-red-700">{outOfStockProducts.length}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Warehouse className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">มูลค่าคลัง</div>
              <div className="text-xl font-bold text-green-700">฿{totalStockValue.toLocaleString()}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Product List */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">รายการสินค้าในคลัง</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">กำลังโหลด...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>ไม่มีสินค้าในคลัง</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ต้นทุน</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">มูลค่า</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{product.name_th}</div>
                      {product.name_en && (
                        <div className="text-sm text-gray-500">{product.name_en}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.sku}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-medium ${
                        product.stock_quantity <= product.min_stock_level
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {product.stock_quantity} {product.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      ฿{product.cost_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      ฿{(product.stock_quantity * product.cost_price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {product.stock_quantity === 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          หมด
                        </span>
                      ) : product.stock_quantity <= product.min_stock_level ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          ใกล้หมด
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          ปกติ
                        </span>
                      )}
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
