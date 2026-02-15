import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { supabase } from '../services/supabase'
import { Plus, Search, Printer, Eye, Trash2, Building2, ShoppingCart, BookOpen } from 'lucide-react'

interface ProductCatalog {
  id: string
  name: string
  customer_id: string | null
  price_type: 'retail' | 'wholesale'
  show_stock_quantity: boolean
  created_at: string
  customer?: {
    id: string
    name: string
    phone?: string
  }
  item_count?: number
}

export default function ProductCatalogsListPage() {
  const navigate = useNavigate()
  const [catalogs, setCatalogs] = useState<ProductCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalogs()
  }, [])

  const fetchCatalogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('product_catalogs')
      .select('*, customer:contacts(id, name, phone), catalog_items(count)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const formattedCatalogs = (data as unknown as Array<ProductCatalog & { catalog_items?: { count: number }[] }>).map(catalog => ({
        ...catalog,
        item_count: catalog.catalog_items?.[0]?.count || 0
      }))
      setCatalogs(formattedCatalogs)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      // Delete catalog items first
      await supabase.from('catalog_items').delete().eq('catalog_id', id)
      // Delete catalog
      const { error } = await supabase.from('product_catalogs').delete().eq('id', id)
      if (error) throw error
      setDeleteConfirm(null)
      fetchCatalogs()
    } catch (error) {
      console.error('Error deleting catalog:', error)
      alert('เกิดข้อผิดพลาดในการลบแคตตาล็อก')
    }
  }

  const filteredCatalogs = catalogs.filter(catalog =>
    catalog.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    catalog.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white pb-20 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-7 w-7 text-[#7D735F]" />
                แคตตาล็อกสินค้า
              </h1>
              <p className="text-gray-600 mt-1">จัดการแคตตาล็อกสินค้าสำหรับนำเสนอลูกค้า</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-help-modal'))}
                className="p-2 text-gray-400 hover:text-[#7D735F] hover:bg-[#F5F0E6] rounded-full transition-all"
                title="คู่มือการใช้งาน"
              >
                <BookOpen className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/product-catalog')}
                className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#A67B5B] bg-white text-[#A67B5B] text-sm whitespace-nowrap hover:bg-[#A67B5B]/10 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                สร้างแคตตาล็อก
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <Card className="mb-6 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาแคตตาล็อกหรือลูกค้า..."
              className="pl-10"
            />
          </div>
        </Card>

        {/* Catalogs Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#7D735F] border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">กำลังโหลด...</p>
          </div>
        ) : filteredCatalogs.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีแคตตาล็อก</h3>
            <p className="text-gray-500 mb-4">เริ่มต้นสร้างแคตตาล็อกสินค้าเพื่อนำเสนอลูกค้า</p>
            <Button
              onClick={() => navigate('/product-catalog')}
              variant="primary"
            >
              สร้างแคตตาล็อกแรก
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalogs.map(catalog => (
              <Card key={catalog.id} className="hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{catalog.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(catalog.created_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      catalog.price_type === 'wholesale' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {catalog.price_type === 'wholesale' ? 'ราคาส่ง' : 'ราคาขายปลีก'}
                    </span>
                  </div>

                  {catalog.customer && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Building2 className="w-4 h-4" />
                      <span className="line-clamp-1">{catalog.customer.name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{catalog.item_count} รายการสินค้า</span>
                    {catalog.show_stock_quantity && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        แสดงจำนวนในคลัง
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/product-catalog?id=${catalog.id}`)}
                      className="flex-1 gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      ดู/แก้ไข
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/product-catalog?id=${catalog.id}&print=true`)}
                      className="gap-1"
                    >
                      <Printer className="w-4 h-4" />
                      พิมพ์
                    </Button>
                    <button
                      onClick={() => setDeleteConfirm(catalog.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ยืนยันการลบ</h3>
            <p className="text-gray-600 mb-4">
              คุณแน่ใจหรือไม่ที่จะลบแคตตาล็อกนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-red-600 hover:bg-red-700"
              >
                ลบ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
