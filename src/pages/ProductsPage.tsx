import { useEffect, useState } from 'react'
import { useProductStore } from '../stores/productStore'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { LabelWithTooltip } from '../components/common/Tooltip'
import { Search, Plus, X, Filter, Upload, AlertCircle } from 'lucide-react'
import type { Product, Category } from '../types/database'

// Extended form data with all new fields
interface ProductFormData {
  // 1. Identification
  barcode: string
  sku: string
  name_th: string
  name_en: string
  product_type: 'finished_goods' | 'service'
  brand: string
  is_active: boolean
  
  // 2. Categorization
  category_id: string
  tags: string
  indications: string
  usage_instructions: string
  internal_notes: string
  description_th: string
  description_en: string
  
  // 3. Financials
  base_price: number
  cost_price: number
  purchase_price_excl_vat: number
  cost_per_unit: number
  selling_price_excl_vat: number
  selling_price_incl_vat: number
  original_price: number
  wholesale_price: number
  unit: string
  
  // 4. Inventory
  stock_quantity: number
  min_stock_level: number
  opening_stock_date: string
  expiry_date: string
  lot_number: string
  packaging_size: string
  
  // 5. Logistics
  weight_grams: number
  width_cm: number
  length_cm: number
  height_cm: number
  image_url: string
  
  // 6. Sales Channels
  sell_on_pos: boolean
  sell_on_grab: boolean
  sell_on_lineman: boolean
  sell_on_lazada: boolean
  sell_on_shopee: boolean
  sell_on_line_shopping: boolean
  sell_on_tiktok: boolean
  
  // 6.1 ราคาขายแยกตามช่องทาง (Channel-specific Prices)
  price_pos: number
  price_grab: number
  price_lineman: number
  price_lazada: number
  price_shopee: number
  price_line_shopping: number
  price_tiktok: number
}

const initialFormData: ProductFormData = {
  barcode: '',
  sku: '',
  name_th: '',
  name_en: '',
  product_type: 'finished_goods',
  brand: '',
  is_active: true,
  category_id: '',
  tags: '',
  indications: '',
  usage_instructions: '',
  internal_notes: '',
  description_th: '',
  description_en: '',
  base_price: 0,
  cost_price: 0,
  purchase_price_excl_vat: 0,
  cost_per_unit: 0,
  selling_price_excl_vat: 0,
  selling_price_incl_vat: 0,
  original_price: 0,
  wholesale_price: 0,
  unit: 'ชิ้น',
  stock_quantity: 0,
  min_stock_level: 10,
  opening_stock_date: '',
  expiry_date: '',
  lot_number: '',
  packaging_size: '',
  weight_grams: 0,
  width_cm: 0,
  length_cm: 0,
  height_cm: 0,
  image_url: '',
  sell_on_pos: true,
  sell_on_grab: false,
  sell_on_lineman: false,
  sell_on_lazada: false,
  sell_on_shopee: false,
  sell_on_line_shopping: false,
  sell_on_tiktok: false,
  // Channel prices
  price_pos: 0,
  price_grab: 0,
  price_lineman: 0,
  price_lazada: 0,
  price_shopee: 0,
  price_line_shopping: 0,
  price_tiktok: 0
}

export default function ProductsPage() {
  const { loading, searchTerm, setSearchTerm, fetchProducts, products } = useProductStore()
  const { t } = useLanguage()
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [activeTab, setActiveTab] = useState<'identification' | 'categorization' | 'financials' | 'inventory' | 'logistics' | 'channels'>('identification')
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    barcode: '',
    sku: '',
    name_th: '',
    name_en: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    minStock: '',
    maxStock: '',
    hasExpiry: false,
    activeOnly: true
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchTerm === '' || 
      p.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
    
    const matchesCategory = !selectedCategory || 
      (selectedCategory === 'uncategorized' ? !p.category_id : p.category_id === selectedCategory)
    
    const matchesStock = !stockFilter || 
      (stockFilter === 'low' && p.stock_quantity <= p.min_stock_level) ||
      (stockFilter === 'in' && p.stock_quantity > p.min_stock_level) ||
      (stockFilter === 'out' && p.stock_quantity === 0)
    
    const matchesPrice = 
      (!minPrice || p.base_price >= parseFloat(minPrice)) &&
      (!maxPrice || p.base_price <= parseFloat(maxPrice))
    
    return matchesSearch && matchesCategory && matchesStock && matchesPrice
  })

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      barcode: product.barcode,
      sku: product.sku,
      name_th: product.name_th,
      name_en: product.name_en || '',
      product_type: product.product_type || 'finished_goods',
      brand: product.brand || '',
      is_active: product.is_active,
      category_id: product.category_id || '',
      tags: product.tags?.join(', ') || '',
      indications: product.indications || '',
      usage_instructions: product.usage_instructions || '',
      internal_notes: product.internal_notes || '',
      description_th: product.description_th || '',
      description_en: product.description_en || '',
      base_price: product.base_price,
      cost_price: product.cost_price,
      purchase_price_excl_vat: product.purchase_price_excl_vat || 0,
      cost_per_unit: product.cost_per_unit || 0,
      selling_price_excl_vat: product.selling_price_excl_vat || 0,
      selling_price_incl_vat: product.selling_price_incl_vat || 0,
      original_price: product.original_price || 0,
      wholesale_price: product.wholesale_price || 0,
      unit: product.unit,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      opening_stock_date: product.opening_stock_date || '',
      expiry_date: product.expiry_date || '',
      lot_number: product.lot_number || '',
      packaging_size: product.packaging_size || '',
      weight_grams: product.weight_grams || 0,
      width_cm: product.width_cm || 0,
      length_cm: product.length_cm || 0,
      height_cm: product.height_cm || 0,
      image_url: product.image_url || '',
      sell_on_pos: product.sell_on_pos ?? true,
      sell_on_grab: product.sell_on_grab || false,
      sell_on_lineman: product.sell_on_lineman || false,
      sell_on_lazada: product.sell_on_lazada || false,
      sell_on_shopee: product.sell_on_shopee || false,
      sell_on_line_shopping: product.sell_on_line_shopping || false,
      sell_on_tiktok: product.sell_on_tiktok || false,
      // Channel prices
      price_pos: product.price_pos || 0,
      price_grab: product.price_grab || 0,
      price_lineman: product.price_lineman || 0,
      price_lazada: product.price_lazada || 0,
      price_shopee: product.price_shopee || 0,
      price_line_shopping: product.price_line_shopping || 0,
      price_tiktok: product.price_tiktok || 0
    })
    setImagePreview(product.image_url || '')
    setActiveTab('identification')
    setShowModal(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let imageUrl = formData.image_url

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, imageFile)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      const productData = {
        ...formData,
        category_id: formData.category_id || null,
        image_url: imageUrl
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData])
        if (error) throw error
      }

      alert(t('products.saveSuccess'))
      setShowModal(false)
      resetForm()
      fetchProducts()
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(error.message)
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setEditingProduct(null)
    setImageFile(null)
    setImagePreview('')
    setActiveTab('identification')
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setStockFilter('')
    setMinPrice('')
    setMaxPrice('')
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('products.title')}</h1>
        <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          {t('products.addProduct')}
        </Button>
      </div>

      <Card>
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('products.search')}
                className="pl-10"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('products.filterByCategory')}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">{t('products.allCategories')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name_th}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('products.filterByStock')}
                </label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">{t('products.allCategories')}</option>
                  <option value="low">{t('products.lowStock')}</option>
                  <option value="in">{t('products.inStock')}</option>
                  <option value="out">{t('products.outOfStock')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('products.minPrice')}
                </label>
                <Input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('products.maxPrice')}
                </label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="9999"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full sm:w-auto"
                >
                  {t('products.clearFilters')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('products.loading')}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t('products.noProducts')}</p>
            <p className="text-sm mt-2">{t('products.addProductPrompt')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.barcode')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.category')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.price')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.stock')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.barcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name_th}</div>
                      {product.name_en && (
                        <div className="text-sm text-gray-500">{product.name_en}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(product as any).category?.name_th || t('products.noCategory')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ฿{product.base_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm ${
                          product.stock_quantity <= product.min_stock_level
                            ? 'text-red-600 font-medium'
                            : 'text-gray-900'
                        }`}
                      >
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        {t('products.edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Card>

      {/* Product Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? t('products.editProduct') : t('products.addProduct')}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('identification')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'identification' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                1. ระบุตัวตน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('categorization')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'categorization' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                2. หมวดหมู่
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financials')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'financials' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                3. ราคา
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                4. สต็อก
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logistics')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'logistics' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                5. โลจิสติกส์
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('channels')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'channels' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                6. ช่องทางขาย
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tab 1: Identification */}
              {activeTab === 'identification' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">ข้อมูลการระบุตัวตน (Identification)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip label="Code/SKU (รหัสสินค้า)" tooltip="จำเป็น (แนะนำแยกตามหมวด เช่น PHA-001)" required />
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Barcode (รหัสบาร์โค้ด)" tooltip="เลข 13 หลักตามตัวสินค้า" />
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <LabelWithTooltip label="Product Name (ชื่อภาษาไทย)" tooltip="ชื่อสินค้าภาษาไทย" required />
                    <input
                      type="text"
                      value={formData.name_th}
                      onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <LabelWithTooltip label="English Name (ชื่อภาษาอังกฤษ)" tooltip="ชื่อสินค้าภาษาอังกฤษ (ถ้ามี)" />
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip label="Product Type (ประเภทสินค้า)" tooltip="เช่น สินค้าสำเร็จรูป (Finished Goods), บริการ" />
                      <select
                        value={formData.product_type}
                        onChange={(e) => setFormData({ ...formData, product_type: e.target.value as 'finished_goods' | 'service' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="finished_goods">สินค้าสำเร็จรูป (Finished Goods)</option>
                        <option value="service">บริการ (Service)</option>
                      </select>
                    </div>
                    <div>
                      <LabelWithTooltip label="Product Brand (ยี่ห้อ)" tooltip="เช่น GSK, Eucerin, Mega We Care" />
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Active (ขาย) / Inactive (ระงับการขาย)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 2: Categorization */}
              {activeTab === 'categorization' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">หมวดหมู่และการจัดกลุ่ม (Categorization)</h3>
                  
                  <div>
                    <LabelWithTooltip label="Category (หมวดสินค้าหลัก)" tooltip="ตาม 8 หมวดที่ระบบวางไว้" />
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name_th}</option>
                      ))}
                    </select>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowSearchModal(true)}
                        className="flex-1"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        ค้นหารายละเอียดสินค้า
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setShowModal(false)
                          setSelectedCategory('uncategorized')
                        }}
                        className="flex-1"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        สินค้ายังไม่ตั้งหมวดหมู่
                      </Button>
                    </div>
                  </div>

                  <div>
                    <LabelWithTooltip label="Tag สินค้า" tooltip="คำค้นหาเพิ่มเติม คั่นด้วยลูกน้ำ (เช่น #ยาแก้ปวด, #สินค้าแนะนำ)" />
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#ยาแก้ปวด, #สินค้าแนะนำ, #ลดราคา"
                    />
                  </div>

                  <div>
                    <LabelWithTooltip label="สรรพคุณ / ข้อบ่งใช้" tooltip="รายละเอียดการใช้งานสินค้า" />
                    <textarea
                      value={formData.indications}
                      onChange={(e) => setFormData({ ...formData, indications: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <LabelWithTooltip label="คำแนะนำเพิ่มเติม" tooltip="ข้อควรระวัง หรือวิธีเก็บรักษา" />
                    <textarea
                      value={formData.usage_instructions}
                      onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  <div>
                    <LabelWithTooltip label="หมายเหตุภายใน (Note)" tooltip="พนักงานดูได้อย่างเดียว ลูกค้าไม่เห็น" />
                    <textarea
                      value={formData.internal_notes}
                      onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-yellow-50"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Financials */}
              {activeTab === 'financials' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">การตั้งราคาและบัญชี (Financials)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip label="Purchasing Price (Excl. VAT)" tooltip="ราคาทุนซื้อล่าสุด (ไม่รวม VAT)" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.purchase_price_excl_vat}
                        onChange={(e) => setFormData({ ...formData, purchase_price_excl_vat: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Cost/Unit" tooltip="ต้นทุนเฉลี่ยต่อหน่วย" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost_per_unit}
                        onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip label="Selling Price (Excl. VAT)" tooltip="ราคาขายก่อนภาษี" required />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.base_price}
                        onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Selling Price (Incl. VAT)" tooltip="ราคาขายหน้าร้าน (รวมภาษีแล้ว)" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.selling_price_incl_vat}
                        onChange={(e) => setFormData({ ...formData, selling_price_incl_vat: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <LabelWithTooltip label="ราคาเต็ม" tooltip="ราคาตั้งต้นก่อนทำส่วนลด" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.original_price}
                        onChange={(e) => setFormData({ ...formData, original_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="ราคาส่ง" tooltip="ราคาพิเศษกรณีขายจำนวนมาก" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.wholesale_price}
                        onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Unit (หน่วยนับ)" tooltip="เช่น กล่อง, แผง, ชิ้น, ขวด" required />
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Inventory */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">การจัดการสต็อก (Inventory & Tracking)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <LabelWithTooltip label="Remaining Qty" tooltip="จำนวนสินค้าคงเหลือปัจจุบัน" required />
                      <input
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="จำนวนขั้นต่ำ (Min Stock)" tooltip="จุดแจ้งเตือนเมื่อของใกล้หมด" required />
                      <input
                        type="number"
                        value={formData.min_stock_level}
                        onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Opening Stock Date" tooltip="วันที่ตั้งต้นยอดยกมา (ค.ศ.)" />
                      <input
                        type="date"
                        value={formData.opening_stock_date}
                        onChange={(e) => setFormData({ ...formData, opening_stock_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip label="วันหมดอายุ (Expiry Date)" tooltip="วันหมดอายุของสินค้า Lot ปัจจุบัน" />
                      <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Serial / Lot Number" tooltip="เลขที่ผลิตของสินค้า" />
                      <input
                        type="text"
                        value={formData.lot_number}
                        onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <LabelWithTooltip label="ปริมาณ" tooltip="ขนาดบรรจุ (เช่น 10 เม็ด, 500 มล.)" />
                    <input
                      type="text"
                      value={formData.packaging_size}
                      onChange={(e) => setFormData({ ...formData, packaging_size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="เช่น 10 เม็ด, 500 มล."
                    />
                  </div>
                </div>
              )}

              {/* Tab 5: Logistics */}
              {activeTab === 'logistics' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">โลจิสติกส์และรูปภาพ (Logistics & Media)</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <LabelWithTooltip label="น้ำหนัก (กรัม)" tooltip="สำหรับคำนวณค่าขนส่งออนไลน์" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.weight_grams}
                        onChange={(e) => setFormData({ ...formData, weight_grams: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="กว้าง (ซม.)" tooltip="ความกว้าง (เซนติเมตร)" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.width_cm}
                        onChange={(e) => setFormData({ ...formData, width_cm: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="ยาว (ซม.)" tooltip="ความยาว (เซนติเมตร)" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.length_cm}
                        onChange={(e) => setFormData({ ...formData, length_cm: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="สูง (ซม.)" tooltip="ความสูง (เซนติเมตร)" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.height_cm}
                        onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      รูปภาพสินค้า (อัปโหลดได้สูงสุด 9 รูป)
                    </label>
                    <div className="flex items-center gap-4 flex-wrap">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded-lg border"
                        />
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300">
                          <Upload className="h-5 w-5 text-gray-600" />
                          <span className="text-sm text-gray-700">{t('products.uploadImage')}</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Sales Channels */}
              {activeTab === 'channels' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">ช่องทางการขาย (Sales Channels)</h3>
                  <p className="text-sm text-gray-600">เลือกช่องทางที่ต้องการเปิดขาย และกำหนดราคาขายแยกตามช่องทาง (ถ้ามี)</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* POS */}
                    <div className="p-3 border rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.sell_on_pos}
                          onChange={(e) => setFormData({ ...formData, sell_on_pos: e.target.checked })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="font-medium text-sm">หน้าร้าน (POS)</span>
                      </label>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_pos}
                        onChange={(e) => setFormData({ ...formData, price_pos: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* GRAB */}
                    <div className="p-3 border rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.sell_on_grab}
                          onChange={(e) => setFormData({ ...formData, sell_on_grab: e.target.checked })}
                          className="h-4 w-4 text-green-600 rounded"
                        />
                        <span className="font-medium text-sm">GRAB</span>
                      </label>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_grab}
                        onChange={(e) => setFormData({ ...formData, price_grab: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* LINEMAN */}
                    <div className="p-3 border rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.sell_on_lineman}
                          onChange={(e) => setFormData({ ...formData, sell_on_lineman: e.target.checked })}
                          className="h-4 w-4 text-green-600 rounded"
                        />
                        <span className="font-medium text-sm">LINEMAN</span>
                      </label>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_lineman}
                        onChange={(e) => setFormData({ ...formData, price_lineman: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* LAZADA */}
                    <div className="p-3 border rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.sell_on_lazada}
                          onChange={(e) => setFormData({ ...formData, sell_on_lazada: e.target.checked })}
                          className="h-4 w-4 text-orange-600 rounded"
                        />
                        <span className="font-medium text-sm">LAZADA</span>
                      </label>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_lazada}
                        onChange={(e) => setFormData({ ...formData, price_lazada: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* SHOPEE */}
                    <div className="p-3 border rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.sell_on_shopee}
                          onChange={(e) => setFormData({ ...formData, sell_on_shopee: e.target.checked })}
                          className="h-4 w-4 text-orange-600 rounded"
                        />
                        <span className="font-medium text-sm">SHOPEE</span>
                      </label>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_shopee}
                        onChange={(e) => setFormData({ ...formData, price_shopee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* LINE SHOPPING */}
                    <div className="p-3 border rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.sell_on_line_shopping}
                          onChange={(e) => setFormData({ ...formData, sell_on_line_shopping: e.target.checked })}
                          className="h-4 w-4 text-green-600 rounded"
                        />
                        <span className="font-medium text-sm">LINE SHOPPING</span>
                      </label>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_line_shopping}
                        onChange={(e) => setFormData({ ...formData, price_line_shopping: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* TIKTOK */}
                    <div className="p-3 border rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.sell_on_tiktok}
                          onChange={(e) => setFormData({ ...formData, sell_on_tiktok: e.target.checked })}
                          className="h-4 w-4 text-pink-600 rounded"
                        />
                        <span className="font-medium text-sm">TIKTOK</span>
                      </label>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_tiktok}
                        onChange={(e) => setFormData({ ...formData, price_tiktok: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t mt-6">
                <Button type="submit" variant="primary" className="flex-1">
                  {t('common.save')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">ค้นหารายละเอียดสินค้า</h2>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={searchFilters.barcode}
                    onChange={(e) => setSearchFilters({ ...searchFilters, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="รหัสบาร์โค้ด"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={searchFilters.sku}
                    onChange={(e) => setSearchFilters({ ...searchFilters, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="รหัสสินค้า"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า (ไทย)</label>
                  <input
                    type="text"
                    value={searchFilters.name_th}
                    onChange={(e) => setSearchFilters({ ...searchFilters, name_th: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ชื่อภาษาไทย"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า (อังกฤษ)</label>
                  <input
                    type="text"
                    value={searchFilters.name_en}
                    onChange={(e) => setSearchFilters({ ...searchFilters, name_en: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ชื่อภาษาอังกฤษ"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ยี่ห้อ / Brand</label>
                <input
                  type="text"
                  value={searchFilters.brand}
                  onChange={(e) => setSearchFilters({ ...searchFilters, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น GSK, Eucerin"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขั้นต่ำ</label>
                  <input
                    type="number"
                    value={searchFilters.minPrice}
                    onChange={(e) => setSearchFilters({ ...searchFilters, minPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ราคาสูงสุด</label>
                  <input
                    type="number"
                    value={searchFilters.maxPrice}
                    onChange={(e) => setSearchFilters({ ...searchFilters, maxPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สต็อกขั้นต่ำ</label>
                  <input
                    type="number"
                    value={searchFilters.minStock}
                    onChange={(e) => setSearchFilters({ ...searchFilters, minStock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สต็อกสูงสุด</label>
                  <input
                    type="number"
                    value={searchFilters.maxStock}
                    onChange={(e) => setSearchFilters({ ...searchFilters, maxStock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="999"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchFilters.hasExpiry}
                    onChange={(e) => setSearchFilters({ ...searchFilters, hasExpiry: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">มีวันหมดอายุ</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchFilters.activeOnly}
                    onChange={(e) => setSearchFilters({ ...searchFilters, activeOnly: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">เฉพาะสินค้าที่ขายอยู่</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t mt-6">
              <Button 
                type="button" 
                variant="primary" 
                className="flex-1"
                onClick={() => {
                  // Build search query from filters
                  let query = supabase.from('products').select('*')
                  
                  if (searchFilters.barcode) {
                    query = query.ilike('barcode', `%${searchFilters.barcode}%`)
                  }
                  if (searchFilters.sku) {
                    query = query.ilike('sku', `%${searchFilters.sku}%`)
                  }
                  if (searchFilters.name_th) {
                    query = query.ilike('name_th', `%${searchFilters.name_th}%`)
                  }
                  if (searchFilters.name_en) {
                    query = query.ilike('name_en', `%${searchFilters.name_en}%`)
                  }
                  if (searchFilters.brand) {
                    query = query.ilike('brand', `%${searchFilters.brand}%`)
                  }
                  if (searchFilters.minPrice) {
                    query = query.gte('base_price', parseFloat(searchFilters.minPrice))
                  }
                  if (searchFilters.maxPrice) {
                    query = query.lte('base_price', parseFloat(searchFilters.maxPrice))
                  }
                  if (searchFilters.minStock) {
                    query = query.gte('stock_quantity', parseInt(searchFilters.minStock))
                  }
                  if (searchFilters.maxStock) {
                    query = query.lte('stock_quantity', parseInt(searchFilters.maxStock))
                  }
                  if (searchFilters.hasExpiry) {
                    query = query.not('expiry_date', 'is', null)
                  }
                  if (searchFilters.activeOnly) {
                    query = query.eq('is_active', true)
                  }

                  query.then(({ data, error }) => {
                    if (error) {
                      alert('Error searching: ' + error.message)
                    } else {
                      // Update the product store with search results
                      useProductStore.setState({ products: data || [] })
                      setShowSearchModal(false)
                    }
                  })
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                ค้นหา
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchFilters({
                    barcode: '',
                    sku: '',
                    name_th: '',
                    name_en: '',
                    brand: '',
                    minPrice: '',
                    maxPrice: '',
                    minStock: '',
                    maxStock: '',
                    hasExpiry: false,
                    activeOnly: true
                  })
                }}
                className="flex-1"
              >
                ล้างตัวกรอง
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowSearchModal(false)}
                className="flex-1"
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
