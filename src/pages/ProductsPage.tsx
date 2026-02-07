import { useEffect, useState } from 'react'
import { useProductStore } from '../stores/productStore'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { LabelWithTooltip } from '../components/common/Tooltip'
import { Search, Plus, X, Filter, Upload, Package, Store, ShoppingCart, Truck, Globe, MessageCircle, Video, Warehouse, ArrowRightLeft, Printer, ExternalLink, ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Product, Category } from '../types/database'

// Extended form data with all new fields
interface ProductFormData {
  // 1. Identification
  barcode: string
  sku: string
  name_th: string
  name_en: string
  product_type: 'finished_goods' | 'service'
  is_active: boolean
  stock_tracking_type: 'tracked' | 'untracked' | 'service'
  
  // 2. Categorization
  category_id: string
  tags: string
  indications: string
  usage_instructions: string
  active_ingredient: string
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
  sell_on_consignment: boolean
  sell_on_website: boolean
  
  // 6.1 ราคาขายแยกตามช่องทาง (Channel-specific Prices)
  price_pos: number
  price_grab: number
  price_lineman: number
  price_lazada: number
  price_shopee: number
  price_line_shopping: number
  price_tiktok: number
  price_consignment: number
  price_website: number
  
  // 6.2 URLs for each channel
  url_pos: string
  url_grab: string
  url_lineman: string
  url_lazada: string
  url_shopee: string
  url_line_shopping: string
  url_tiktok: string
  url_consignment: string
  url_website: string
}

const initialFormData: ProductFormData = {
  barcode: '',
  sku: '',
  name_th: '',
  name_en: '',
  product_type: 'finished_goods',
  is_active: true,
  stock_tracking_type: 'tracked',
  category_id: '',
  tags: '',
  indications: '',
  usage_instructions: '',
  active_ingredient: '',
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
  sell_on_consignment: false,
  sell_on_website: false,
  // Channel prices
  price_pos: 0,
  price_grab: 0,
  price_lineman: 0,
  price_lazada: 0,
  price_shopee: 0,
  price_line_shopping: 0,
  price_tiktok: 0,
  price_consignment: 0,
  price_website: 0,
  // Channel URLs
  url_pos: '',
  url_grab: '',
  url_lineman: '',
  url_lazada: '',
  url_shopee: '',
  url_line_shopping: '',
  url_tiktok: '',
  url_consignment: '',
  url_website: ''
}

export default function ProductsPage() {
  const { loading, searchTerm, setSearchTerm, fetchProducts, products } = useProductStore()
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'identification' | 'categorization' | 'financials' | 'inventory' | 'logistics' | 'channels'>('dashboard')
  const [inventorySubTab, setInventorySubTab] = useState<'general' | 'warehouse'>('general')
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    barcode: '',
    sku: '',
    name_th: '',
    name_en: '',
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
    
    // Check URL query parameter for filters
    const params = new URLSearchParams(location.search)
    if (params.get('filter') === 'uncategorized') {
      setSelectedCategory('uncategorized')
    } else if (params.get('category')) {
      setSelectedCategory(params.get('category') || '')
    }
  }, [fetchProducts, location.search])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchTerm === '' || 
      p.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
    
    // Get all subcategory IDs for the selected category
    const getAllSubCategoryIds = (parentId: string): string[] => {
      const subCats = categories.filter(c => c.parent_id === parentId).map(c => c.id)
      const grandChildren = subCats.flatMap(subId => getAllSubCategoryIds(subId))
      return [...subCats, ...grandChildren]
    }
    
    const matchesCategory = !selectedCategory || 
      (selectedCategory === 'uncategorized' 
        ? !p.category_id 
        : p.category_id === selectedCategory || getAllSubCategoryIds(selectedCategory).includes(p.category_id || ''))
    
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
      is_active: product.is_active,
      stock_tracking_type: product.stock_tracking_type || 'tracked',
      category_id: product.category_id || '',
      tags: product.tags?.join(', ') || '',
      indications: product.indications || '',
      usage_instructions: product.usage_instructions || '',
      active_ingredient: product.active_ingredient || '',
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
      sell_on_consignment: product.sell_on_consignment || false,
      sell_on_website: product.sell_on_website || false,
      // Channel prices
      price_pos: product.price_pos || 0,
      price_grab: product.price_grab || 0,
      price_lineman: product.price_lineman || 0,
      price_lazada: product.price_lazada || 0,
      price_shopee: product.price_shopee || 0,
      price_line_shopping: product.price_line_shopping || 0,
      price_tiktok: product.price_tiktok || 0,
      price_consignment: product.price_consignment || 0,
      price_website: product.price_website || 0,
      // Channel URLs
      url_pos: product.url_pos || '',
      url_grab: product.url_grab || '',
      url_lineman: product.url_lineman || '',
      url_lazada: product.url_lazada || '',
      url_shopee: product.url_shopee || '',
      url_line_shopping: product.url_line_shopping || '',
      url_tiktok: product.url_tiktok || '',
      url_consignment: product.url_consignment || '',
      url_website: product.url_website || ''
    })
    setImagePreview(product.image_url || '')
    setActiveTab('dashboard')
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
        barcode: formData.barcode,
        sku: formData.sku,
        name_th: formData.name_th,
        name_en: formData.name_en,
        is_active: formData.is_active,
        category_id: formData.category_id || null,
        base_price: formData.base_price,
        cost_price: formData.cost_price,
        unit: formData.unit,
        stock_quantity: formData.stock_quantity,
        min_stock_level: formData.min_stock_level,
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
    setActiveTab('dashboard')
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
        <div className="flex items-center gap-3">
          {selectedCategory && (
            <Button
              variant="secondary"
              onClick={() => navigate('/categories')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              กลับ
            </Button>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {selectedCategory && selectedCategory !== 'uncategorized'
              ? categories.find(c => c.id === selectedCategory)?.name_th || t('products.title')
              : selectedCategory === 'uncategorized'
                ? 'สินค้ายังไม่ตั้งหมวดหมู่'
                : t('products.title')
            }
          </h1>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          {t('products.addProduct')}
        </Button>
      </div>

      {/* Subcategories Section - Show when viewing by category */}
      {selectedCategory && selectedCategory !== 'uncategorized' && (
        <div className="mb-4">
          {(() => {
            // Get all descendants (children and grandchildren) flattened
            const getAllDescendants = (parentId: string): Category[] => {
              const result: Category[] = []
              const children = categories.filter(c => c.parent_id === parentId)
              children.forEach(child => {
                result.push(child)
                const grandchildren = categories.filter(c => c.parent_id === child.id)
                grandchildren.forEach(gc => result.push(gc))
              })
              return result
            }
            
            const allDescendants = getAllDescendants(selectedCategory)
            if (allDescendants.length === 0) return null
            
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600 mb-3">หมวดหมู่ย่อย:</p>
                <div className="flex flex-wrap gap-2">
                  {allDescendants.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/products?category=${cat.id}`)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        cat.parent_id === selectedCategory
                          ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {cat.name_th}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

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
              {(() => {
                // Check if current category has subcategories
                const currentCategoryHasSubs = selectedCategory && selectedCategory !== 'uncategorized' && 
                  categories.some(c => c.parent_id === selectedCategory)
                
                if (!currentCategoryHasSubs) {
                  // Normal flat list view
                  return (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('products.image')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('products.barcode')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('products.name')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('products.category')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('products.price')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('products.stock')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name_th} className="h-12 w-12 object-cover rounded-lg border" />
                              ) : (
                                <div className="h-12 w-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.barcode}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{product.name_th}</div>
                              {product.name_en && <div className="text-sm text-gray-500">{product.name_en}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(product as any).category?.name_th || t('products.noCategory')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm ${product.stock_quantity <= product.min_stock_level ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                {product.stock_quantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }

                // Grouped by subcategory view - only when NOT viewing pharmacy (or specific categories that need grouping)
                const subCategories = categories.filter(c => c.parent_id === selectedCategory)
                
                // For Pharmacy category - detect by structure (has children with 'ควบคุม' or 'สามัญ' in name)
                const isPharmacyCategory = subCategories.some(sub => 
                  sub.name_th.includes('ควบคุม') || sub.name_th.includes('สามัญ') || sub.name_th.includes('OTC')
                )
                
                if (isPharmacyCategory) {
                  // Build a map from leaf category ID -> parent type (ยาควบคุม/ยาสามัญ)
                  const categoryToParentMap = new Map<string, string>()
                  
                  subCategories.forEach(subCat => {
                    // Get grandchildren of this subcategory
                    const grandChildren = categories.filter(c => c.parent_id === subCat.id)
                    if (grandChildren.length > 0) {
                      // Map each grandchild to its parent's name
                      grandChildren.forEach(gc => {
                        categoryToParentMap.set(gc.id, subCat.name_th)
                      })
                    } else {
                      // This is a leaf category itself
                      categoryToParentMap.set(subCat.id, subCat.name_th)
                    }
                  })
                  
                  // Group products by leaf category name
                  const productsByLeafCatName = new Map<string, { product: Product; parentType: string }[]>()
                  
                  filteredProducts.forEach(product => {
                    const catId = product.category_id
                    const parentType = catId ? categoryToParentMap.get(catId) || 'อื่นๆ' : 'อื่นๆ'
                    const leafCatName = (product as any).category?.name_th || 'ไม่ระบุหมวดหมู่'
                    
                    const existing = productsByLeafCatName.get(leafCatName) || []
                    existing.push({ product, parentType })
                    productsByLeafCatName.set(leafCatName, existing)
                  })
                  
                  // Sort category names alphabetically
                  const sortedCatNames = Array.from(productsByLeafCatName.keys()).sort()
                  
                  return (
                    <div className="space-y-6">
                      {sortedCatNames.map((catName) => {
                        const productsWithType = productsByLeafCatName.get(catName) || []
                        if (productsWithType.length === 0) return null
                        
                        return (
                          <div key={catName} className="border rounded-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3 border-b">
                              <h3 className="font-semibold text-blue-900">{catName}</h3>
                              <p className="text-xs text-blue-600">{productsWithType.length} รายการ</p>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.image')}</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.barcode')}</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.name')}</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.price')}</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.stock')}</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {productsWithType.map(({ product, parentType }) => (
                                  <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      {product.image_url ? (
                                        <img src={product.image_url} alt={product.name_th} className="h-10 w-10 object-cover rounded-lg border" />
                                      ) : (
                                        <div className="h-10 w-10 bg-gray-100 rounded-lg border flex items-center justify-center">
                                          <Package className="h-5 w-5 text-gray-400" />
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{product.barcode}</td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{product.name_th}</div>
                                      {product.name_en && <div className="text-sm text-gray-500">{product.name_en}</div>}
                                      <div className={`text-xs mt-1 ${parentType.includes('ควบคุม') ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}`}>
                                        {parentType.includes('ควบคุม') ? '🔒 ยาควบคุม' : '💊 ยาสามัญ'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <span className={`text-sm ${product.stock_quantity <= product.min_stock_level ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                        {product.stock_quantity}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                // For other categories with subcategories - keep grouped view
                const productsBySubCat = new Map<string, Product[]>()
                
                // Initialize with subcategories
                subCategories.forEach(sub => productsBySubCat.set(sub.id, []))
                productsBySubCat.set('other', [])
                
                // Group products
                filteredProducts.forEach(product => {
                  const directSubCat = subCategories.find(sub => 
                    product.category_id === sub.id || 
                    categories.filter(c => c.parent_id === sub.id).some(grand => grand.id === product.category_id)
                  )
                  if (directSubCat) {
                    const existing = productsBySubCat.get(directSubCat.id) || []
                    existing.push(product)
                    productsBySubCat.set(directSubCat.id, existing)
                  } else {
                    const other = productsBySubCat.get('other') || []
                    other.push(product)
                    productsBySubCat.set('other', other)
                  }
                })

                return (
                  <div className="space-y-6">
                    {subCategories.map((subCat) => {
                      const subProducts = productsBySubCat.get(subCat.id) || []
                      if (subProducts.length === 0) return null
                      
                      return (
                        <div key={subCat.id} className="border rounded-xl overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3 border-b">
                            <h3 className="font-semibold text-blue-900">{subCat.name_th}</h3>
                            <p className="text-xs text-blue-600">{subProducts.length} รายการ</p>
                          </div>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.image')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.barcode')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.name')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.category')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.price')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.stock')}</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {subProducts.map((product) => (
                                <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    {product.image_url ? (
                                      <img src={product.image_url} alt={product.name_th} className="h-10 w-10 object-cover rounded-lg border" />
                                    ) : (
                                      <div className="h-10 w-10 bg-gray-100 rounded-lg border flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{product.barcode}</td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{product.name_th}</div>
                                    {product.name_en && <div className="text-sm text-gray-500">{product.name_en}</div>}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{(product as any).category?.name_th || '-'}</td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <span className={`text-sm ${product.stock_quantity <= product.min_stock_level ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                      {product.stock_quantity}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                    
                    {/* Other products not in any subcategory */}
                    {(() => {
                      const otherProducts = productsBySubCat.get('other') || []
                      if (otherProducts.length === 0) return null
                      return (
                        <div className="border rounded-xl overflow-hidden">
                          <div className="bg-gray-100 px-6 py-3 border-b">
                            <h3 className="font-semibold text-gray-700">อื่นๆ</h3>
                            <p className="text-xs text-gray-500">{otherProducts.length} รายการ</p>
                          </div>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.image')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.barcode')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.name')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.category')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.price')}</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('products.stock')}</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {otherProducts.map((product) => (
                                <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    {product.image_url ? (
                                      <img src={product.image_url} alt={product.name_th} className="h-10 w-10 object-cover rounded-lg border" />
                                    ) : (
                                      <div className="h-10 w-10 bg-gray-100 rounded-lg border flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{product.barcode}</td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{product.name_th}</div>
                                    {product.name_en && <div className="text-sm text-gray-500">{product.name_en}</div>}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{(product as any).category?.name_th || '-'}</td>
                                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <span className={`text-sm ${product.stock_quantity <= product.min_stock_level ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                      {product.stock_quantity}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}
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
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Product Overview
              </button>
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
                5. รูปภาพ
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
              {/* Tab 0: Dashboard */}
              {activeTab === 'dashboard' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Dashboard สินค้า (Product Overview)</h3>
                  
                  {/* Product Image and Basic Info */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image Section */}
                    <div className="flex-shrink-0">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt={formData.name_th}
                          className="h-32 w-32 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="h-32 w-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Basic Info */}
                    <div className="flex-1 space-y-2">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">ชื่อสินค้า</div>
                        <div className="text-lg font-bold text-gray-900">{formData.name_th || '-'}</div>
                        {formData.name_en && (
                          <div className="text-sm text-gray-600">{formData.name_en}</div>
                        )}
                        {/* Active Ingredient - ตัวยาสำคัญ */}
                        {formData.active_ingredient && (
                          <div className="mt-2 text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block">
                            ตัวยาสำคัญ: {formData.active_ingredient}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-xs text-gray-500">Barcode</div>
                          <div className="text-sm font-medium text-gray-900 font-mono">{formData.barcode || '-'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-xs text-gray-500">SKU</div>
                          <div className="text-sm font-medium text-gray-900">{formData.sku || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Price */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                      <div className="text-xs text-green-600 font-medium">ราคาขาย (รวม VAT)</div>
                      <div className="text-xl font-bold text-green-700">
                        ฿{formData.selling_price_incl_vat > 0 ? formData.selling_price_incl_vat.toFixed(2) : formData.base_price.toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Stock */}
                    <div className={`rounded-lg p-3 border ${formData.stock_quantity <= formData.min_stock_level ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'}`}>
                      <div className={`text-xs font-medium ${formData.stock_quantity <= formData.min_stock_level ? 'text-red-600' : 'text-blue-600'}`}>
                        สต็อกคงเหลือ
                      </div>
                      <div className={`text-xl font-bold ${formData.stock_quantity <= formData.min_stock_level ? 'text-red-700' : 'text-blue-700'}`}>
                        {formData.stock_quantity} {formData.unit}
                      </div>
                      {formData.stock_quantity <= formData.min_stock_level && (
                        <div className="text-xs text-red-500">⚠️ ใกล้หมด</div>
                      )}
                    </div>
                    
                    {/* Category */}
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100">
                      <div className="text-xs text-purple-600 font-medium">หมวดหมู่</div>
                      <div className="text-sm font-bold text-purple-700">
                        {categories.find(c => c.id === formData.category_id)?.name_th || 'ไม่ระบุ'}
                      </div>
                    </div>
                    
                    {/* Expiry */}
                    <div className={`rounded-lg p-3 border ${formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-100'}`}>
                      <div className={`text-xs font-medium ${formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-600' : 'text-gray-600'}`}>
                        วันหมดอายุ
                      </div>
                      <div className={`text-sm font-bold ${formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-700' : 'text-gray-700'}`}>
                        {formData.expiry_date ? new Date(formData.expiry_date).toLocaleDateString('th-TH') : '-'}
                      </div>
                      {formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                        <div className="text-xs text-orange-500">⚠️ ใกล้หมดอายุ</div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {formData.tags && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Tag สินค้า</div>
                      <div className="flex flex-wrap gap-1">
                        {formData.tags.split(',').map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indications & Usage */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.indications && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                        <div className="text-xs text-yellow-700 font-medium mb-1">สรรพคุณ / ข้อบ่งใช้</div>
                        <div className="text-sm text-gray-700">{formData.indications}</div>
                      </div>
                    )}
                    {formData.usage_instructions && (
                      <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                        <div className="text-xs text-teal-700 font-medium mb-1">คำแนะนำเพิ่มเติม</div>
                        <div className="text-sm text-gray-700">{formData.usage_instructions}</div>
                      </div>
                    )}
                  </div>

                  {/* Active Ingredient removed from here - moved to under product name */}

                  {/* Sales Channels Icons */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-2">ช่องทางการขาย</div>
                    <div className="flex flex-wrap gap-3">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_pos ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        <Store className="h-4 w-4" />
                        <span>หน้าร้าน</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_grab ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        <ShoppingCart className="h-4 w-4" />
                        <span>Grab</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_lineman ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        <Truck className="h-4 w-4" />
                        <span>Lineman</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_lazada ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
                        <Globe className="h-4 w-4" />
                        <span>Lazada</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_shopee ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                        <ShoppingCart className="h-4 w-4" />
                        <span>Shopee</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_line_shopping ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        <MessageCircle className="h-4 w-4" />
                        <span>LINE</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_tiktok ? 'bg-black bg-opacity-10 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <Video className="h-4 w-4" />
                        <span>TikTok</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_consignment ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                        <ShoppingCart className="h-4 w-4" />
                        <span>ฝากขาย</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${formData.sell_on_website ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        <Globe className="h-4 w-4" />
                        <span>Website</span>
                      </div>
                    </div>
                  </div>

                  {/* Status and Print Label */}
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${formData.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {formData.is_active ? '✓ Active (ขาย)' : '✗ Inactive (ระงับ)'}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // Navigate to medicine label page with product data
                        const labelData = {
                          product_name: formData.name_th,
                          product_name_en: formData.name_en,
                          barcode: formData.barcode,
                          dosage: formData.packaging_size,
                          active_ingredient: formData.active_ingredient,
                          lot_number: formData.lot_number,
                          expiry_date: formData.expiry_date
                        }
                        const queryParams = new URLSearchParams({
                          data: JSON.stringify(labelData)
                        }).toString()
                        window.open(`/medicine-label?${queryParams}`, '_blank')
                      }}
                      className="flex items-center gap-1"
                    >
                      <Printer className="h-4 w-4" />
                      พิมพ์ฉลาก
                    </Button>
                  </div>
                </div>
              )}

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

                  {/* Weight & Dimensions */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">ขนาดและน้ำหนัก (สำหรับคำนวณค่าขนส่ง)</h4>
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
                  </div>
                </div>
              )}

              {/* Tab 2: Categorization */}
              {activeTab === 'categorization' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">หมวดหมู่และการจัดกลุ่ม (Categorization)</h3>
                  
                  <div>
                    <LabelWithTooltip label="Category (หมวดสินค้า)" tooltip="เลือกหมวดหมู่จากตาราง" />
                    
                    {/* Hierarchical Category Table - Compact */}
                    <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-700 w-1/3 border-r">หมวดหลัก</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-700">หมวดย่อย</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {categories.filter(c => !c.parent_id).map((mainCat) => {
                            const subCats = categories.filter(c => c.parent_id === mainCat.id)
                            const isMainSelected = formData.category_id === mainCat.id
                            
                            return (
                              <tr key={mainCat.id} className={isMainSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                <td className="px-2 py-2 align-top border-r">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="category"
                                      value={mainCat.id}
                                      checked={isMainSelected}
                                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                      className="h-3.5 w-3.5 text-blue-600"
                                    />
                                    <span className={`text-sm font-medium ${isMainSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                      {mainCat.name_th}
                                    </span>
                                  </label>
                                </td>
                                <td className="px-2 py-2">
                                  {subCats.length > 0 ? (
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                      {subCats.map((subCat) => {
                                        const grandChildren = categories.filter(c => c.parent_id === subCat.id)
                                        const isSubSelected = formData.category_id === subCat.id
                                        
                                        return (
                                          <div key={subCat.id} className="flex flex-col">
                                            <label className={`flex items-center gap-1 cursor-pointer text-xs ${isSubSelected ? 'text-blue-700 font-medium bg-blue-100 rounded px-1' : 'text-gray-700'}`}>
                                              <input
                                                type="radio"
                                                name="category"
                                                value={subCat.id}
                                                checked={isSubSelected}
                                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                                className="h-3 w-3 text-blue-600"
                                              />
                                              {subCat.name_th}
                                            </label>
                                            
                                            {/* Grand Children - inline */}
                                            {grandChildren.length > 0 && (
                                              <div className="flex flex-wrap gap-x-2 ml-4 mt-0.5">
                                                {grandChildren.map((grandChild) => {
                                                  const isGrandSelected = formData.category_id === grandChild.id
                                                  return (
                                                    <label 
                                                      key={grandChild.id} 
                                                      className={`flex items-center gap-1 cursor-pointer text-xs ${isGrandSelected ? 'text-blue-600 font-medium bg-blue-100 rounded px-1' : 'text-gray-500'}`}
                                                    >
                                                      <input
                                                        type="radio"
                                                        name="category"
                                                        value={grandChild.id}
                                                        checked={isGrandSelected}
                                                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                                        className="h-2.5 w-2.5 text-blue-600"
                                                      />
                                                      {grandChild.name_th}
                                                    </label>
                                                  )
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Selected Category Display */}
                    {formData.category_id && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <span className="text-gray-600">เลือก:</span>{' '}
                        <span className="font-medium text-blue-700">
                          {categories.find(c => c.id === formData.category_id)?.name_th}
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowSearchModal(true)}
                        className="w-full"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        ค้นหารายละเอียดสินค้า
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
                    <LabelWithTooltip label="ตัวยาสำคัญ (Active Ingredient)" tooltip="สำหรับสินค้ากลุ่มยา เช่น Paracetamol 500mg" />
                    <input
                      type="text"
                      value={formData.active_ingredient}
                      onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="เช่น Paracetamol 500mg, Ibuprofen 200mg"
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
                  {/* Sub-tabs for Inventory */}
                  <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setInventorySubTab('general')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${inventorySubTab === 'general' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      สต็อกทั่วไป
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventorySubTab('warehouse')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${inventorySubTab === 'warehouse' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      สต็อกตามคลัง
                    </button>
                  </div>

                  {/* Sub-tab: General Stock */}
                  {inventorySubTab === 'general' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">การจัดการสต็อก (Inventory & Tracking)</h3>

                      {/* Stock Tracking Type */}
                      <div>
                        <LabelWithTooltip label="ประเภทการนับสต็อก" tooltip="กำหนดว่าสินค้านี้ต้องนับสต็อกหรือไม่" />
                        <select
                          value={formData.stock_tracking_type}
                          onChange={(e) => setFormData({ ...formData, stock_tracking_type: e.target.value as 'tracked' | 'untracked' | 'service' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="tracked">สินค้านับสต็อก</option>
                          <option value="untracked">สินค้าไม่นับสต็อก</option>
                          <option value="service">บริการ</option>
                        </select>
                      </div>

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

                  {/* Sub-tab: Warehouse Stock */}
                  {inventorySubTab === 'warehouse' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">สต็อกตามคลัง (Stock by Warehouse)</h3>
                      
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-700">
                          แสดงจำนวนสินค้าที่มีอยู่ในแต่ละคลัง สินค้าจะถูก default ไว้ที่คลังหลัก สามารถย้ายสินค้าได้ที่เมนู คลังสินค้า → โอนสินค้า
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Main Warehouse */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Warehouse className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">คลังสินค้าหลัก</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">หลัก</span>
                          </div>
                          <div className="text-3xl font-bold text-blue-700">{formData.stock_quantity}</div>
                          <div className="text-sm text-gray-600">{formData.unit}</div>
                        </div>

                        {/* Other warehouses - placeholder until data is loaded */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Warehouse className="h-5 w-5 text-gray-500" />
                            <span className="font-semibold text-gray-700">คลังสินค้าสาขา 2</span>
                          </div>
                          <div className="text-3xl font-bold text-gray-600">0</div>
                          <div className="text-sm text-gray-500">{formData.unit}</div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Warehouse className="h-5 w-5 text-gray-500" />
                            <span className="font-semibold text-gray-700">คลังสินค้า Fulfillment</span>
                          </div>
                          <div className="text-3xl font-bold text-gray-600">0</div>
                          <div className="text-sm text-gray-500">{formData.unit}</div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Warehouse className="h-5 w-5 text-gray-500" />
                            <span className="font-semibold text-gray-700">คลังสินค้าเก่า/ชำรุด</span>
                          </div>
                          <div className="text-3xl font-bold text-gray-600">0</div>
                          <div className="text-sm text-gray-500">{formData.unit}</div>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <a 
                          href="/warehouse-management" 
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          ไปที่หน้าโอนสินค้าระหว่างคลัง
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Media & Photo */}
              {activeTab === 'logistics' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">รูปภาพ (Media & Photo)</h3>

                  {/* Image URL Input */}
                  <div>
                    <LabelWithTooltip label="ลิงก์รูปภาพสินค้า (Image URL)" tooltip="ใส่ลิงก์รูปภาพจากแหล่งอื่น (เช่น Google Drive, Dropbox)" />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => {
                          setFormData({ ...formData, image_url: e.target.value })
                          setImagePreview(e.target.value)
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/image.jpg"
                      />
                      {formData.image_url && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setFormData({ ...formData, image_url: '' })
                            setImagePreview('')
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">คัดลอกลิงก์รูปภาพจากแหล่งอื่นมาวางได้เลย</p>
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t"></div>
                    <span className="text-sm text-gray-500">หรือ</span>
                    <div className="flex-1 border-t"></div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      อัปโหลดรูปภาพ (อัปโหลดได้สูงสุด 9 รูป)
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
                  <p className="text-sm text-gray-600">เลือกช่องทางที่ต้องการเปิดขาย กำหนดราคา และใส่ลิงก์สินค้า (คลิกไอคอนลิงก์เพื่อเปิดหน้าสินค้า)</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* POS */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_pos}
                            onChange={(e) => setFormData({ ...formData, sell_on_pos: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <span className="font-medium text-sm">หน้าร้าน</span>
                        </label>
                        {formData.url_pos && (
                          <a href={formData.url_pos} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_pos}
                        onChange={(e) => setFormData({ ...formData, price_pos: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_pos}
                        onChange={(e) => setFormData({ ...formData, url_pos: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* GRAB */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_grab}
                            onChange={(e) => setFormData({ ...formData, sell_on_grab: e.target.checked })}
                            className="h-4 w-4 text-green-600 rounded"
                          />
                          <span className="font-medium text-sm">GRAB</span>
                        </label>
                        {formData.url_grab && (
                          <a href={formData.url_grab} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_grab}
                        onChange={(e) => setFormData({ ...formData, price_grab: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_grab}
                        onChange={(e) => setFormData({ ...formData, url_grab: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* LINEMAN */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_lineman}
                            onChange={(e) => setFormData({ ...formData, sell_on_lineman: e.target.checked })}
                            className="h-4 w-4 text-green-600 rounded"
                          />
                          <span className="font-medium text-sm">LINEMAN</span>
                        </label>
                        {formData.url_lineman && (
                          <a href={formData.url_lineman} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_lineman}
                        onChange={(e) => setFormData({ ...formData, price_lineman: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_lineman}
                        onChange={(e) => setFormData({ ...formData, url_lineman: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* LAZADA */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_lazada}
                            onChange={(e) => setFormData({ ...formData, sell_on_lazada: e.target.checked })}
                            className="h-4 w-4 text-orange-600 rounded"
                          />
                          <span className="font-medium text-sm">LAZADA</span>
                        </label>
                        {formData.url_lazada && (
                          <a href={formData.url_lazada} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_lazada}
                        onChange={(e) => setFormData({ ...formData, price_lazada: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_lazada}
                        onChange={(e) => setFormData({ ...formData, url_lazada: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* SHOPEE */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_shopee}
                            onChange={(e) => setFormData({ ...formData, sell_on_shopee: e.target.checked })}
                            className="h-4 w-4 text-orange-600 rounded"
                          />
                          <span className="font-medium text-sm">SHOPEE</span>
                        </label>
                        {formData.url_shopee && (
                          <a href={formData.url_shopee} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_shopee}
                        onChange={(e) => setFormData({ ...formData, price_shopee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_shopee}
                        onChange={(e) => setFormData({ ...formData, url_shopee: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* LINE SHOPPING */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_line_shopping}
                            onChange={(e) => setFormData({ ...formData, sell_on_line_shopping: e.target.checked })}
                            className="h-4 w-4 text-green-600 rounded"
                          />
                          <span className="font-medium text-sm">LINE SHOPPING</span>
                        </label>
                        {formData.url_line_shopping && (
                          <a href={formData.url_line_shopping} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_line_shopping}
                        onChange={(e) => setFormData({ ...formData, price_line_shopping: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_line_shopping}
                        onChange={(e) => setFormData({ ...formData, url_line_shopping: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* TIKTOK */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_tiktok}
                            onChange={(e) => setFormData({ ...formData, sell_on_tiktok: e.target.checked })}
                            className="h-4 w-4 text-pink-600 rounded"
                          />
                          <span className="font-medium text-sm">TIKTOK</span>
                        </label>
                        {formData.url_tiktok && (
                          <a href={formData.url_tiktok} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_tiktok}
                        onChange={(e) => setFormData({ ...formData, price_tiktok: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_tiktok}
                        onChange={(e) => setFormData({ ...formData, url_tiktok: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* CONSIGNMENT - ฝากขาย */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_consignment}
                            onChange={(e) => setFormData({ ...formData, sell_on_consignment: e.target.checked })}
                            className="h-4 w-4 text-purple-600 rounded"
                          />
                          <span className="font-medium text-sm">ฝากขาย (Consignment)</span>
                        </label>
                        {formData.url_consignment && (
                          <a href={formData.url_consignment} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_consignment}
                        onChange={(e) => setFormData({ ...formData, price_consignment: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_consignment}
                        onChange={(e) => setFormData({ ...formData, url_consignment: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* WEBSITE */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.sell_on_website}
                            onChange={(e) => setFormData({ ...formData, sell_on_website: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <span className="font-medium text-sm">Website</span>
                        </label>
                        {formData.url_website && (
                          <a href={formData.url_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_website}
                        onChange={(e) => setFormData({ ...formData, price_website: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        placeholder="0.00"
                      />
                      <div className="text-xs text-gray-500 mb-1">ลิงก์สินค้า</div>
                      <input
                        type="url"
                        value={formData.url_website}
                        onChange={(e) => setFormData({ ...formData, url_website: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
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
