import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { scanBill, ScannedBillData, ScannedBillItem } from '../services/ocrBillScanner'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { 
  ScanLine, Upload, FileText, Check, X, Search, Link2, AlertCircle, 
  ChevronDown, ChevronUp, Package, ArrowLeft, Loader2, Save, Plus,
  CheckCircle2, XCircle, HelpCircle
} from 'lucide-react'
import { Product } from '../types/database'

interface SupplierMapping {
  id: string
  supplier_name: string
  supplier_product_id: string
  supplier_product_name: string
  product_id: string
  product?: Product
}

interface MatchedItem extends ScannedBillItem {
  matched_product_id: string | null
  matched_product?: Product | null
  match_source: 'mapping' | 'fuzzy' | 'manual' | 'none'
  match_confidence: number
  is_confirmed: boolean
}

// Fuzzy match score between two strings
function fuzzyScore(a: string, b: string): number {
  if (!a || !b) return 0
  const al = a.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '')
  const bl = b.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '')
  if (al === bl) return 100
  if (al.includes(bl) || bl.includes(al)) return 80
  
  // Word-level matching
  const aWords = a.toLowerCase().split(/[\s/(),.-]+/).filter(w => w.length > 1)
  const bWords = b.toLowerCase().split(/[\s/(),.-]+/).filter(w => w.length > 1)
  let matchCount = 0
  for (const aw of aWords) {
    for (const bw of bWords) {
      if (aw === bw || aw.includes(bw) || bw.includes(aw)) {
        matchCount++
        break
      }
    }
  }
  const maxWords = Math.max(aWords.length, bWords.length)
  if (maxWords === 0) return 0
  return Math.round((matchCount / maxWords) * 70)
}

export default function BillScanPage() {
  // Upload & scan state
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScannedBillData | null>(null)
  const [scanError, setScanError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Product matching state
  const [products, setProducts] = useState<Product[]>([])
  const [_mappings, setMappings] = useState<SupplierMapping[]>([])
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([])
  const [showProductSearch, setShowProductSearch] = useState<number | null>(null)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddBarcode, setQuickAddBarcode] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [expandedView, setExpandedView] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name_th')
    if (data) setProducts(data as Product[])
  }

  const fetchMappings = async (supplierName: string) => {
    const { data } = await supabase
      .from('supplier_product_mappings')
      .select('*')
      .eq('supplier_name', supplierName)
    if (data) {
      // Attach product info
      const withProducts = data.map(m => ({
        ...m,
        product: products.find(p => p.id === m.product_id)
      }))
      setMappings(withProducts)
      return withProducts
    }
    return []
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selected])
    
    // Generate previews
    selected.forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setPreviews(prev => [...prev, url])
      } else {
        setPreviews(prev => [...prev, ''])
      }
    })
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => {
      if (prev[index]) URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  // Scan the uploaded files
  const handleScan = async () => {
    if (files.length === 0) return
    setScanning(true)
    setScanError('')
    setScanResult(null)
    setMatchedItems([])
    setImportResult(null)

    try {
      const result = await scanBill(files)
      setScanResult(result)
      
      // Fetch mappings for this supplier
      const supplierMappings = await fetchMappings(result.supplier_name)
      
      // Match items
      const matched = matchItems(result.items, supplierMappings)
      setMatchedItems(matched)
    } catch (err: any) {
      setScanError(err.message || 'เกิดข้อผิดพลาดในการสแกน')
    } finally {
      setScanning(false)
    }
  }

  // Match scanned items to products
  const matchItems = (items: ScannedBillItem[], supplierMappings: SupplierMapping[]): MatchedItem[] => {
    return items.map(item => {
      // 1. Try mapping table first
      const mapping = supplierMappings.find(m => m.supplier_product_id === item.supplier_product_id)
      if (mapping) {
        const product = products.find(p => p.id === mapping.product_id)
        return {
          ...item,
          matched_product_id: mapping.product_id,
          matched_product: product || null,
          match_source: 'mapping' as const,
          match_confidence: 100,
          is_confirmed: true
        }
      }

      // 2. Try fuzzy matching by product name
      let bestMatch: Product | null = null
      let bestScore = 0
      
      for (const product of products) {
        const nameScore = Math.max(
          fuzzyScore(item.product_name, product.name_th),
          fuzzyScore(item.product_name, product.name_en || ''),
          fuzzyScore(item.product_name, product.brand || '')
        )
        if (nameScore > bestScore && nameScore >= 40) {
          bestScore = nameScore
          bestMatch = product
        }
      }

      if (bestMatch && bestScore >= 40) {
        return {
          ...item,
          matched_product_id: bestMatch.id,
          matched_product: bestMatch,
          match_source: 'fuzzy' as const,
          match_confidence: bestScore,
          is_confirmed: bestScore >= 80
        }
      }

      // 3. No match found
      return {
        ...item,
        matched_product_id: null,
        matched_product: null,
        match_source: 'none' as const,
        match_confidence: 0,
        is_confirmed: false
      }
    })
  }

  // Quick-add a new product from the scan dropdown
  const handleQuickAddProduct = async (index: number) => {
    const item = matchedItems[index]
    if (!quickAddName.trim()) {
      alert('กรุณากรอกชื่อสินค้า')
      return
    }
    setQuickAddSaving(true)
    try {
      // 1. Create new product
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([{
          name_th: quickAddName.trim(),
          barcode: quickAddBarcode.trim() || '',
          sku: quickAddBarcode.trim() || '',
          product_type: 'finished_goods',
          is_active: true,
          stock_tracking_type: 'tracked',
          base_price: item.unit_price || 0,
          cost_price: item.unit_price || 0,
          stock_quantity: 0,
          min_stock_level: 0,
          unit: item.unit || 'ชิ้น',
          sell_on_pos: true,
          sell_on_grab: false,
          sell_on_lineman: false,
          sell_on_lazada: false,
          sell_on_shopee: false,
          sell_on_line_shopping: false,
          sell_on_tiktok: false,
          sell_on_consignment: false,
          sell_on_website: false
        }])
        .select()
        .single()

      if (error) throw error

      // 2. Auto-save supplier mapping
      if (scanResult && item.supplier_product_id) {
        await supabase
          .from('supplier_product_mappings')
          .upsert({
            supplier_name: scanResult.supplier_name,
            supplier_product_id: item.supplier_product_id,
            supplier_product_name: item.product_name,
            product_id: newProduct.id
          }, { onConflict: 'supplier_name,supplier_product_id' })
      }

      // 3. Add to local products list
      const fullProduct = newProduct as Product
      setProducts(prev => [...prev, fullProduct])

      // 4. Auto-match this item
      setItemMatch(index, fullProduct)

      // Reset quick-add form
      setShowQuickAdd(false)
      setQuickAddName('')
      setQuickAddBarcode('')
    } catch (err: any) {
      alert('เพิ่มสินค้าไม่สำเร็จ: ' + err.message)
    } finally {
      setQuickAddSaving(false)
    }
  }

  // Set product match for an item
  const setItemMatch = (index: number, product: Product) => {
    setMatchedItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        matched_product_id: product.id,
        matched_product: product,
        match_source: 'manual' as const,
        match_confidence: 100,
        is_confirmed: true
      }
    }))
    setShowProductSearch(null)
    setProductSearchTerm('')
  }

  // Toggle confirm for an item
  const toggleConfirm = (index: number) => {
    setMatchedItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return { ...item, is_confirmed: !item.is_confirmed }
    }))
  }

  // Filter products for search dropdown
  const filteredProducts = productSearchTerm.length >= 1
    ? products.filter(p => {
        const term = productSearchTerm.toLowerCase()
        return (
          p.name_th?.toLowerCase().includes(term) ||
          p.name_en?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term)
        )
      }).slice(0, 15)
    : []

  // Import confirmed items to PO
  const handleImport = async () => {
    if (!scanResult) return
    const confirmedItems = matchedItems.filter(item => item.is_confirmed && item.matched_product_id)
    if (confirmedItems.length === 0) {
      alert('ไม่มีรายการที่ยืนยันแล้ว กรุณาเลือกสินค้าให้ครบก่อน')
      return
    }

    setImporting(true)
    let success = 0
    let failed = 0

    try {
      // 1. Create PO
      const year = new Date().getFullYear()
      const prefix = `PO-${year}-`
      const { data: lastPO } = await supabase
        .from('purchase_orders')
        .select('po_number')
        .ilike('po_number', `${prefix}%`)
        .order('po_number', { ascending: false })
        .limit(1)
      
      let nextNumber = 1
      if (lastPO && lastPO.length > 0) {
        const last = parseInt(lastPO[0].po_number.replace(prefix, ''))
        if (!isNaN(last)) nextNumber = last + 1
      }
      const poNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number: poNumber,
          supplier_name: scanResult.supplier_name,
          supplier_contact: '',
          order_date: scanResult.document_date || new Date().toISOString().split('T')[0],
          expected_delivery_date: scanResult.document_date || new Date().toISOString().split('T')[0],
          status: 'received',
          payment_status: 'unpaid',
          total_amount: scanResult.subtotal_before_discount || 0,
          tax_amount: scanResult.vat_amount || 0,
          discount_amount: (scanResult.discount || 0) + (scanResult.voucher_discount || 0),
          net_amount: scanResult.grand_total || 0,
          reference: scanResult.document_number || '',
          notes: `สแกนจากเอกสาร: ${scanResult.document_number} | Order: ${scanResult.order_id}`
        }])
        .select()
        .single()

      if (poError) throw poError

      // 2. Add PO items + update stock
      const { data: userData } = await supabase.auth.getUser()

      for (const item of confirmedItems) {
        try {
          const product = products.find(p => p.id === item.matched_product_id)
          if (!product) continue

          // Add PO item
          const discountAmount = item.discount || 0
          const subtotal = item.quantity * item.unit_price
          const afterDiscount = subtotal - discountAmount
          const taxAmount = afterDiscount * 0.07
          
          await supabase
            .from('purchase_order_items')
            .insert([{
              purchase_order_id: po.id,
              product_id: item.matched_product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percent: subtotal > 0 ? (discountAmount / subtotal) * 100 : 0,
              discount_amount: discountAmount,
              tax_percent: 7,
              tax_amount: taxAmount,
              total_amount: item.total,
              notes: `Lot: ${item.lot_number || '-'} | Exp: ${item.expiry_date || '-'}`
            }])

          // Update stock
          const quantityBefore = product.stock_quantity || 0
          const quantityAfter = quantityBefore + item.quantity

          await supabase
            .from('products')
            .update({ 
              stock_quantity: quantityAfter,
              cost_price: item.unit_price,
              lot_number: item.lot_number || product.lot_number,
              expiry_date: item.expiry_date || product.expiry_date
            })
            .eq('id', item.matched_product_id)

          // Add stock batch
          const batchNumber = `SCAN-${poNumber}-${item.line_number}`
          await supabase
            .from('stock_batches')
            .insert([{
              product_id: item.matched_product_id,
              batch_number: batchNumber,
              quantity: item.quantity,
              cost_per_unit: item.unit_price,
              supplier: scanResult.supplier_name,
              expiry_date: item.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: `สแกนจาก ${scanResult.document_number} | Lot: ${item.lot_number}`
            }])

          // Record stock movement
          await supabase
            .from('stock_movements')
            .insert({
              product_id: item.matched_product_id,
              movement_type: 'purchase',
              quantity: item.quantity,
              quantity_before: quantityBefore,
              quantity_after: quantityAfter,
              unit_cost: item.unit_price,
              total_cost: item.total,
              reference_type: 'purchase_order',
              reference_id: po.id,
              reason: `สแกนบิลจาก ${scanResult.supplier_name}`,
              notes: `${scanResult.document_number} | Lot: ${item.lot_number}`,
              created_by: userData?.user?.id
            })

          // 3. Save mapping for future auto-match
          if (item.match_source !== 'mapping') {
            await supabase
              .from('supplier_product_mappings')
              .upsert({
                supplier_name: scanResult.supplier_name,
                supplier_product_id: item.supplier_product_id,
                supplier_product_name: item.product_name,
                product_id: item.matched_product_id
              }, {
                onConflict: 'supplier_name,supplier_product_id'
              })
          }

          success++
        } catch (err) {
          console.error('Error importing item:', item.product_name, err)
          failed++
        }
      }

      setImportResult({ success, failed })
      await fetchProducts() // Refresh stock
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  // Reset all
  const handleReset = () => {
    previews.forEach(url => { if (url) URL.revokeObjectURL(url) })
    setFiles([])
    setPreviews([])
    setScanResult(null)
    setScanError('')
    setMatchedItems([])
    setImportResult(null)
  }

  const confirmedCount = matchedItems.filter(i => i.is_confirmed && i.matched_product_id).length
  const unmatchedCount = matchedItems.filter(i => !i.matched_product_id).length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScanLine className="h-7 w-7 text-indigo-600" />
            สแกนบิล / OCR
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            อัพโหลดใบกำกับภาษี / ใบส่งสินค้า แล้วดึงข้อมูลอัตโนมัติ
          </p>
        </div>
        {scanResult && (
          <Button onClick={handleReset} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            สแกนใหม่
          </Button>
        )}
      </div>

      {/* Step 1: Upload */}
      {!scanResult && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-500" />
              อัพโหลดเอกสาร
            </h2>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
            >
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">คลิกเพื่ออัพโหลด หรือลากไฟล์มาวาง</p>
              <p className="text-sm text-gray-400 mt-1">รองรับ PDF, JPG, PNG (หลายหน้า/ไฟล์ได้)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {previews[i] ? (
                      <img src={previews[i]} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                        <FileText className="h-6 w-6 text-red-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Scan button */}
            {files.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังสแกน...
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-4 w-4" />
                      เริ่มสแกน OCR
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Error */}
            {scanError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">สแกนไม่สำเร็จ</p>
                  <p className="text-sm text-red-600 mt-1">{scanError}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Scan Result & Matching */}
      {scanResult && (
        <>
          {/* Document info */}
          <Card>
            <div className="p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedView(!expandedView)}
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  ข้อมูลเอกสาร
                </h2>
                {expandedView ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
              
              {expandedView && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">ผู้ขาย:</span>
                    <p className="font-medium">{scanResult.supplier_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tax ID:</span>
                    <p className="font-medium">{scanResult.supplier_tax_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">เลขที่เอกสาร:</span>
                    <p className="font-medium">{scanResult.document_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">วันที่:</span>
                    <p className="font-medium">{scanResult.document_date}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Order ID:</span>
                    <p className="font-medium">{scanResult.order_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ลูกค้า:</span>
                    <p className="font-medium">{scanResult.customer_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ยอดรวมก่อน VAT:</span>
                    <p className="font-medium">฿{scanResult.total_before_vat?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">VAT 7%:</span>
                    <p className="font-medium">฿{scanResult.vat_amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-gray-500">ยอดรวมทั้งสิ้น:</span>
                    <p className="text-xl font-bold text-indigo-600">฿{scanResult.grand_total?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Match summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{confirmedCount}</p>
              <p className="text-xs text-green-600">จับคู่แล้ว</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <HelpCircle className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-yellow-700">{matchedItems.length - confirmedCount - unmatchedCount}</p>
              <p className="text-xs text-yellow-600">รอยืนยัน</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-700">{unmatchedCount}</p>
              <p className="text-xs text-red-600">ไม่พบสินค้า</p>
            </div>
          </div>

          {/* Items table */}
          <Card>
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-500" />
                รายการสินค้า ({matchedItems.length} รายการ)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-3 py-2 text-left w-8">#</th>
                      <th className="px-3 py-2 text-left">สินค้าในบิล</th>
                      <th className="px-3 py-2 text-left">→ สินค้าในระบบ</th>
                      <th className="px-3 py-2 text-center">จำนวน</th>
                      <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                      <th className="px-3 py-2 text-right">ส่วนลด</th>
                      <th className="px-3 py-2 text-right">รวม</th>
                      <th className="px-3 py-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {matchedItems.map((item, index) => (
                      <tr key={index} className={`${
                        item.is_confirmed ? 'bg-green-50/50' : 
                        item.matched_product_id ? 'bg-yellow-50/50' : 'bg-red-50/50'
                      }`}>
                        <td className="px-3 py-2 text-gray-500">{item.line_number}</td>
                        <td className="px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-800">{item.product_name}</p>
                            <p className="text-xs text-gray-500">
                              ID: {item.supplier_product_id} | Lot: {item.lot_number || '-'} | Exp: {item.expiry_date || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2 relative">
                          {item.matched_product ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-indigo-700 truncate">{item.matched_product.name_th}</p>
                                <p className="text-xs text-gray-500">
                                  SKU: {item.matched_product.sku || '-'} | 
                                  {item.match_source === 'mapping' && <span className="text-green-600 ml-1">✓ Mapping</span>}
                                  {item.match_source === 'fuzzy' && <span className="text-yellow-600 ml-1">~ Fuzzy ({item.match_confidence}%)</span>}
                                  {item.match_source === 'manual' && <span className="text-blue-600 ml-1">✎ Manual</span>}
                                </p>
                              </div>
                              <button
                                onClick={() => { setShowProductSearch(index); setProductSearchTerm('') }}
                                className="p-1 text-gray-400 hover:text-indigo-600 shrink-0"
                                title="เปลี่ยนสินค้า"
                              >
                                <Search className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setShowProductSearch(index); setProductSearchTerm('') }}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              เลือกสินค้า
                            </button>
                          )}

                          {/* Product search dropdown */}
                          {showProductSearch === index && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-xl">
                              <div className="p-2 border-b">
                                <div className="flex items-center gap-2">
                                  <Search className="h-4 w-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={productSearchTerm}
                                    onChange={e => setProductSearchTerm(e.target.value)}
                                    placeholder="ค้นหาชื่อ, SKU, Barcode..."
                                    className="flex-1 text-sm border-none outline-none"
                                    autoFocus
                                  />
                                  <button onClick={() => setShowProductSearch(null)} className="p-1 hover:bg-gray-100 rounded">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {filteredProducts.length === 0 && !showQuickAdd ? (
                                  <p className="p-3 text-sm text-gray-500 text-center">
                                    {productSearchTerm ? 'ไม่พบสินค้า' : 'พิมพ์เพื่อค้นหา...'}
                                  </p>
                                ) : (
                                  filteredProducts.map(product => (
                                    <button
                                      key={product.id}
                                      onClick={() => setItemMatch(index, product)}
                                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center gap-2 text-sm border-b last:border-b-0"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{product.name_th}</p>
                                        <p className="text-xs text-gray-500">
                                          SKU: {product.sku || '-'} | Barcode: {product.barcode || '-'} | 
                                          Stock: {product.stock_quantity}
                                        </p>
                                      </div>
                                      <Link2 className="h-4 w-4 text-indigo-400 shrink-0" />
                                    </button>
                                  ))
                                )}
                              </div>

                              {/* Quick-add new product form */}
                              {showQuickAdd ? (
                                <div className="p-3 border-t bg-green-50">
                                  <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                                    <Plus className="h-3.5 w-3.5" />
                                    เพิ่มสินค้าใหม่
                                  </p>
                                  <p className="text-xs text-gray-500 mb-2">
                                    จากบิล: {item.product_name}
                                  </p>
                                  <input
                                    type="text"
                                    value={quickAddName}
                                    onChange={e => setQuickAddName(e.target.value)}
                                    placeholder="ชื่อสินค้า (ภาษาไทย) *"
                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-2 focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                    autoFocus
                                  />
                                  <input
                                    type="text"
                                    value={quickAddBarcode}
                                    onChange={e => setQuickAddBarcode(e.target.value)}
                                    placeholder="Barcode / SKU (ถ้ามี)"
                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-2 focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleQuickAddProduct(index)}
                                      disabled={quickAddSaving || !quickAddName.trim()}
                                      className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {quickAddSaving ? (
                                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังบันทึก...</>
                                      ) : (
                                        <><Save className="h-3.5 w-3.5" /> บันทึก + จับคู่</>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => { setShowQuickAdd(false); setQuickAddName(''); setQuickAddBarcode('') }}
                                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                      ยกเลิก
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowQuickAdd(true)
                                    setQuickAddName(item.product_name || '')
                                    setQuickAddBarcode('')
                                  }}
                                  className="w-full px-3 py-2.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 border-t flex items-center justify-center gap-1.5 font-medium"
                                >
                                  <Plus className="h-4 w-4" />
                                  เพิ่มสินค้าใหม่
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-right">฿{item.unit_price?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right text-red-500">
                          {item.discount > 0 ? `฿${item.discount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">฿{item.total?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-center">
                          {item.matched_product_id ? (
                            <button
                              onClick={() => toggleConfirm(index)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.is_confirmed 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              }`}
                              title={item.is_confirmed ? 'ยืนยันแล้ว (คลิกเพื่อยกเลิก)' : 'คลิกเพื่อยืนยัน'}
                            >
                              {item.is_confirmed ? <Check className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                            </button>
                          ) : (
                            <span className="text-red-400">
                              <XCircle className="h-4 w-4 inline" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Import button */}
          <div className="flex items-center justify-between bg-white border rounded-xl p-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-indigo-600">{confirmedCount}</span> / {matchedItems.length} รายการพร้อมนำเข้า
              {unmatchedCount > 0 && (
                <span className="text-red-500 ml-2">({unmatchedCount} ยังไม่จับคู่)</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setMatchedItems(prev => prev.map(item => ({
                    ...item,
                    is_confirmed: !!item.matched_product_id
                  })))
                }}
                className="flex items-center gap-2 text-sm"
              >
                <Check className="h-4 w-4" />
                ยืนยันทั้งหมด
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || confirmedCount === 0}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    นำเข้าสต็อก + สร้าง PO
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Import result */}
          {importResult && (
            <div className={`p-4 rounded-xl border ${
              importResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-3">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">
                    นำเข้าสำเร็จ {importResult.success} รายการ
                    {importResult.failed > 0 && ` (ล้มเหลว ${importResult.failed} รายการ)`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    สร้าง PO และอัพเดทสต็อกเรียบร้อยแล้ว · Mapping จะถูกบันทึกอัตโนมัติสำหรับการสแกนครั้งถัดไป
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
