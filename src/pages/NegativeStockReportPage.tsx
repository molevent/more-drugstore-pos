import { useState, useEffect } from 'react'
import { AlertTriangle, Search, Package } from 'lucide-react'
import Card from '../components/common/Card'
import { supabase } from '../services/supabase'

interface NegativeStockItem {
  id: string
  name_th: string
  name_en?: string
  barcode?: string
  stock_quantity: number
  base_price: number
  negative_value: number
  category?: { name_th: string }
}

interface NegativeStockTransaction {
  id: string
  product_id: string
  quantity_change: number
  previous_stock: number
  new_stock: number
  transaction_type: string
  created_at: string
  user_id?: string
  user?: { full_name: string; email: string }[]
  product?: { name_th: string; base_price: number }[]
}

export default function NegativeStockReportPage() {
  const [negativeProducts, setNegativeProducts] = useState<NegativeStockItem[]>([])
  const [transactions, setTransactions] = useState<NegativeStockTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalNegativeValue, setTotalNegativeValue] = useState(0)
  const [activeTab, setActiveTab] = useState<'products' | 'transactions'>('products')

  useEffect(() => {
    fetchNegativeStockData()
  }, [])

  const fetchNegativeStockData = async () => {
    setLoading(true)
    try {
      // Fetch products with negative stock
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name_th,
          name_en,
          barcode,
          stock_quantity,
          base_price,
          category:categories(name_th)
        `)
        .lt('stock_quantity', 0)
        .order('stock_quantity', { ascending: true })

      if (productsError) throw productsError

      // Calculate negative value for each product
      const formattedProducts = (productsData || []).map((product: any) => ({
        ...product,
        negative_value: Math.abs(product.stock_quantity) * product.base_price,
        category: product.category?.[0] || null
      }))

      setNegativeProducts(formattedProducts)

      // Calculate total negative value
      const totalValue = formattedProducts.reduce((sum, item) => sum + item.negative_value, 0)
      setTotalNegativeValue(totalValue)

      // Fetch transactions that caused negative stock
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('stock_transactions')
        .select(`
          id,
          product_id,
          quantity_change,
          previous_stock,
          new_stock,
          transaction_type,
          created_at,
          user_id,
          user:users(full_name, email),
          product:products(name_th, base_price)
        `)
        .lt('new_stock', 0)
        .order('created_at', { ascending: false })
        .limit(100)

      if (transactionsError) throw transactionsError

      setTransactions(transactionsData || [])
    } catch (err: any) {
      console.error('Error fetching negative stock data:', err)
      alert('ไม่สามารถโหลดข้อมูลสินค้าติดลบได้: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const filteredProducts = negativeProducts.filter(product =>
    product.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name_en?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-red-600" />
            รายงานสินค้าติดลบ
          </h1>
          <p className="text-gray-600 mt-1">รายการสินค้าที่มีสต็อกติดลบและการเคลื่อนไหวที่ทำให้เกิดสต็อกติดลบ</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-4 sm:px-0">
        <Card className="bg-white border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-red-500 flex items-center justify-center shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">จำนวนสินค้าติดลบ</p>
              <p className="text-2xl font-bold text-red-600">{negativeProducts.length} รายการ</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">มูลค่าที่ขาด</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalNegativeValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-0 mb-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'products'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            รายการสินค้าติดลบ
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'transactions'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ประวัติการเคลื่อนไหว
          </button>
        </div>
      </div>

      {/* Search */}
      {activeTab === 'products' && (
        <Card className="mb-6 px-4 sm:px-0 bg-white border-gray-200">
          <div className="flex items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="h-4 w-4 inline mr-1" />
                ค้นหาสินค้า
              </label>
              <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-2.5 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  type="text"
                  placeholder="ชื่อสินค้า, บาร์โค้ด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Content */}
      <Card className="px-4 sm:px-0 bg-white border-gray-200">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
          </div>
        ) : activeTab === 'products' ? (
          filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>ไม่พบสินค้าติดลบ</p>
              <p className="text-sm text-gray-400 mt-1">สต็อกสินค้าทั้งหมดอยู่ในสภาพปกติ</p>
            </div>
          ) : (
            <div className="min-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สินค้า
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หมวดหมู่
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      บาร์โค้ด
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จำนวนคงเหลือ
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ราคา/หน่วย
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      มูลค่าที่ขาด
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{product.name_th}</div>
                        {product.name_en && (
                          <div className="text-xs text-gray-500">{product.name_en}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {product.category?.name_th || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {product.barcode || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="inline-flex items-center px-2 py-1 text-sm font-bold text-red-700 bg-red-100 rounded-full">
                          {product.stock_quantity} ชิ้น
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(product.base_price)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="font-bold text-red-600">
                          {formatCurrency(product.negative_value)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>ไม่พบประวัติการเคลื่อนไหวที่ทำให้สต็อกติดลบ</p>
            </div>
          ) : (
            <div className="min-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่
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
                      ผู้ใช้งาน
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleString('th-TH')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {transaction.product?.[0]?.name_th || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                        {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                        {transaction.previous_stock}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="inline-flex items-center px-2 py-1 text-sm font-bold text-red-700 bg-red-100 rounded-full">
                          {transaction.new_stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {transaction.transaction_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {transaction.user?.[0]?.full_name || transaction.user?.[0]?.email || transaction.user_id || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </div>
  )
}
