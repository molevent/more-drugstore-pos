import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { supabase } from '../services/supabase'
import type { Product, Category } from '../types/database'
import { Plus, Search, Printer, X, Package, ShoppingCart, User, Trash2, Building2, Tag, ChevronDown } from 'lucide-react'

interface Contact {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  company_name?: string
}

interface CatalogItem {
  product: Product
  quantity: number
}

interface CatalogSettings {
  showStockQuantity: boolean
  priceType: 'retail' | 'wholesale'
}

export default function ProductCatalogPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const catalogId = searchParams.get('id')
  const printRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<string[]>([])
  
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<CatalogItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showContactModal, setShowContactModal] = useState(false)
  const [catalogName, setCatalogName] = useState('')
  const [settings, setSettings] = useState<CatalogSettings>({
    showStockQuantity: false,
    priceType: 'retail'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchContacts()
    fetchCategories()
  }, [])

  useEffect(() => {
    if (catalogId) {
      fetchCatalog(catalogId)
    }
  }, [catalogId])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedCategory, selectedTags, products])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name_th')
    
    if (!error && data) {
      setProducts(data)
      const allTags = new Set<string>()
      data.forEach((product: Product) => {
        if (product.tags) {
          product.tags.forEach((tag: string) => allTags.add(tag))
        }
      })
      setTags(Array.from(allTags).sort())
    }
    setLoading(false)
  }

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (!error && data) {
      setContacts(data)
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (!error && data) {
      setCategories(data)
    }
  }

  const fetchCatalog = async (id: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('product_catalogs')
      .select('*, catalog_items(*, product:products(*))')
      .eq('id', id)
      .single()
    
    if (!error && data) {
      setCatalogName(data.name || '')
      setSettings({
        showStockQuantity: data.show_stock_quantity || false,
        priceType: data.price_type || 'retail'
      })
      if (data.customer_id) {
        const customer = contacts.find(c => c.id === data.customer_id)
        if (customer) setSelectedCustomer(customer)
      }
      if (data.catalog_items) {
        setSelectedProducts(data.catalog_items.map((item: { product: Product; quantity: number }) => ({
          product: item.product,
          quantity: item.quantity
        })))
      }
    }
    setLoading(false)
  }

  const filterProducts = () => {
    let filtered = products
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        (p.name_th && p.name_th.toLowerCase().includes(term)) ||
        (p.name_en && p.name_en.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term))
      )
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory)
    }
    
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => 
        p.tags && selectedTags.some(tag => p.tags?.includes(tag))
      )
    }
    
    setFilteredProducts(filtered)
  }

  const addToCatalog = (product: Product) => {
    const exists = selectedProducts.find(item => item.product.id === product.id)
    if (!exists) {
      setSelectedProducts([...selectedProducts, { product, quantity: 1 }])
    }
  }

  const removeFromCatalog = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedProducts(selectedProducts.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ))
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSave = async () => {
    if (!catalogName.trim()) {
      alert('กรุณาระบุชื่อแคตตาล็อก')
      return
    }

    setSaving(true)
    
    try {
      const catalogData = {
        name: catalogName,
        customer_id: selectedCustomer?.id || null,
        price_type: settings.priceType,
        show_stock_quantity: settings.showStockQuantity,
        updated_at: new Date().toISOString()
      }

      let catalogIdResult: string

      if (catalogId) {
        const { error } = await supabase
          .from('product_catalogs')
          .update(catalogData)
          .eq('id', catalogId)
        
        if (error) throw error
        catalogIdResult = catalogId
        
        await supabase.from('catalog_items').delete().eq('catalog_id', catalogId)
      } else {
        const { data, error } = await supabase
          .from('product_catalogs')
          .insert({ ...catalogData, created_at: new Date().toISOString() })
          .select()
          .single()
        
        if (error) throw error
        catalogIdResult = data.id
      }

      if (selectedProducts.length > 0) {
        const items = selectedProducts.map(item => ({
          catalog_id: catalogIdResult,
          product_id: item.product.id,
          quantity: item.quantity
        }))
        
        const { error: itemsError } = await supabase.from('catalog_items').insert(items)
        if (itemsError) throw itemsError
      }

      navigate('/product-catalogs')
    } catch (error) {
      console.error('Error saving catalog:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const getPrice = (product: Product) => {
    const price = settings.priceType === 'wholesale' 
      ? (product.wholesale_price || product.selling_price_incl_vat || 0)
      : (product.selling_price_incl_vat || 0)
    return price
  }

  const getProductName = (product: Product) => {
    return product.name_th || product.name_en || 'ไม่มีชื่อ'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 print:p-0 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-family: 'Sarabun', sans-serif; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header */}
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">สร้างแคตตาล็อกสินค้า</h1>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate('/product-catalogs')}>
                ยกเลิก
              </Button>
              <Button variant="secondary" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                พิมพ์
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="gap-2 bg-[#7D735F] hover:bg-[#6a6350]"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-2 space-y-6 no-print">
            {/* Catalog Settings */}
            <Card>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  <h2 className="font-semibold text-lg">ตั้งค่าแคตตาล็อก</h2>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแคตตาล็อก</label>
                  <Input
                    value={catalogName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCatalogName(e.target.value)}
                    placeholder="เช่น แคตตาล็อกสินค้าราคาส่ง ก.พ. 2025"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ลูกค้า (ไม่บังคับ)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-2 border rounded-md bg-gray-50">
                      {selectedCustomer ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{selectedCustomer.name}</p>
                            <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                          </div>
                          <button
                            onClick={() => setSelectedCustomer(null)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-500 py-1">ยังไม่ได้เลือกลูกค้า</p>
                      )}
                    </div>
                    <Button variant="secondary" onClick={() => setShowContactModal(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทราคา</label>
                    <select 
                      value={settings.priceType}
                      onChange={(e) => setSettings({ ...settings, priceType: e.target.value as 'retail' | 'wholesale' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7D735F] focus:border-transparent"
                    >
                      <option value="retail">ราคาขายปลีก</option>
                      <option value="wholesale">ราคาขายส่ง</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="showStock"
                      checked={settings.showStockQuantity}
                      onChange={(e) => setSettings({ ...settings, showStockQuantity: e.target.checked })}
                      className="w-4 h-4 text-[#7D735F] border-gray-300 rounded focus:ring-[#7D735F]"
                    />
                    <label htmlFor="showStock" className="ml-2 text-sm text-gray-700">แสดงจำนวนในคลัง</label>
                  </div>
                </div>
              </div>
            </Card>

            {/* Product Filters */}
            <Card>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b">
                  <Package className="w-5 h-5 text-gray-600" />
                  <h2 className="font-semibold text-lg">เลือกสินค้า</h2>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาสินค้า..."
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span>{selectedCategory ? categories.find(c => c.id === selectedCategory)?.name_th : 'ทั้งหมด'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div
                        onClick={() => { setSelectedCategory(''); setShowCategoryDropdown(false); }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        ทั้งหมด
                      </div>
                      {categories.map(cat => (
                        <div
                          key={cat.id}
                          onClick={() => { setSelectedCategory(cat.id); setShowCategoryDropdown(false); }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {cat.name_th}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      แท็ก
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={'px-3 py-1 rounded-full text-sm transition-colors ' + (selectedTags.includes(tag) ? 'bg-[#7D735F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border rounded-md max-h-96 overflow-y-auto">
                  {loading && (
                    <div className="p-4 text-center text-gray-500">
                      กำลังโหลด...
                    </div>
                  )}
                  {!loading && filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      ไม่พบสินค้า
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredProducts.map(product => {
                        const isSelected = selectedProducts.some(item => item.product.id === product.id)
                        const price = getPrice(product)
                        return (
                          <div 
                            key={product.id} 
                            className={'p-3 flex items-center gap-3 hover:bg-gray-50 ' + (isSelected ? 'bg-blue-50' : '')}
                          >
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={getProductName(product)}
                                className="w-12 h-12 object-cover rounded-md"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{getProductName(product)}</p>
                              <p className="text-sm text-gray-500">
                                ฿{price.toLocaleString()}
                                {settings.showStockQuantity && (' • คงเหลือ: ' + (product.stock_quantity || 0))}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? 'secondary' : 'primary'}
                              onClick={() => isSelected ? removeFromCatalog(product.id) : addToCatalog(product)}
                            >
                              {isSelected ? 'เลือกแล้ว' : 'เลือก'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right sidebar - Selected Products */}
          <div className="no-print">
            <div className="sticky top-24 bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                <h2 className="font-semibold">สินค้าที่เลือก ({selectedProducts.length})</h2>
              </div>
              <div className="p-4">
                {selectedProducts.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    ยังไม่ได้เลือกสินค้า
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedProducts.map(item => (
                      <div key={item.product.id} className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                        {item.product.image_url ? (
                          <img 
                            src={item.product.image_url} 
                            alt={getProductName(item.product)}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{getProductName(item.product)}</p>
                          <p className="text-xs text-gray-500">
                            ฿{getPrice(item.product).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center"
                          />
                          <button
                            onClick={() => removeFromCatalog(item.product.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Print Preview */}
        <div ref={printRef} className="print-only mt-8">
          <div className="max-w-4xl mx-auto bg-white p-8">
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
              <h1 className="text-3xl font-bold mb-2">{catalogName || 'แคตตาล็อกสินค้า'}</h1>
              {selectedCustomer && (
                <div className="text-left mt-4 bg-gray-100 p-4 rounded">
                  <p className="font-semibold">สำหรับ: {selectedCustomer.name}</p>
                  {selectedCustomer.phone && <p>โทร: {selectedCustomer.phone}</p>}
                  {selectedCustomer.email && <p>อีเมล: {selectedCustomer.email}</p>}
                  {selectedCustomer.address && <p>ที่อยู่: {selectedCustomer.address}</p>}
                </div>
              )}
              <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                <span>ประเภทราคา: {settings.priceType === 'wholesale' ? 'ราคาขายส่ง' : 'ราคาขายปลีก'}</span>
                <span>วันที่: {new Date().toLocaleDateString('th-TH')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedProducts.map(item => (
                <div key={item.product.id} className="border rounded-lg p-4 flex gap-4">
                  {item.product.image_url ? (
                    <img 
                      src={item.product.image_url} 
                      alt={getProductName(item.product)}
                      className="w-24 h-24 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{getProductName(item.product)}</h3>
                    {item.product.description_th && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.product.description_th}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xl font-bold text-blue-600">
                        ฿{getPrice(item.product).toLocaleString()}
                      </span>
                      {settings.showStockQuantity && (
                        <span className="text-sm text-gray-500">
                          คงเหลือ: {item.product.stock_quantity || 0} {item.product.unit || 'ชิ้น'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">จำนวน: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                ไม่มีสินค้าในแคตตาล็อก
              </div>
            )}

            <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
              <p>ร้านขายยาและเวชภัณฑ์</p>
              <p>สอบถามเพิ่มเติมโทร: 02-xxx-xxxx</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                เลือกลูกค้า
              </h3>
              <button 
                onClick={() => setShowContactModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <Input
                placeholder="ค้นหาลูกค้า..."
                className="mb-4"
              />
              {contacts.length === 0 ? (
                <p className="text-center text-gray-500 py-4">ไม่มีรายชื่อลูกค้า</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map(contact => (
                    <div
                      key={contact.id}
                      className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedCustomer(contact)
                        setShowContactModal(false)
                      }}
                    >
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-gray-500">{contact.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
