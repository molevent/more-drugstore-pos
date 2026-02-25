import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { Search, ExternalLink, Package, ShoppingCart, Edit, X, Save, Filter, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types/database'

interface PlatformConfig {
  id: string
  name: string
  code: string
  color: string
  bgColor: string
  sellField: keyof Product
  urlField: keyof Product
  priceField: keyof Product
  skuField?: keyof Product
  logo: string
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'lazada',
    name: 'Lazada',
    code: 'LAZADA',
    color: 'text-[#0F146D]',
    bgColor: 'bg-[#0F146D]',
    sellField: 'sell_on_lazada',
    urlField: 'url_lazada',
    priceField: 'price_lazada',
    logo: '🛒'
  },
  {
    id: 'line_shopping',
    name: 'LINE Shopping',
    code: 'LINE',
    color: 'text-[#06C755]',
    bgColor: 'bg-[#06C755]',
    sellField: 'sell_on_line_shopping',
    urlField: 'url_line_shopping',
    priceField: 'price_line_shopping',
    logo: '💚'
  }
]

interface EditingProduct {
  id: string
  url: string
  price: number
  seller_sku: string
}

export default function PlatformManagementPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activePlatform, setActivePlatform] = useState<string>('lazada')
  const [filterMode, setFilterMode] = useState<'listed' | 'unlisted' | 'all'>('listed')
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name_th')
      
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentPlatform = PLATFORMS.find(p => p.id === activePlatform) || PLATFORMS[0]

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchTerm === '' ||
      p.name_th?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm) ||
      p.sku?.includes(searchTerm)

    const isListed = !!(p as any)[currentPlatform.sellField]

    if (filterMode === 'listed') return matchesSearch && isListed
    if (filterMode === 'unlisted') return matchesSearch && !isListed
    return matchesSearch
  })

  const listedCount = products.filter(p => !!(p as any)[currentPlatform.sellField]).length
  const unlistedCount = products.length - listedCount

  const handleToggleListing = async (product: Product, listed: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ [currentPlatform.sellField]: listed })
        .eq('id', product.id)

      if (error) throw error
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, [currentPlatform.sellField]: listed } : p
      ))
    } catch (err) {
      console.error('Error toggling listing:', err)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleStartEdit = (product: Product) => {
    setEditingProduct({
      id: product.id,
      url: (product as any)[currentPlatform.urlField] || '',
      price: (product as any)[currentPlatform.priceField] || product.base_price || 0,
      seller_sku: product.sku || product.barcode || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingProduct) return
    setSaving(true)
    try {
      const updates: any = {
        [currentPlatform.urlField]: editingProduct.url,
        [currentPlatform.priceField]: editingProduct.price,
      }

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', editingProduct.id)

      if (error) throw error

      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id ? { ...p, ...updates } : p
      ))
      setEditingProduct(null)
    } catch (err) {
      console.error('Error saving:', err)
      alert('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">จัดการแพลตฟอร์ม</h1>
            <p className="text-sm text-gray-500">ดูและจัดการสินค้าที่ขายในแต่ละแพลตฟอร์ม</p>
          </div>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2">
        {PLATFORMS.map(platform => {
          const count = products.filter(p => !!(p as any)[platform.sellField]).length
          return (
            <button
              key={platform.id}
              onClick={() => { setActivePlatform(platform.id); setFilterMode('listed') }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                activePlatform === platform.id
                  ? `${platform.bgColor} text-white shadow-lg`
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
              }`}
            >
              <span className="text-xl">{platform.logo}</span>
              <span>{platform.name}</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                activePlatform === platform.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Stats + Search */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setFilterMode('listed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterMode === 'listed'
                  ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Package className="h-4 w-4 inline mr-1" />
              ลงขาย ({listedCount})
            </button>
            <button
              onClick={() => setFilterMode('unlisted')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterMode === 'unlisted'
                  ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Filter className="h-4 w-4 inline mr-1" />
              ยังไม่ลง ({unlistedCount})
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              ทั้งหมด ({products.length})
            </button>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า, barcode, SKU..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Product Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>ไม่พบสินค้า{filterMode === 'listed' ? `ที่ลงขายใน ${currentPlatform.name}` : filterMode === 'unlisted' ? `ที่ยังไม่ลงขายใน ${currentPlatform.name}` : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 w-12">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">สินค้า</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Barcode</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Seller SKU</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">ราคาขาย</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">ราคา {currentPlatform.name}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">สต็อก</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">ลิงก์</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">สถานะ</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 w-20">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => {
                  const isListed = !!(product as any)[currentPlatform.sellField]
                  const platformUrl = (product as any)[currentPlatform.urlField] || ''
                  const platformPrice = (product as any)[currentPlatform.priceField]
                  const isEditing = editingProduct?.id === product.id

                  return (
                    <tr key={product.id} className={`border-b hover:bg-gray-50 transition-colors ${!isListed ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{product.name_th}</div>
                        {product.name_en && (
                          <div className="text-xs text-gray-400">{product.name_en}</div>
                        )}
                        {product.brand && (
                          <div className="text-xs text-gray-400">{product.brand}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {product.barcode || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-full px-2 py-1 border rounded text-xs font-mono"
                            value={editingProduct.seller_sku}
                            onChange={e => setEditingProduct({ ...editingProduct, seller_sku: e.target.value })}
                            placeholder="Seller SKU"
                          />
                        ) : (
                          <span className="font-mono text-xs text-blue-600">
                            {product.sku || product.barcode || '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-gray-600">฿{(product.base_price || 0).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-24 px-2 py-1 border rounded text-right text-sm"
                            value={editingProduct.price}
                            onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                          />
                        ) : (
                          <span className={`font-medium ${platformPrice ? 'text-green-600' : 'text-gray-400'}`}>
                            {platformPrice ? `฿${platformPrice.toLocaleString()}` : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock_quantity > (product.min_stock_level || 0)
                            ? 'bg-green-100 text-green-700'
                            : product.stock_quantity > 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="url"
                            className="w-full px-2 py-1 border rounded text-xs"
                            value={editingProduct.url}
                            onChange={e => setEditingProduct({ ...editingProduct, url: e.target.value })}
                            placeholder={`URL สินค้าใน ${currentPlatform.name}`}
                          />
                        ) : platformUrl ? (
                          <a
                            href={platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs ${currentPlatform.color} hover:underline`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            ดู
                          </a>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleListing(product, !isListed)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            isListed
                              ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                              : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                          }`}
                        >
                          {isListed ? '✓ ลงขาย' : 'ยังไม่ลง'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="บันทึก"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingProduct(null)}
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              title="ยกเลิก"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(product)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="แก้ไข"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {!loading && filteredProducts.length > 0 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-gray-500">
            <span>แสดง {filteredProducts.length} รายการ</span>
            <span>
              {currentPlatform.name}: {listedCount} สินค้าลงขาย จากทั้งหมด {products.length} รายการ
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}
