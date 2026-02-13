import { useEffect, useState } from 'react'
import { useProductStore } from '../stores/productStore'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { LabelWithTooltip } from '../components/common/Tooltip'
import CSVImportModal from '../components/common/CSVImportModal'
import { Search, Plus, X, Filter, Upload, Package, Store, ShoppingCart, Truck, Globe, MessageCircle, Video, Warehouse, ArrowRightLeft, Printer, ExternalLink, ArrowLeft, Bell, LayoutDashboard, Fingerprint, FolderTree, DollarSign, Boxes, Image, Radio, AlertTriangle } from 'lucide-react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
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
  image_urls: string[]
  
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

  // 8. Alerts
  alert_out_of_stock: boolean
  alert_out_of_stock_message: string
  alert_low_stock: boolean
  alert_low_stock_message: string
  alert_expiry: boolean
  alert_expiry_message: string
  alert_expiry_days: number
  alert_custom: boolean
  alert_custom_title: string
  alert_custom_message: string

  // 9. Label (ฉลาก)
  label_dosage_instructions_th: string
  label_special_instructions_th: string
  label_dosage_instructions_en: string
  label_special_instructions_en: string
  label_custom_line1: string
  label_custom_line2: string
  label_custom_line3: string
}

const initialFormData: ProductFormData = {
  barcode: '',
  sku: '',
  name_th: '',
  name_en: '',
  product_type: 'finished_goods',
  brand: '',
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
  image_urls: [],
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
  url_website: '',
  // 8. Alerts
  alert_out_of_stock: false,
  alert_out_of_stock_message: '',
  alert_low_stock: false,
  alert_low_stock_message: '',
  alert_expiry: false,
  alert_expiry_message: '',
  alert_expiry_days: 30,
  alert_custom: false,
  alert_custom_title: '',
  alert_custom_message: '',
  // 9. Label (ฉลาก)
  label_dosage_instructions_th: '',
  label_special_instructions_th: '',
  label_dosage_instructions_en: '',
  label_special_instructions_en: '',
  label_custom_line1: '',
  label_custom_line2: '',
  label_custom_line3: ''
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
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(Array(9).fill(null))
  const [imagePreviews, setImagePreviews] = useState<string[]>(Array(9).fill(''))
  const [activeTab, setActiveTab] = useState<'dashboard' | 'identification' | 'categorization' | 'financials' | 'inventory' | 'logistics' | 'channels' | 'movements' | 'alerts' | 'label'>('dashboard')
  const [inventorySubTab, setInventorySubTab] = useState<'general' | 'warehouse'>('general')
  const [labelSubTab, setLabelSubTab] = useState<'thai' | 'english' | 'custom'>('thai')
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [movementLoading, setMovementLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [productWarehouseStocks, setProductWarehouseStocks] = useState<Record<string, number>>({})
  const [showCategoryTable, setShowCategoryTable] = useState(true)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
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
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchWarehouses()
    
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

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('is_main', { ascending: false })
    if (data) setWarehouses(data)
  }

  const fetchProductWarehouseStocks = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_stock')
        .select('*')
        .eq('product_id', productId)
      
      if (error) {
        console.error('Error fetching product warehouse stocks:', error)
        return
      }
      
      const stockMap: Record<string, number> = {}
      data?.forEach((ps: any) => {
        stockMap[ps.warehouse_id] = ps.quantity
      })
      
      setProductWarehouseStocks(stockMap)
    } catch (err) {
      console.error('Exception fetching product warehouse stocks:', err)
    }
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
    setProductWarehouseStocks({})
    setFormData({
      barcode: product.barcode,
      sku: product.sku,
      name_th: product.name_th,
      name_en: product.name_en || '',
      product_type: product.product_type || 'finished_goods',
      brand: product.brand || '',
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
      image_urls: product.image_urls || [],
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
      url_website: product.url_website || '',
      // 8. Alerts
      alert_out_of_stock: product.alert_out_of_stock || false,
      alert_out_of_stock_message: product.alert_out_of_stock_message || '',
      alert_low_stock: product.alert_low_stock || false,
      alert_low_stock_message: product.alert_low_stock_message || '',
      alert_expiry: product.alert_expiry || false,
      alert_expiry_message: product.alert_expiry_message || '',
      alert_expiry_days: product.alert_expiry_days || 30,
      alert_custom: product.alert_custom || false,
      alert_custom_title: product.alert_custom_title || '',
      alert_custom_message: product.alert_custom_message || '',
      // 9. Label (ฉลาก)
      label_dosage_instructions_th: product.label_dosage_instructions_th || '',
      label_special_instructions_th: product.label_special_instructions_th || '',
      label_dosage_instructions_en: product.label_dosage_instructions_en || '',
      label_special_instructions_en: product.label_special_instructions_en || '',
      label_custom_line1: product.label_custom_line1 || '',
      label_custom_line2: product.label_custom_line2 || '',
      label_custom_line3: product.label_custom_line3 || ''
    })
    setImagePreviews(product.image_urls?.slice(0, 9).concat(Array(9 - (product.image_urls?.length || 0)).fill('')) || Array(9).fill(''))
    setActiveTab('dashboard')
    setShowCategoryTable(!product.category_id)
    setInventorySubTab('general')
    
    // Fetch warehouse stocks and movement history for this product
    if (product.id) {
      fetchProductWarehouseStocks(product.id)
      fetchMovementHistory(product.id)
    }
    
    setShowModal(true)
  }

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const newFiles = [...imageFiles]
      newFiles[index] = file
      setImageFiles(newFiles)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        const newPreviews = [...imagePreviews]
        newPreviews[index] = reader.result as string
        setImagePreviews(newPreviews)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = (index: number) => {
    const newFiles = [...imageFiles]
    newFiles[index] = null
    setImageFiles(newFiles)
    
    const newPreviews = [...imagePreviews]
    newPreviews[index] = ''
    setImagePreviews(newPreviews)
    
    // Also update formData image_urls
    const newUrls = [...(formData.image_urls || [])]
    newUrls[index] = ''
    setFormData({ ...formData, image_urls: newUrls.filter(url => url) })
  }

  const fetchMovementHistory = async (productId: string) => {
    setMovementLoading(true)
    try {
      // Fetch all movement sources in parallel
      const [
        stockMovementsResult,
        orderItemsResult,
        purchaseItemsResult,
        productResult
      ] = await Promise.all([
        // 1. Stock movements
        supabase
          .from('stock_movements')
          .select(`
            *,
            batch:stock_batches(batch_number)
          `)
          .eq('product_id', productId)
          .order('movement_date', { ascending: false })
          .limit(50),
        
        // 2. Sales from order_items - simplified query
        supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            unit_price,
            created_at,
            order:orders(
              id,
              order_number,
              customer_name,
              created_at,
              is_cancelled
            )
          `)
          .eq('product_id', productId)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // 3. Purchase order items
        supabase
          .from('purchase_order_items')
          .select(`
            id,
            quantity,
            unit_price,
            received_quantity,
            created_at,
            purchase_order:purchase_orders!inner(
              id,
              po_number,
              supplier_name,
              status,
              created_at
            )
          `)
          .eq('product_id', productId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        // 4. Product info for opening stock
        supabase
          .from('products')
          .select('opening_stock_date, stock_quantity, created_at')
          .eq('id', productId)
          .single()
      ])

      const allMovements: any[] = []

      // Add stock movements
      if (!stockMovementsResult.error && stockMovementsResult.data) {
        stockMovementsResult.data.forEach((m: any) => {
          allMovements.push({
            id: m.id,
            date: m.movement_date,
            type: m.movement_type === 'purchase' ? 'ซื้อเข้า' 
              : m.movement_type === 'sale' ? 'ขายออก'
              : m.movement_type === 'adjustment' ? 'ปรับสต็อก'
              : m.movement_type === 'return' ? 'รับคืน'
              : 'โอนย้าย',
            quantity: m.quantity,
            quantity_before: m.quantity_before,
            quantity_after: m.quantity_after,
            from: m.reference_type === 'purchase_order' ? `PO: ${m.notes || '-'}` : m.reason || '-',
            to: m.batch?.batch_number ? `Batch: ${m.batch.batch_number}` : '-',
            partner: m.reason || '-',
            notes: m.notes || '',
            unit_cost: m.unit_cost,
            reference_type: m.reference_type,
            reference_id: m.reference_id,
            sortDate: new Date(m.movement_date).getTime()
          })
        })
      }

      // Add sales from order_items (filter out cancelled in JS)
      if (!orderItemsResult.error && orderItemsResult.data) {
        console.log('Order items found:', orderItemsResult.data.length)
        orderItemsResult.data.forEach((item: any) => {
          if (item.order && !item.order.is_cancelled) {
            allMovements.push({
              id: `sale_${item.id}`,
              date: item.created_at || item.order.created_at,
              type: 'ขายออก',
              quantity: -Math.abs(item.quantity),
              quantity_before: null,
              quantity_after: null,
              from: 'สต็อก',
              to: 'ลูกค้า',
              partner: item.order.customer_name || 'ลูกค้า',
              notes: `Order: ${item.order.order_number}`,
              unit_cost: item.unit_price,
              reference_type: 'order',
              reference_id: item.order.id,
              sortDate: new Date(item.created_at || item.order.created_at).getTime()
            })
          }
        })
      } else if (orderItemsResult.error) {
        console.error('Error fetching order items:', orderItemsResult.error)
      }

      // Add purchase order items
      if (!purchaseItemsResult.error && purchaseItemsResult.data) {
        purchaseItemsResult.data.forEach((item: any) => {
          if (item.purchase_order) {
            allMovements.push({
              id: `po_${item.id}`,
              date: item.purchase_order.created_at,
              type: 'ซื้อเข้า',
              quantity: item.received_quantity || item.quantity,
              quantity_before: null,
              quantity_after: null,
              from: item.purchase_order.supplier_name || 'ซัพพลายเออร์',
              to: 'สต็อก',
              partner: item.purchase_order.supplier_name || '-',
              notes: `PO: ${item.purchase_order.po_number} (${item.purchase_order.status})`,
              unit_cost: item.unit_price,
              reference_type: 'purchase_order',
              reference_id: item.purchase_order.id,
              sortDate: new Date(item.purchase_order.created_at).getTime()
            })
          }
        })
      }

      // Add opening stock if available
      if (!productResult.error && productResult.data?.opening_stock_date) {
        allMovements.push({
          id: `opening_${productId}`,
          date: productResult.data.opening_stock_date,
          type: 'ยอดยกมา',
          quantity: productResult.data.stock_quantity,
          quantity_before: 0,
          quantity_after: productResult.data.stock_quantity,
          from: '-',
          to: 'สต็อกเริ่มต้น',
          partner: '-',
          notes: 'ยอดสต็อกเริ่มต้น',
          unit_cost: null,
          reference_type: 'opening_stock',
          reference_id: null,
          sortDate: new Date(productResult.data.opening_stock_date).getTime()
        })
      }

      // Sort by date descending
      allMovements.sort((a, b) => b.sortDate - a.sortDate)

      setMovementHistory(allMovements.slice(0, 50))
    } catch (err) {
      console.error('Exception fetching movement history:', err)
      setMovementHistory([])
    } finally {
      setMovementLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const startTime = performance.now()
    console.log('[SAVE] Starting save process...')
    
    // Validate: at least one of name_th, sku, or barcode is required
    if (!formData.name_th.trim() && !formData.sku.trim() && !formData.barcode.trim()) {
      setSaveMessage({ type: 'error', text: 'กรุณากรอกอย่างน้อย 1 อย่าง: Product Name, SKU หรือ Barcode' })
      alert('กรุณากรอกอย่างน้อย 1 อย่าง: Product Name, SKU หรือ Barcode')
      return
    }
    
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      let imageUrls: string[] = [...(formData.image_urls || [])]

      // Only upload images that are new File objects (not already URLs)
      const newImageFiles = imageFiles.filter((file): file is File => file !== null)
      
      if (newImageFiles.length > 0) {
        console.log(`[SAVE] Uploading ${newImageFiles.length} images...`)
        const uploadStart = performance.now()
        
        // Upload new images in parallel
        const uploadPromises = newImageFiles.map(async (file, idx) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}_${idx}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, file)
          
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName)
          
          return { index: imageFiles.indexOf(file), url: publicUrl }
        })
        
        const uploadedImages = await Promise.all(uploadPromises)
        uploadedImages.forEach(({ index, url }) => {
          imageUrls[index] = url
        })
        console.log(`[SAVE] Images uploaded in ${(performance.now() - uploadStart).toFixed(0)}ms`)
      }

      console.log('[SAVE] Preparing product data...')
      const dataStart = performance.now()
      
      const productData = {
        barcode: formData.barcode || '',
        sku: formData.sku || '',
        name_th: formData.name_th || '',
        name_en: formData.name_en || '',
        product_type: formData.product_type,
        brand: formData.brand,
        is_active: formData.is_active,
        stock_tracking_type: formData.stock_tracking_type,
        category_id: formData.category_id || null,
        base_price: formData.base_price,
        cost_price: formData.cost_price,
        purchase_price_excl_vat: formData.purchase_price_excl_vat,
        cost_per_unit: formData.cost_per_unit,
        selling_price_excl_vat: formData.selling_price_excl_vat,
        selling_price_incl_vat: formData.selling_price_incl_vat,
        original_price: formData.original_price,
        wholesale_price: formData.wholesale_price,
        unit: formData.unit || 'ชิ้น',
        stock_quantity: formData.stock_quantity,
        min_stock_level: formData.min_stock_level,
        image_url: imageUrls[0] || '',
        image_urls: imageUrls.filter(url => url),
        // Extended fields
        description_th: formData.description_th,
        description_en: formData.description_en,
        indications: formData.indications,
        usage_instructions: formData.usage_instructions,
        active_ingredient: formData.active_ingredient,
        internal_notes: formData.internal_notes,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        weight_grams: formData.weight_grams,
        width_cm: formData.width_cm,
        length_cm: formData.length_cm,
        height_cm: formData.height_cm,
        expiry_date: formData.expiry_date || null,
        lot_number: formData.lot_number,
        packaging_size: formData.packaging_size,
        opening_stock_date: formData.opening_stock_date || null,
        // Sales Channels
        sell_on_pos: formData.sell_on_pos,
        sell_on_grab: formData.sell_on_grab,
        sell_on_lineman: formData.sell_on_lineman,
        sell_on_lazada: formData.sell_on_lazada,
        sell_on_shopee: formData.sell_on_shopee,
        sell_on_line_shopping: formData.sell_on_line_shopping,
        sell_on_tiktok: formData.sell_on_tiktok,
        sell_on_consignment: formData.sell_on_consignment,
        sell_on_website: formData.sell_on_website,
        price_pos: formData.price_pos,
        price_grab: formData.price_grab,
        price_lineman: formData.price_lineman,
        price_lazada: formData.price_lazada,
        price_shopee: formData.price_shopee,
        price_line_shopping: formData.price_line_shopping,
        price_tiktok: formData.price_tiktok,
        price_consignment: formData.price_consignment,
        price_website: formData.price_website,
        url_pos: formData.url_pos,
        url_grab: formData.url_grab,
        url_lineman: formData.url_lineman,
        url_lazada: formData.url_lazada,
        url_shopee: formData.url_shopee,
        url_line_shopping: formData.url_line_shopping,
        url_tiktok: formData.url_tiktok,
        url_consignment: formData.url_consignment,
        url_website: formData.url_website,
        // Alerts
        alert_out_of_stock: formData.alert_out_of_stock,
        alert_out_of_stock_message: formData.alert_out_of_stock_message,
        alert_low_stock: formData.alert_low_stock,
        alert_low_stock_message: formData.alert_low_stock_message,
        alert_expiry: formData.alert_expiry,
        alert_expiry_message: formData.alert_expiry_message,
        alert_expiry_days: formData.alert_expiry_days,
        alert_custom: formData.alert_custom,
        alert_custom_title: formData.alert_custom_title,
        alert_custom_message: formData.alert_custom_message,
        // Label (ฉลาก)
        label_dosage_instructions_th: formData.label_dosage_instructions_th,
        label_special_instructions_th: formData.label_special_instructions_th,
        label_dosage_instructions_en: formData.label_dosage_instructions_en,
        label_special_instructions_en: formData.label_special_instructions_en,
        label_custom_line1: formData.label_custom_line1,
        label_custom_line2: formData.label_custom_line2,
        label_custom_line3: formData.label_custom_line3
      }

      console.log(`[SAVE] Data prepared in ${(performance.now() - dataStart).toFixed(0)}ms`)
      
      if (editingProduct) {
        console.log('[SAVE] Starting UPDATE operation...')
        const updateStart = performance.now()
        // Use upsert with onConflict to avoid slow FK constraint checks
        const { error } = await supabase
          .from('products')
          .upsert({
            id: editingProduct.id,
            ...productData
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
        console.log(`[SAVE] UPDATE (upsert) completed in ${(performance.now() - updateStart).toFixed(0)}ms`)
        if (error) throw error
      } else {
        console.log('[SAVE] Starting INSERT operation...')
        const insertStart = performance.now()
        const { error } = await supabase
          .from('products')
          .insert([productData])
        console.log(`[SAVE] INSERT completed in ${(performance.now() - insertStart).toFixed(0)}ms`)
        if (error) throw error
      }

      alert(editingProduct ? 'บันทึกการแก้ไขสินค้าสำเร็จ!' : 'สร้างสินค้าใหม่สำเร็จ!')
      setSaveMessage({ type: 'success', text: editingProduct ? 'บันทึกการแก้ไขสินค้าสำเร็จ!' : 'สร้างสินค้าใหม่สำเร็จ!' })
      setShowModal(false)
      resetForm()
      // Skip fetchProducts to make save faster - user can refresh manually if needed
      // fetchProducts()
      
      console.log(`[SAVE] Total save time: ${(performance.now() - startTime).toFixed(0)}ms`)
    } catch (error: any) {
      console.error('Error saving product:', error)
      const errorMsg = error?.message || error?.error_description || 'ไม่สามารถบันทึกสินค้าได้ กรุณาลองใหม่อีกครั้ง'
      setSaveMessage({ type: 'error', text: errorMsg })
      alert('บันทึกไม่สำเร็จ: ' + errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setEditingProduct(null)
    setImageFiles(Array(9).fill(null))
    setImagePreviews(Array(9).fill(''))
    setActiveTab('dashboard')
    setShowCategoryTable(true)
    setLabelSubTab('thai')
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-[#7D735F]" />
            {selectedCategory && selectedCategory !== 'uncategorized'
              ? categories.find(c => c.id === selectedCategory)?.name_th || t('products.title')
              : selectedCategory === 'uncategorized'
                ? 'สินค้ายังไม่ตั้งหมวดหมู่'
                : t('products.title')
            }
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowCSVModal(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            นำเข้า CSV
          </Button>
          <Link 
            to="/stock-management"
            className="flex items-center gap-2 px-4 py-2 bg-[#F5F0E6] rounded-full border border-[#B8C9B8] hover:bg-[#E8EBF0] hover:shadow-md transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-[#A67B5B] flex items-center justify-center shadow-sm">
              <Boxes className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">จัดการสต็อก</span>
          </Link>
          <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            {t('products.addProduct')}
          </Button>
        </div>
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
              <div className="bg-white rounded-xl border border-[#B8C9B8] p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600 mb-3">หมวดหมู่ย่อย:</p>
                <div className="flex flex-wrap gap-2">
                  {allDescendants.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/products?category=${cat.id}`)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        cat.parent_id === selectedCategory
                          ? 'bg-[#7D735F]/10 hover:bg-[#7D735F]/20 text-[#7D735F] border border-[#7D735F]/30'
                          : 'bg-[#F5F0E6] hover:bg-[#E8EBF0] text-gray-700 border border-[#B8C9B8]'
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
              <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-[#7D735F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B8C9B8] transition-all">
                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('products.search')}
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
                />
              </div>
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
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">{t('products.image')}</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">{t('products.barcode')}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-96">{t('products.name')}</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">{t('products.price')}</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">{t('products.stock')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                            <td className="px-2 py-3 whitespace-nowrap">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name_th} className="h-10 w-10 object-cover rounded-lg border" />
                              ) : (
                                <div className="h-10 w-10 bg-gray-100 rounded-lg border flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-28 truncate">{product.barcode}</td>
                            <td className="px-3 py-3 whitespace-nowrap max-w-96">
                              <div className="text-sm font-medium text-gray-900 truncate">{product.name_th}</div>
                              {product.name_en && <div className="text-xs text-gray-500 truncate">{product.name_en}</div>}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                            <td className="px-2 py-3 whitespace-nowrap">
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
                  // This handles the case where leaf categories have same names under different parents
                  const categoryToParentTypeMap = new Map<string, 'ยาควบคุม' | 'ยาสามัญ'>()
                  
                  subCategories.forEach(subCat => {
                    // Determine parent type from subcategory name
                    const parentType: 'ยาควบคุม' | 'ยาสามัญ' = 
                      subCat.name_th.includes('ควบคุม') || subCat.name_th.includes('Prescription')
                        ? 'ยาควบคุม'
                        : 'ยาสามัญ'
                    
                    // Get grandchildren of this subcategory
                    const grandChildren = categories.filter(c => c.parent_id === subCat.id)
                    if (grandChildren.length > 0) {
                      // Map each grandchild ID to its parent's type
                      grandChildren.forEach(gc => {
                        categoryToParentTypeMap.set(gc.id, parentType)
                      })
                    } else {
                      // This subcategory itself is a leaf - map its ID to its type
                      categoryToParentTypeMap.set(subCat.id, parentType)
                    }
                  })
                  
                  // Group products by leaf category name
                  const productsByLeafCatName = new Map<string, { product: Product; parentType: 'ยาควบคุม' | 'ยาสามัญ' }[]>()
                  
                  filteredProducts.forEach(product => {
                    const catId = product.category_id
                    const parentType = catId ? categoryToParentTypeMap.get(catId) || 'ยาสามัญ' : 'ยาสามัญ'
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
                                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">{t('products.image')}</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">{t('products.barcode')}</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-96">{t('products.name')}</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('products.price')}</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">{t('products.stock')}</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {productsWithType.map(({ product }) => (
                                  <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                    <td className="px-2 py-3 whitespace-nowrap">
                                      {product.image_url ? (
                                        <img src={product.image_url} alt={product.name_th} className="h-10 w-10 object-cover rounded-lg border" />
                                      ) : (
                                        <div className="h-10 w-10 bg-gray-100 rounded-lg border flex items-center justify-center">
                                          <Package className="h-5 w-5 text-gray-400" />
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">{product.barcode}</td>
                                    <td className="px-3 py-3 whitespace-nowrap max-w-96">
                                      <div className="text-sm font-medium text-gray-900 truncate">{product.name_th}</div>
                                      {product.name_en && <div className="text-xs text-gray-500 truncate">{product.name_en}</div>}
                                    </td>
                                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                                    <td className="px-2 py-3 whitespace-nowrap">
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
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">{t('products.image')}</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">{t('products.barcode')}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-96">{t('products.name')}</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('products.price')}</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">{t('products.stock')}</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {subProducts.map((product) => (
                                <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    {product.image_url ? (
                                      <img src={product.image_url} alt={product.name_th} className="h-10 w-10 object-cover rounded-lg border" />
                                    ) : (
                                      <div className="h-10 w-10 bg-gray-100 rounded-lg border flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-28 truncate">{product.barcode}</td>
                                  <td className="px-3 py-3 whitespace-nowrap max-w-96">
                                    <div className="text-sm font-medium text-gray-900 truncate">{product.name_th}</div>
                                    {product.name_en && <div className="text-xs text-gray-500 truncate">{product.name_en}</div>}
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                                  <td className="px-2 py-3 whitespace-nowrap">
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
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">{t('products.image')}</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">{t('products.barcode')}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-96">{t('products.name')}</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('products.price')}</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">{t('products.stock')}</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {otherProducts.map((product) => (
                                <tr key={product.id} onClick={() => handleEdit(product)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    {product.image_url ? (
                                      <img src={product.image_url} alt={product.name_th} className="h-10 w-10 object-cover rounded-lg border" />
                                    ) : (
                                      <div className="h-10 w-10 bg-gray-100 rounded-lg border flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-28 truncate">{product.barcode}</td>
                                  <td className="px-3 py-3 whitespace-nowrap max-w-96">
                                    <div className="text-sm font-medium text-gray-900 truncate">{product.name_th}</div>
                                    {product.name_en && <div className="text-xs text-gray-500 truncate">{product.name_en}</div>}
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">฿{product.base_price.toFixed(2)}</td>
                                  <td className="px-2 py-3 whitespace-nowrap">
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
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                ภาพรวม
              </button>
                <button
                type="button"
                onClick={() => setActiveTab('identification')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'identification' ? 'bg-gray-200 text-gray-800 border border-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Fingerprint className="h-4 w-4" />
                รายละเอียดสินค้า
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('categorization')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'categorization' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <FolderTree className="h-4 w-4" />
                หมวดหมู่
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financials')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'financials' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <DollarSign className="h-4 w-4" />
                ราคา
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Boxes className="h-4 w-4" />
                สต็อก
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logistics')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'logistics' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Image className="h-4 w-4" />
                รูปภาพ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('channels')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'channels' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Radio className="h-4 w-4" />
                ช่องทางขาย
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('movements')
                  if (editingProduct) {
                    fetchMovementHistory(editingProduct.id)
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'movements' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <ArrowRightLeft className="h-4 w-4" />
                เคลื่อนไหว
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'alerts' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <AlertTriangle className="h-4 w-4" />
                แจ้งเตือน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('label')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'label' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Printer className="h-4 w-4" />
                ฉลาก
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
                      {imagePreviews[0] ? (
                        <img
                          src={imagePreviews[0]}
                          alt={formData.name_th}
                          className="h-32 w-32 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="h-32 w-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Basic Info */}
                    <div className="flex-1 space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">ชื่อสินค้า</div>
                        <div className="text-lg font-bold text-gray-900">{formData.name_th || '-'}</div>
                        {formData.name_en && (
                          <div className="text-sm text-gray-600">{formData.name_en}</div>
                        )}
                        {/* Active Ingredient - ตัวยาสำคัญ */}
                        {formData.active_ingredient && (
                          <div className="mt-2 text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                            ตัวยาสำคัญ: {formData.active_ingredient}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="text-xs text-gray-500">Barcode</div>
                          <div className="text-sm font-medium text-gray-900 font-mono">{formData.barcode || '-'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="text-xs text-gray-500">SKU</div>
                          <div className="text-sm font-medium text-gray-900">{formData.sku || '-'}</div>
                        </div>
                      </div>
                      
                      {formData.brand && (
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="text-xs text-gray-500">ยี่ห้อ</div>
                          <div className="text-sm font-medium text-gray-900">{formData.brand}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Stats Grid - Cleaner Design */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Price */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 font-medium">ราคาขาย (รวม VAT)</div>
                      <div className="text-xl font-bold text-gray-800">
                        ฿{formData.selling_price_incl_vat > 0 ? formData.selling_price_incl_vat.toFixed(2) : formData.base_price.toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Stock */}
                    <div className={`rounded-lg p-3 border ${formData.stock_quantity <= formData.min_stock_level ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="text-xs font-medium text-gray-500">
                        สต็อกคงเหลือ
                      </div>
                      <div className={`text-xl font-bold ${formData.stock_quantity <= formData.min_stock_level ? 'text-red-600' : 'text-gray-800'}`}>
                        {formData.stock_quantity} {formData.unit}
                      </div>
                      {formData.stock_quantity <= formData.min_stock_level && (
                        <div className="text-xs text-red-500">ใกล้หมด</div>
                      )}
                    </div>
                    
                    {/* Category */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 font-medium">หมวดหมู่</div>
                      <div className="text-sm font-bold text-gray-800">
                        {categories.find(c => c.id === formData.category_id)?.name_th || 'ไม่ระบุ'}
                      </div>
                    </div>
                    
                    {/* Expiry */}
                    <div className={`rounded-lg p-3 border ${formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`text-xs font-medium ${formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-600' : 'text-gray-500'}`}>
                        วันหมดอายุ
                      </div>
                      <div className={`text-sm font-bold ${formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-700' : 'text-gray-800'}`}>
                        {formData.expiry_date ? new Date(formData.expiry_date).toLocaleDateString('th-TH') : '-'}
                      </div>
                      {formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                        <div className="text-xs text-orange-500">ใกล้หมดอายุ</div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {formData.tags && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Tag สินค้า</div>
                      <div className="flex flex-wrap gap-1">
                        {formData.tags.split(',').map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indications & Usage */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.indications && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-xs text-gray-600 font-medium mb-1">สรรพคุณ / ข้อบ่งใช้</div>
                        <div className="text-sm text-gray-700">{formData.indications}</div>
                      </div>
                    )}
                    {formData.usage_instructions && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-xs text-gray-600 font-medium mb-1">คำแนะนำเพิ่มเติม</div>
                        <div className="text-sm text-gray-700">{formData.usage_instructions}</div>
                      </div>
                    )}
                  </div>

                  {/* Sales Channels Icons - Muted Colors */}
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">ช่องทางการขาย</div>
                    <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_pos ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <Store className="h-3.5 w-3.5" />
                        <span>หน้าร้าน</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_grab ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>Grab</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_lineman ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <Truck className="h-3.5 w-3.5" />
                        <span>Lineman</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_lazada ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <Globe className="h-3.5 w-3.5" />
                        <span>Lazada</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_shopee ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>Shopee</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_line_shopping ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>LINE</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_tiktok ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <Video className="h-3.5 w-3.5" />
                        <span>TikTok</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_consignment ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>ฝากขาย</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${formData.sell_on_website ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400'}`}>
                        <Globe className="h-3.5 w-3.5" />
                        <span>Website</span>
                      </div>
                    </div>
                  </div>

                  {/* Custom Alert Display */}
                  {formData.alert_custom && formData.alert_custom_title && (
                    <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <Bell className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-red-800 mb-1">
                            {formData.alert_custom_title}
                          </h4>
                          {formData.alert_custom_message && (
                            <p className="text-red-700 text-sm">
                              {formData.alert_custom_message}
                            </p>
                          )}
                          <p className="text-xs text-red-500 mt-2">
                            แจ้งเตือนนี้จะแสดงเมื่อขายสินค้า (POS)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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
                        // Navigate to medicine label page with product data including new label fields
                        const labelData = {
                          product_name: formData.name_th,
                          product_name_en: formData.name_en,
                          barcode: formData.barcode,
                          dosage: formData.packaging_size,
                          active_ingredient: formData.active_ingredient,
                          lot_number: formData.lot_number,
                          expiry_date: formData.expiry_date,
                          // New label fields from the product form
                          label_dosage_instructions_th: formData.label_dosage_instructions_th,
                          label_special_instructions_th: formData.label_special_instructions_th,
                          label_dosage_instructions_en: formData.label_dosage_instructions_en,
                          label_special_instructions_en: formData.label_special_instructions_en,
                          label_custom_line1: formData.label_custom_line1,
                          label_custom_line2: formData.label_custom_line2,
                          label_custom_line3: formData.label_custom_line3
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

              {/* Tab 1: รายละเอียดสินค้า */}
              {activeTab === 'identification' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">รายละเอียดสินค้า</h3>
                  
                  {/* Description Field - Added */}
                  <div>
                    <LabelWithTooltip label="คำอธิบายสินค้า" tooltip="คำอธิบายสั้นๆ สำหรับแสดงหน้าร้าน" />
                    <textarea
                      value={formData.description_th}
                      onChange={(e) => setFormData({ ...formData, description_th: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      rows={3}
                      placeholder="คำอธิบายสินค้าที่จะแสดงให้ลูกค้าเห็น"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip label="Code/SKU (รหัสสินค้า)" tooltip="จำเป็นอย่างน้อย 1 อย่าง: SKU, Barcode หรือ Product Name" />
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Barcode (รหัสบาร์โค้ด)" tooltip="เลข 13 หลักตามตัวสินค้า" />
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => {
                          const barcode = e.target.value
                          setFormData({ 
                            ...formData, 
                            barcode,
                            sku: formData.sku || barcode // Auto-fill SKU if empty
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <LabelWithTooltip label="Product Name (ชื่อภาษาไทย)" tooltip="จำเป็นอย่างน้อย 1 อย่าง: SKU, Barcode หรือ Product Name" />
                    <input
                      type="text"
                      value={formData.name_th}
                      onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <LabelWithTooltip label="Brand (ยี่ห้อ)" tooltip="ยี่ห้อสินค้า เช่น GSK, Pfizer, หรือผู้ผลิตในประเทศ" />
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="เช่น GSK, Unilever, ศิริราช"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 h-full py-2">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <span className={`text-sm font-medium ${formData.is_active ? 'text-green-700' : 'text-red-600'}`}>
                          {formData.is_active ? '✓ Active (ขายอยู่)' : '✗ Inactive (ระงับการขาย)'}
                        </span>
                      </label>
                    </div>
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
                    
                    {/* Selected Category Display - Collapsed View */}
                    {formData.category_id && !showCategoryTable && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                              const selectedCat = categories.find(c => c.id === formData.category_id)
                              if (!selectedCat) return null
                              
                              // Find parent chain
                              const parentChain: Category[] = []
                              let current = selectedCat
                              while (current.parent_id) {
                                const parent = categories.find(c => c.id === current.parent_id)
                                if (parent) {
                                  parentChain.unshift(parent)
                                  current = parent
                                } else {
                                  break
                                }
                              }
                              
                              return (
                                <>
                                  {parentChain.map((cat, idx) => (
                                    <span key={cat.id} className="inline-flex items-center gap-1">
                                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md font-medium">
                                        {cat.name_th}
                                      </span>
                                      {idx < parentChain.length && (
                                        <span className="text-gray-400">›</span>
                                      )}
                                    </span>
                                  ))}
                                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-md font-semibold">
                                    {selectedCat.name_th}
                                  </span>
                                </>
                              )
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCategoryTable(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            เปลี่ยนหมวดหมู่
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Hierarchical Category Table - Expandable */}
                    {showCategoryTable && (
                      <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto mt-2">
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
                                        onChange={(e) => {
                                          setFormData({ ...formData, category_id: e.target.value })
                                          setShowCategoryTable(false)
                                        }}
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
                                                  onChange={(e) => {
                                                    setFormData({ ...formData, category_id: e.target.value })
                                                    setShowCategoryTable(false)
                                                  }}
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
                                                          onChange={(e) => {
                                                            setFormData({ ...formData, category_id: e.target.value })
                                                            setShowCategoryTable(false)
                                                          }}
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
                        {/* Cancel button */}
                        {formData.category_id && (
                          <div className="px-3 py-2 bg-gray-50 border-t text-center">
                            <button
                              type="button"
                              onClick={() => setShowCategoryTable(false)}
                              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                            >
                              ปิดเมนู (ไม่เปลี่ยนหมวดหมู่)
                            </button>
                          </div>
                        )}
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
                      <LabelWithTooltip label="Cost/Unit" tooltip="ต้นทุนเฉลี่ยต่อหน่วย" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost_per_unit}
                        onChange={(e) => {
                          const costPerUnit = parseFloat(e.target.value) || 0
                          // Auto-calculate Purchasing Price (Excl. VAT) from Cost/Unit
                          const vatRate = 0.07 // 7% VAT
                          const purchasePriceExclVat = costPerUnit / (1 + vatRate)
                          setFormData({ 
                            ...formData, 
                            cost_per_unit: costPerUnit,
                            purchase_price_excl_vat: parseFloat(purchasePriceExclVat.toFixed(2))
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Purchasing Price (Excl. VAT)" tooltip="ราคาทุนซื้อล่าสุด (ไม่รวม VAT) - คำนวณอัตโนมัติจาก Cost/Unit" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.purchase_price_excl_vat}
                        onChange={(e) => setFormData({ ...formData, purchase_price_excl_vat: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">คำนวณอัตโนมัติจาก Cost/Unit (หัก VAT 7%)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip label="Selling Price (Incl. VAT)" tooltip="ราคาขายหน้าร้าน (รวมภาษีแล้ว)" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.selling_price_incl_vat}
                        onChange={(e) => {
                          const sellingPriceInclVat = parseFloat(e.target.value) || 0
                          // Auto-calculate Selling Price (Excl. VAT)
                          const vatRate = 0.07 // 7% VAT
                          const sellingPriceExclVat = sellingPriceInclVat / (1 + vatRate)
                          setFormData({ 
                            ...formData, 
                            selling_price_incl_vat: sellingPriceInclVat,
                            selling_price_excl_vat: parseFloat(sellingPriceExclVat.toFixed(2)),
                            base_price: parseFloat(sellingPriceExclVat.toFixed(2))
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip label="Selling Price (Excl. VAT)" tooltip="ราคาขายก่อนภาษี - คำนวณอัตโนมัติจากราคารวม VAT" />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.selling_price_excl_vat}
                        onChange={(e) => setFormData({ ...formData, selling_price_excl_vat: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">คำนวณอัตโนมัติจากราคารวม VAT (หัก VAT 7%)</p>
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
                      <LabelWithTooltip label="Unit (หน่วยนับ)" tooltip="เช่น กล่อง, แผง, ชิ้น, ขวด" />
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          <LabelWithTooltip label="Remaining Qty" tooltip="จำนวนสินค้าคงเหลือปัจจุบัน" />
                          <input
                            type="number"
                            value={formData.stock_quantity}
                            onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <LabelWithTooltip label="จำนวนขั้นต่ำ (Min Stock)" tooltip="จุดแจ้งเตือนเมื่อของใกล้หมด" />
                          <input
                            type="number"
                            value={formData.min_stock_level}
                            onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        {warehouses.length === 0 ? (
                          <div className="col-span-2 text-center py-8 text-gray-500">
                            <p>ไม่พบข้อมูลคลังสินค้า</p>
                          </div>
                        ) : (
                          warehouses.map((warehouse) => {
                            const stockQuantity = warehouse.is_main 
                              ? formData.stock_quantity 
                              : (productWarehouseStocks[warehouse.id] || 0)
                            const isMain = warehouse.is_main
                            
                            return (
                              <div key={warehouse.id} className={`rounded-lg p-4 border ${isMain ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                  <Warehouse className={`h-5 w-5 ${isMain ? 'text-blue-600' : 'text-gray-500'}`} />
                                  <span className={`font-semibold ${isMain ? 'text-blue-800' : 'text-gray-700'}`}>{warehouse.name}</span>
                                  {isMain && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">หลัก</span>
                                  )}
                                </div>
                                <div className={`text-3xl font-bold ${isMain ? 'text-blue-700' : 'text-gray-600'}`}>{stockQuantity}</div>
                                <div className="text-sm text-gray-500">{formData.unit}</div>
                              </div>
                            )
                          })
                        )}
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
                          const newPreviews = [...imagePreviews]
                          newPreviews[0] = e.target.value
                          setImagePreviews(newPreviews)
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
                            const newPreviews = [...imagePreviews]
                            newPreviews[0] = ''
                            setImagePreviews(newPreviews)
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        อัปโหลดรูปภาพ (อัปโหลดได้สูงสุด 9 รูป)
                      </label>
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-700 font-medium">
                          <Upload className="h-4 w-4" />
                          <span>เลือกหลายรูป</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            const emptySlots = imagePreviews.map((p, i) => p ? -1 : i).filter(i => i !== -1)
                            files.slice(0, emptySlots.length).forEach((file, idx) => {
                              const slotIndex = emptySlots[idx]
                              const newFiles = [...imageFiles]
                              newFiles[slotIndex] = file
                              setImageFiles(newFiles)
                              
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                const newPreviews = [...imagePreviews]
                                newPreviews[slotIndex] = reader.result as string
                                setImagePreviews(newPreviews)
                              }
                              reader.readAsDataURL(file)
                            })
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <div key={index} className="relative">
                          {imagePreviews[index] ? (
                            <div className="relative group">
                              <img
                                src={imagePreviews[index]}
                                alt={`Preview ${index + 1}`}
                                className="h-20 w-20 object-cover rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <div className="h-20 w-20 bg-gray-100 hover:bg-gray-200 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                                <Upload className="h-6 w-6 text-gray-400" />
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageChange(index, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      ))}
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
                          <div className="flex items-center gap-1.5">
                            <Store className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">หน้าร้าน</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_pos)
                              if (url !== null) setFormData({ ...formData, url_pos: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_pos ? 'text-blue-600' : 'text-gray-400'}`}
                            title={formData.url_pos ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_pos && (
                            <a href={formData.url_pos} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_pos}
                        onChange={(e) => setFormData({ ...formData, price_pos: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">G</span>
                            </div>
                            <span className="font-medium text-sm">GRAB</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_grab)
                              if (url !== null) setFormData({ ...formData, url_grab: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_grab ? 'text-green-600' : 'text-gray-400'}`}
                            title={formData.url_grab ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_grab && (
                            <a href={formData.url_grab} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_grab}
                        onChange={(e) => setFormData({ ...formData, price_grab: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">L</span>
                            </div>
                            <span className="font-medium text-sm">LINEMAN</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_lineman)
                              if (url !== null) setFormData({ ...formData, url_lineman: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_lineman ? 'text-green-600' : 'text-gray-400'}`}
                            title={formData.url_lineman ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_lineman && (
                            <a href={formData.url_lineman} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_lineman}
                        onChange={(e) => setFormData({ ...formData, price_lineman: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">Lz</span>
                            </div>
                            <span className="font-medium text-sm">LAZADA</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_lazada)
                              if (url !== null) setFormData({ ...formData, url_lazada: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_lazada ? 'text-orange-600' : 'text-gray-400'}`}
                            title={formData.url_lazada ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_lazada && (
                            <a href={formData.url_lazada} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_lazada}
                        onChange={(e) => setFormData({ ...formData, price_lazada: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                          <div className="flex items-center gap-1.5">
                            <ShoppingCart className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-sm">SHOPEE</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_shopee)
                              if (url !== null) setFormData({ ...formData, url_shopee: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_shopee ? 'text-orange-600' : 'text-gray-400'}`}
                            title={formData.url_shopee ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_shopee && (
                            <a href={formData.url_shopee} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_shopee}
                        onChange={(e) => setFormData({ ...formData, price_shopee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">LINE SHOPPING</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_line_shopping)
                              if (url !== null) setFormData({ ...formData, url_line_shopping: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_line_shopping ? 'text-green-600' : 'text-gray-400'}`}
                            title={formData.url_line_shopping ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_line_shopping && (
                            <a href={formData.url_line_shopping} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_line_shopping}
                        onChange={(e) => setFormData({ ...formData, price_line_shopping: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                            className="h-4 w-4 text-gray-600 rounded"
                          />
                          <div className="flex items-center gap-1.5">
                            <Video className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-sm">TIKTOK</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_tiktok)
                              if (url !== null) setFormData({ ...formData, url_tiktok: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_tiktok ? 'text-gray-600' : 'text-gray-400'}`}
                            title={formData.url_tiktok ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_tiktok && (
                            <a href={formData.url_tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_tiktok}
                        onChange={(e) => setFormData({ ...formData, price_tiktok: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-purple-500 rounded flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">C</span>
                            </div>
                            <span className="font-medium text-sm">ฝากขาย</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_consignment)
                              if (url !== null) setFormData({ ...formData, url_consignment: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_consignment ? 'text-purple-600' : 'text-gray-400'}`}
                            title={formData.url_consignment ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_consignment && (
                            <a href={formData.url_consignment} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_consignment}
                        onChange={(e) => setFormData({ ...formData, price_consignment: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
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
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">Website</span>
                          </div>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('ลิงก์สินค้า:', formData.url_website)
                              if (url !== null) setFormData({ ...formData, url_website: url })
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${formData.url_website ? 'text-blue-600' : 'text-gray-400'}`}
                            title={formData.url_website ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {formData.url_website && (
                            <a href={formData.url_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">ราคาขาย (฿)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price_website}
                        onChange={(e) => setFormData({ ...formData, price_website: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Movement History */}
              {activeTab === 'movements' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">รายการเคลื่อนไหว (Movement History)</h3>
                  <p className="text-sm text-gray-600">ประวัติการซื้อเข้า ขายออก และโอนย้ายสินค้า</p>
                  
                  {movementLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">กำลังโหลด...</p>
                    </div>
                  ) : movementHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>ไม่มีประวัติการเคลื่อนไหว</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ต้นทาง</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ปลายทาง</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">คู่ค้า/ลูกค้า</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {movementHistory.map((movement) => (
                            <tr key={movement.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {new Date(movement.date).toLocaleDateString('th-TH')}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  movement.type === 'ซื้อเข้า' ? 'bg-green-100 text-green-700' :
                                  movement.type === 'ขายออก' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {movement.type}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {movement.quantity}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{movement.from}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{movement.to}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{movement.partner}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{movement.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 8: Alerts */}
              {activeTab === 'alerts' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">การแจ้งเตือน (Alerts)</h3>
                  <p className="text-sm text-gray-600">ตั้งค่าการแจ้งเตือนที่จะแสดงเมื่อขายสินค้านี้ (POS)</p>
                  
                  {/* Alert: Out of Stock */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="alert_out_of_stock"
                        checked={formData.alert_out_of_stock || false}
                        onChange={(e) => setFormData({ ...formData, alert_out_of_stock: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label htmlFor="alert_out_of_stock" className="font-medium text-gray-800">
                        แจ้งเตือนเมื่อสินค้าหมด (Out of Stock)
                      </label>
                    </div>
                    {formData.alert_out_of_stock && (
                      <div className="ml-6 space-y-2">
                        <label className="block text-sm text-gray-600">ข้อความแจ้งเตือน:</label>
                        <input
                          type="text"
                          value={formData.alert_out_of_stock_message || 'สินค้านี้ขายหมดแล้ว (จำนวนคงเหลือ = 0)'}
                          onChange={(e) => setFormData({ ...formData, alert_out_of_stock_message: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="สินค้านี้ขายหมดแล้ว (จำนวนคงเหลือ = 0)"
                        />
                      </div>
                    )}
                  </div>

                  {/* Alert: Low Stock */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="alert_low_stock"
                        checked={formData.alert_low_stock || false}
                        onChange={(e) => setFormData({ ...formData, alert_low_stock: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label htmlFor="alert_low_stock" className="font-medium text-gray-800">
                        แจ้งเตือนเมื่อสินค้าใกล้หมด (Low Stock)
                      </label>
                    </div>
                    {formData.alert_low_stock && (
                      <div className="ml-6 space-y-2">
                        <label className="block text-sm text-gray-600">ข้อความแจ้งเตือน:</label>
                        <input
                          type="text"
                          value={formData.alert_low_stock_message || 'สินค้านี้ใกล้หมด กรุณาเติมสต็อก'}
                          onChange={(e) => setFormData({ ...formData, alert_low_stock_message: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="สินค้านี้ใกล้หมด กรุณาเติมสต็อก"
                        />
                      </div>
                    )}
                  </div>

                  {/* Alert: Expiry */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="alert_expiry"
                        checked={formData.alert_expiry || false}
                        onChange={(e) => setFormData({ ...formData, alert_expiry: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label htmlFor="alert_expiry" className="font-medium text-gray-800">
                        แจ้งเตือนเมื่อสินค้าใกล้หมดอายุ
                      </label>
                    </div>
                    {formData.alert_expiry && (
                      <div className="ml-6 space-y-2">
                        <label className="block text-sm text-gray-600">ข้อความแจ้งเตือน:</label>
                        <input
                          type="text"
                          value={formData.alert_expiry_message || 'สินค้านี้ใกล้หมดอายุ กรุณาตรวจสอบ'}
                          onChange={(e) => setFormData({ ...formData, alert_expiry_message: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="สินค้านี้ใกล้หมดอายุ กรุณาตรวจสอบ"
                        />
                        <label className="block text-sm text-gray-600">แจ้งเตือนก่อนหมดอายุ (วัน):</label>
                        <input
                          type="number"
                          value={formData.alert_expiry_days || 30}
                          onChange={(e) => setFormData({ ...formData, alert_expiry_days: parseInt(e.target.value) || 30 })}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Alert: Custom */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="alert_custom"
                        checked={formData.alert_custom || false}
                        onChange={(e) => setFormData({ ...formData, alert_custom: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label htmlFor="alert_custom" className="font-medium text-gray-800">
                        แจ้งเตือนทั่วไป (Custom Alert)
                      </label>
                    </div>
                    {formData.alert_custom && (
                      <div className="ml-6 space-y-2">
                        <label className="block text-sm text-gray-600">หัวข้อแจ้งเตือน:</label>
                        <input
                          type="text"
                          value={formData.alert_custom_title || ''}
                          onChange={(e) => setFormData({ ...formData, alert_custom_title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="เช่น ยาควบคุมพิเศษ"
                        />
                        <label className="block text-sm text-gray-600">ข้อความแจ้งเตือน:</label>
                        <textarea
                          value={formData.alert_custom_message || ''}
                          onChange={(e) => setFormData({ ...formData, alert_custom_message: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="ข้อความที่จะแสดงเมื่อขายสินค้านี้"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 9: Label (ฉลาก) */}
              {activeTab === 'label' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">ข้อมูลฉลากยา (Label)</h3>
                  <p className="text-sm text-gray-600">ข้อมูลนี้จะใช้แสดงในหน้าพิมพ์ฉลากยา</p>

                  {/* Sub-tabs */}
                  <div className="flex border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setLabelSubTab('thai')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        labelSubTab === 'thai'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      ภาษาไทย
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabelSubTab('english')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        labelSubTab === 'english'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabelSubTab('custom')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        labelSubTab === 'custom'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Thai Tab */}
                  {labelSubTab === 'thai' && (
                    <div className="space-y-4">
                      <div>
                        <LabelWithTooltip label="วิธีใช้ (ไทย)" tooltip="คำแนะนำการใช้ยาภาษาไทย จะแสดงบนฉลาก" />
                        <textarea
                          value={formData.label_dosage_instructions_th}
                          onChange={(e) => setFormData({ ...formData, label_dosage_instructions_th: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="เช่น รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_th: 'ครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            1x3 หลังอาหาร
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_th: 'ครั้งละ 1 เม็ด วันละ 2 ครั้ง เช้า-เย็น'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            1x2 เช้า-เย็น
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_th: 'ครั้งละ 1 เม็ด ก่อนนอน'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            ก่อนนอน
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_th: 'เมื่อมีอาการ'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            เมื่อมีอาการ
                          </button>
                        </div>
                      </div>

                      <div>
                        <LabelWithTooltip label="คำเตือน/ข้อควรระวัง (ไทย)" tooltip="คำเตือนหรือข้อควรระวังภาษาไทย" />
                        <textarea
                          value={formData.label_special_instructions_th}
                          onChange={(e) => setFormData({ ...formData, label_special_instructions_th: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="เช่น ห้ามดื่มแอลกอฮอล์, เก็บในตู้เย็น"
                        />
                      </div>
                    </div>
                  )}

                  {/* English Tab */}
                  {labelSubTab === 'english' && (
                    <div className="space-y-4">
                      <div>
                        <LabelWithTooltip label="Dosage Instructions (English)" tooltip="Dosage instructions in English" />
                        <textarea
                          value={formData.label_dosage_instructions_en}
                          onChange={(e) => setFormData({ ...formData, label_dosage_instructions_en: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="e.g., Take 1 tablet 3 times daily after meals"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_en: 'Take 1 tablet 3 times daily after meals'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            1x3 after meals
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_en: 'Take 1 tablet twice daily morning and evening'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            1x2 morning-evening
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_en: 'Take 1 tablet at bedtime'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            At bedtime
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, label_dosage_instructions_en: 'Take as needed'})}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            As needed
                          </button>
                        </div>
                      </div>

                      <div>
                        <LabelWithTooltip label="Warnings/Precautions (English)" tooltip="Warnings or precautions in English" />
                        <textarea
                          value={formData.label_special_instructions_en}
                          onChange={(e) => setFormData({ ...formData, label_special_instructions_en: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="e.g., Avoid alcohol, store in refrigerator"
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom Tab */}
                  {labelSubTab === 'custom' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">ข้อความแบบกำหนดเองจะแสดงแทนวิธีใช้มาตรฐาน (ถ้ากรอก)</p>
                      <div>
                        <LabelWithTooltip label="ข้อความบรรทัดที่ 1" tooltip="ข้อความแถวแรกบนฉลาก" />
                        <input
                          type="text"
                          value={formData.label_custom_line1}
                          onChange={(e) => setFormData({ ...formData, label_custom_line1: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="เช่น สำหรับผู้ป่วยเบาหวาน"
                        />
                      </div>
                      <div>
                        <LabelWithTooltip label="ข้อความบรรทัดที่ 2" tooltip="ข้อความแถวที่สองบนฉลาก" />
                        <input
                          type="text"
                          value={formData.label_custom_line2}
                          onChange={(e) => setFormData({ ...formData, label_custom_line2: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="เช่น รับประทานพร้อมอาหารเท่านั้น"
                        />
                      </div>
                      <div>
                        <LabelWithTooltip label="ข้อความบรรทัดที่ 3" tooltip="ข้อความแถวที่สามบนฉลาก" />
                        <input
                          type="text"
                          value={formData.label_custom_line3}
                          onChange={(e) => setFormData({ ...formData, label_custom_line3: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="เช่น ห้ามลืมทานยา"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions */}
              {saveMessage && (
                <div className={`p-3 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                  {saveMessage.type === 'success' ? '✓ ' : '✗ '}{saveMessage.text}
                </div>
              )}
              <div className="flex gap-3 pt-6 border-t mt-6">
                <Button type="submit" variant="primary" className="flex-1" disabled={isSaving}>
                  {isSaving ? 'กำลังบันทึก...' : t('common.save')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1"
                  disabled={isSaving}
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

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        onSuccess={() => {
          setShowCSVModal(false)
          fetchProducts()
        }}
      />

    </div>
  )
}
