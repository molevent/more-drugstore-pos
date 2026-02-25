import { useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import { Search, ExternalLink, Package, ShoppingCart, Edit, X, Save, Filter, ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, PlusCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types/database'
import * as XLSX from 'xlsx'

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
  },
  {
    id: 'grab',
    name: 'Grab',
    code: 'GRAB',
    color: 'text-[#00B14F]',
    bgColor: 'bg-[#00B14F]',
    sellField: 'sell_on_grab',
    urlField: 'url_grab',
    priceField: 'price_grab',
    logo: '🚕'
  }
]

interface EditingProduct {
  id: string
  url: string
  price: number
  seller_sku: string
}

interface ImportedItem {
  platform_product_id: string
  product_name: string
  status: string
  shop_sku: string
  seller_sku: string
  quantity: number
  price: number
  special_price: number
  variations: string
  matched_product?: Product | null
  match_type: 'barcode' | 'sku' | 'name' | 'none'
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
  const [showImportModal, setShowImportModal] = useState(false)
  const [importedItems, setImportedItems] = useState<ImportedItem[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Supabase default limit is 1000 — fetch all pages
      let allProducts: Product[] = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name_th')
          .range(from, from + pageSize - 1)
        
        if (error) throw error
        if (!data || data.length === 0) break
        allProducts = allProducts.concat(data)
        if (data.length < pageSize) break
        from += pageSize
      }
      console.log('Fetched', allProducts.length, 'products')
      setProducts(allProducts)
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
    console.log('[PlatformEdit] Saving:', editingProduct)
    setSaving(true)
    try {
      const updates: any = {
        [currentPlatform.urlField]: editingProduct.url || null,
        [currentPlatform.priceField]: editingProduct.price || null,
      }
      console.log('[PlatformEdit] Updates:', updates)

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', editingProduct.id)

      if (error) throw error

      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id ? { ...p, ...updates } : p
      ))
      setEditingProduct(null)
      console.log('[PlatformEdit] Save success')
    } catch (err) {
      console.error('[PlatformEdit] Error saving:', err)
      alert('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  // === Excel Upload ===
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const isCSV = file.name.toLowerCase().endsWith('.csv')

      let workbook: XLSX.WorkBook
      if (isCSV) {
        // CSV files from Grab may use TIS-620 / Windows-874 encoding
        // Try UTF-8 first, if Thai chars are garbled try TIS-620
        let csvText = new TextDecoder('utf-8').decode(data)
        // Detect garbled Thai: if headers contain 'à¸' it's TIS-620 decoded as UTF-8
        if (csvText.includes('\u00e0\u00b8') || csvText.includes('Ã ')) {
          csvText = new TextDecoder('tis-620').decode(data)
          console.log('[Import] CSV detected as TIS-620 encoding')
        } else {
          console.log('[Import] CSV detected as UTF-8 encoding')
        }
        workbook = XLSX.read(csvText, { type: 'string' })
      } else {
        workbook = XLSX.read(data, { type: 'array' })
      }

      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (rows.length < 2) {
        alert('ไฟล์มีข้อมูลน้อยเกินไป')
        return
      }

      // Detect platform file format by headers
      const headerRow = rows.find((row, i) => {
        if (i > 5) return false
        const joined = row.join(' ').toLowerCase()
        return joined.includes('product id') || joined.includes('seller') || joined.includes('sku') || joined.includes('ชื่อสินค้า') || joined.includes('itemname') || joined.includes('itemcode') || joined.includes('barcode')
      })

      if (!headerRow) {
        alert('ไม่พบ header ในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์')
        return
      }

      const headerIndex = rows.indexOf(headerRow)
      const headers = headerRow.map((h: any) => String(h).trim().toLowerCase())

      // Map column indices
      const colMap = detectColumns(headers)
      console.log('[Import] Headers:', headers)
      console.log('[Import] Column map:', colMap)

      // Parse data rows (skip header + any description rows)
      const dataStartIndex = headerIndex + 1
      const isGrabCSV = headers.some((h: string) => h === 'itemname' || h === 'itemcode')
      // Skip rows that look like descriptions (long text in cells)
      // But NOT for Grab CSV — Grab data starts right after header with product names
      let actualStart = dataStartIndex
      if (!isGrabCSV) {
        for (let i = dataStartIndex; i < Math.min(dataStartIndex + 3, rows.length); i++) {
          const row = rows[i]
          const firstCell = String(row[0] || '').trim()
          // If first cell is not a number/product ID, it's likely a description row
          if (firstCell.length > 30 || firstCell === '' || /^[ก-๙a-z]/i.test(firstCell)) {
            actualStart = i + 1
          } else {
            break
          }
        }
      }

      const items: ImportedItem[] = []
      for (let i = actualStart; i < rows.length; i++) {
        const row = rows[i]
        const productId = String(row[colMap.productId] ?? '').trim()
        const productName = String(row[colMap.productName] ?? '').trim()

        if (!productId && !productName) continue

        const sellerSku = String(row[colMap.sellerSku] ?? '').trim()
        const shopSku = String(row[colMap.shopSku] ?? '').trim()
        const status = String(row[colMap.status] ?? '').trim()
        const quantity = Number(row[colMap.quantity] ?? 0) || 0
        const price = Number(row[colMap.price] ?? 0) || 0
        const specialPrice = Number(row[colMap.specialPrice] ?? 0) || 0
        const variations = String(row[colMap.variations] ?? '').trim()

        // Match to local product
        const { matched, matchType } = matchToLocalProduct(sellerSku, shopSku, productName)

        items.push({
          platform_product_id: productId,
          product_name: productName,
          status,
          shop_sku: shopSku,
          seller_sku: sellerSku,
          quantity,
          price,
          special_price: specialPrice,
          variations,
          matched_product: matched,
          match_type: matchType
        })
      }

      console.log(`[Import] Parsed ${items.length} items from Excel`)
      setImportedItems(items)
      setShowImportModal(true)
    } catch (err) {
      console.error('Error reading Excel file:', err)
      alert('อ่านไฟล์ไม่สำเร็จ: ' + (err as Error).message)
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const detectColumns = (headers: string[]): Record<string, number> => {
    const find = (keywords: string[]) => {
      for (const kw of keywords) {
        const idx = headers.findIndex(h => h.includes(kw))
        if (idx >= 0) return idx
      }
      return 0
    }

    // Detect if this is a Grab CSV (has ITEMNAME/ITEMCODE/BARCODE columns)
    const isGrabFormat = headers.some(h => h === 'itemname' || h === 'itemcode')

    if (isGrabFormat) {
      return {
        productId: find(['barcode']),
        productName: find(['itemname', 'item name', 'item_name']),
        status: find(['status', 'สถานะ']),
        shopSku: find(['barcode']),
        sellerSku: find(['itemcode', 'item code', 'item_code']),
        quantity: find(['จำนวน', 'quantity', 'stock', 'qty', 'availableqty']),
        price: find(['ราคา', 'price', 'sellingprice', 'selling price']),
        specialPrice: find(['specialprice', 'special price', 'discountedprice', 'ราคาพิเศษ']),
        variations: find(['variations', 'variation', 'category'])
      }
    }

    return {
      productId: find(['product id', 'productid', 'product_id']),
      productName: find(['ชื่อสินค้า', 'product name', 'name', 'ชื่อ']),
      status: find(['status', 'สถานะ']),
      shopSku: find(['shop sku', 'shopsku', 'ร้าน sku']),
      sellerSku: find(['sellersku', 'seller sku', 'seller_sku']),
      quantity: find(['จำนวน', 'quantity', 'stock', 'qty']),
      price: find(['ราคา', 'price']),
      specialPrice: find(['specialprice', 'special price', 'ราคาพิเศษ']),
      variations: find(['variations', 'variation', 'combo'])
    }
  }

  const matchToLocalProduct = (sellerSku: string, shopSku: string, _name: string): { matched: Product | null, matchType: 'barcode' | 'sku' | 'name' | 'none' } => {
    if (!products.length) return { matched: null, matchType: 'none' }

    // 1. Exact match by SellerSKU → barcode or sku
    if (sellerSku) {
      const byBarcode = products.find(p => p.barcode && p.barcode === sellerSku)
      if (byBarcode) return { matched: byBarcode, matchType: 'barcode' }
      const bySku = products.find(p => p.sku && p.sku === sellerSku)
      if (bySku) return { matched: bySku, matchType: 'sku' }
    }

    // 2. Extract barcode from ShopSKU (Lazada format: "5072184995_TH-2141635939")
    // Only match if barcode is long enough (>= 8 chars) to avoid false positives
    if (shopSku) {
      const parts = shopSku.split(/[_\-\s]/)
      for (const part of parts) {
        if (part.length >= 8) {
          const byBarcode = products.find(p => p.barcode && p.barcode === part)
          if (byBarcode) return { matched: byBarcode, matchType: 'barcode' }
          const bySku = products.find(p => p.sku && p.sku === part)
          if (bySku) return { matched: bySku, matchType: 'sku' }
        }
      }
    }

    // 3. Do NOT fuzzy name match — too unreliable, leave as unmatched
    // User can manually match these later

    return { matched: null, matchType: 'none' }
  }

  const handleImportConfirm = async () => {
    const matchedItems = importedItems.filter(item => item.matched_product)
    if (matchedItems.length === 0) {
      alert('ไม่มีสินค้าที่จับคู่ได้')
      return
    }

    setImporting(true)
    let updated = 0
    let failed = 0

    for (let i = 0; i < matchedItems.length; i++) {
      const item = matchedItems[i]
      const product = item.matched_product!
      setImportProgress(`อัพเดท ${i + 1}/${matchedItems.length} ${product.name_th || item.product_name}`)

      try {
        const updates: any = {
          [currentPlatform.sellField]: true,
          [currentPlatform.priceField]: item.special_price || item.price || undefined,
        }

        const { error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id)

        if (error) throw error

        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, ...updates } : p
        ))
        updated++
      } catch (err) {
        console.error(`Error updating ${product.name_th}:`, err)
        failed++
      }
    }

    setImporting(false)
    setImportProgress('')
    alert(`อัพเดทสำเร็จ ${updated} รายการ${failed > 0 ? `, ล้มเหลว ${failed} รายการ` : ''}`)
    setShowImportModal(false)
    setImportedItems([])
  }

  const handleCreateUnmatched = async () => {
    const unmatchedItems = importedItems.filter(item => !item.matched_product && item.seller_sku)
    if (unmatchedItems.length === 0) {
      alert('ไม่มีรายการที่ต้องสร้างใหม่ (ต้องมี Seller SKU)')
      return
    }

    // Deduplicate by seller_sku — Lazada variations share the same barcode
    const seenSkus = new Set<string>()
    const uniqueItems: typeof unmatchedItems = []
    for (const item of unmatchedItems) {
      if (!seenSkus.has(item.seller_sku)) {
        seenSkus.add(item.seller_sku)
        uniqueItems.push(item)
      }
    }

    const skipped = unmatchedItems.length - uniqueItems.length
    if (!confirm(`จะสร้างสินค้าใหม่ ${uniqueItems.length} รายการ${skipped > 0 ? ` (ข้าม ${skipped} รายการที่ SKU ซ้ำ)` : ''}\nSellerSKU = SKU + Barcode\nราคารวม VAT แล้ว\nเป็นสินค้านับสต็อก\n\nยืนยัน?`)) {
      return
    }

    setImporting(true)
    let created = 0
    let alreadyExists = 0
    let failed = 0

    for (let i = 0; i < uniqueItems.length; i++) {
      const item = uniqueItems[i]
      setImportProgress(`สร้างสินค้า ${i + 1}/${uniqueItems.length} ${item.product_name}`)

      try {
        // Check DB directly for existing barcode (not just local state)
        const { data: existingData } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', item.seller_sku)
          .limit(1)

        if (existingData && existingData.length > 0) {
          const existingProduct = existingData[0] as Product
          // Already exists in DB — update platform flag + mark as matched
          await supabase
            .from('products')
            .update({ [currentPlatform.sellField]: true, [currentPlatform.priceField]: item.special_price || item.price || undefined })
            .eq('id', existingProduct.id)

          setProducts(prev => {
            const exists = prev.find(p => p.id === existingProduct.id)
            if (exists) return prev.map(p => p.id === existingProduct.id ? { ...p, ...existingProduct, [currentPlatform.sellField]: true } : p)
            return [...prev, existingProduct]
          })
          setImportedItems(prev => prev.map(it =>
            it.seller_sku === item.seller_sku && !it.matched_product
              ? { ...it, matched_product: existingProduct, match_type: 'barcode' as const }
              : it
          ))
          alreadyExists++
          continue
        }

        const sellingPrice = item.special_price || item.price || 0

        const newProduct: any = {
          barcode: item.seller_sku,
          sku: item.seller_sku,
          name_th: item.product_name,
          name_en: '',
          product_type: 'finished_goods',
          stock_tracking_type: 'tracked',
          is_active: true,
          base_price: sellingPrice,
          selling_price_incl_vat: sellingPrice,
          selling_price_excl_vat: Math.round((sellingPrice / 1.07) * 100) / 100,
          cost_price: 0,
          unit: 'ชิ้น',
          stock_quantity: 0,
          min_stock_level: 0,
          sell_on_pos: true,
          sell_on_grab: false,
          sell_on_lineman: false,
          sell_on_lazada: false,
          sell_on_shopee: false,
          sell_on_line_shopping: false,
          sell_on_tiktok: false,
          sell_on_consignment: false,
          sell_on_website: false,
          [currentPlatform.sellField]: true,
          [currentPlatform.priceField]: sellingPrice,
        }

        const { data, error } = await supabase
          .from('products')
          .insert(newProduct)
          .select()
          .single()

        if (error) throw error

        if (data) {
          const createdProduct = data as Product
          setProducts(prev => [...prev, createdProduct])
          setImportedItems(prev => prev.map(it =>
            it.seller_sku === item.seller_sku && !it.matched_product
              ? { ...it, matched_product: createdProduct, match_type: 'barcode' as const }
              : it
          ))
        }
        created++
      } catch (err) {
        console.error(`Error creating ${item.product_name}:`, err)
        failed++
      }
    }

    setImporting(false)
    setImportProgress('')
    const parts = []
    if (created > 0) parts.push(`สร้างใหม่ ${created}`)
    if (alreadyExists > 0) parts.push(`มีอยู่แล้ว ${alreadyExists} (อัพเดทแล้ว)`)
    if (skipped > 0) parts.push(`ข้าม ${skipped} (SKU ซ้ำ)`)
    if (failed > 0) parts.push(`ล้มเหลว ${failed}`)
    alert(parts.join(', '))
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

      {/* Stats + Search + Upload */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-4 flex-wrap">
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentPlatform.bgColor} text-white hover:opacity-90`}
            >
              <Upload className="h-4 w-4 inline mr-1" />
              อัพโหลด Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
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
                            type="text"
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
                              type="button"
                              onClick={() => { console.log('[PlatformEdit] Save clicked'); handleSaveEdit() }}
                              disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-green-50 border border-green-200"
                              title="บันทึก"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProduct(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded border border-gray-200"
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
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className={`h-6 w-6 ${currentPlatform.color}`} />
                <div>
                  <h2 className="text-lg font-bold text-gray-800">นำเข้าสินค้าจาก {currentPlatform.name}</h2>
                  <p className="text-sm text-gray-500">
                    พบ {importedItems.length} รายการ · 
                    จับคู่ได้ <span className="text-green-600 font-medium">{importedItems.filter(i => i.matched_product).length}</span> · 
                    ไม่พบ <span className="text-red-500 font-medium">{importedItems.filter(i => !i.matched_product).length}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportedItems([]) }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Import Progress */}
            {importing && (
              <div className="px-5 py-3 bg-blue-50 border-b">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span>{importProgress}</span>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto p-5">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600 w-10">#</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">สินค้า ({currentPlatform.name})</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Seller SKU</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">สถานะ</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">ราคา</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">สต็อก</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">จับคู่</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">สินค้าในระบบ</th>
                  </tr>
                </thead>
                <tbody>
                  {importedItems.map((item, idx) => (
                    <tr key={idx} className={`border-b hover:bg-gray-50 ${!item.matched_product ? 'bg-red-50/30' : ''}`}>
                      <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-800 max-w-xs truncate" title={item.product_name}>
                          {item.product_name || '-'}
                        </div>
                        <div className="text-xs text-gray-400">{item.platform_product_id}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{item.seller_sku || '-'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.status || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div>฿{(item.special_price || item.price || 0).toLocaleString()}</div>
                        {item.special_price > 0 && item.price > 0 && item.special_price !== item.price && (
                          <div className="text-xs text-gray-400 line-through">฿{item.price.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-center">
                        {item.matched_product ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.match_type === 'barcode' ? 'bg-green-100 text-green-700' :
                            item.match_type === 'sku' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            <CheckCircle className="h-3 w-3" />
                            {item.match_type === 'barcode' ? 'Barcode' : item.match_type === 'sku' ? 'SKU' : 'ชื่อ'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            ไม่พบ
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {item.matched_product ? (
                          <div>
                            <div className="font-medium text-gray-700 text-xs">{item.matched_product.name_th}</div>
                            <div className="text-xs text-gray-400">{item.matched_product.barcode || item.matched_product.sku || '-'}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                            <PlusCircle className="h-3 w-3" />
                            จะสร้างใหม่
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  จับคู่ได้ <span className="font-bold text-green-600">{importedItems.filter(i => i.matched_product).length}</span> → อัพเดทสถานะ+ราคา · 
                  ไม่พบ <span className="font-bold text-orange-500">{importedItems.filter(i => !i.matched_product && i.seller_sku).length}</span> → สร้างสินค้าใหม่
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowImportModal(false); setImportedItems([]) }}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                  disabled={importing}
                >
                  ยกเลิก
                </button>
                {importedItems.filter(i => !i.matched_product && i.seller_sku).length > 0 && (
                  <button
                    onClick={handleCreateUnmatched}
                    disabled={importing}
                    className="px-5 py-2 rounded-lg text-white font-medium bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {importing ? 'กำลังสร้าง...' : `สร้างใหม่ ${importedItems.filter(i => !i.matched_product && i.seller_sku).length} รายการ`}
                  </button>
                )}
                <button
                  onClick={handleImportConfirm}
                  disabled={importing || importedItems.filter(i => i.matched_product).length === 0}
                  className={`px-6 py-2 rounded-lg text-white font-medium ${currentPlatform.bgColor} hover:opacity-90 disabled:opacity-50`}
                >
                  {importing ? 'กำลังนำเข้า...' : `อัพเดท ${importedItems.filter(i => i.matched_product).length} รายการ`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
