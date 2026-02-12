import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { zortOutService } from '../services/zortout'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import SalesChannelCSVImportModal from '../components/common/SalesChannelCSVImportModal'
import { Package, Plus, History, Search, Edit, ExternalLink, Trash2, Tag, DollarSign, Printer, CheckSquare, Square, X, FileSpreadsheet, Barcode, AlertTriangle, ClipboardList, ShoppingCart, RotateCcw } from 'lucide-react'

interface Product {
  id: string
  name_th: string
  name_en: string
  barcode: string
  stock_quantity: number
  min_stock_level: number
  reorder_point: number
  unit_of_measure: string
  location: string
  brand?: string
  cost_price?: number
  selling_price_excl_vat?: number
  selling_price_incl_vat?: number
}

interface StockBatch {
  id: string
  product_id: string
  batch_number: string
  lot_number: string
  expiry_date: string
  quantity: number
  supplier: string
  is_active: boolean
}

interface StockMovement {
  id: string
  product_id: string
  batch_id: string
  movement_type: string
  quantity: number
  quantity_before: number
  quantity_after: number
  unit_cost: number
  total_cost: number
  reason: string
  notes: string
  movement_date: string
  reference_type: string
  reference_id: string
  created_by: string
}

export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchAction, setBatchAction] = useState<'brand' | 'cost' | 'price' | 'delete' | 'print' | null>(null)
  const [showChannelImportModal, setShowChannelImportModal] = useState(false)
  const [batchEditData, setBatchEditData] = useState({
    brand: '',
    cost_price: 0,
    selling_price_excl_vat: 0,
    selling_price_incl_vat: 0
  })
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'adjustment' as string,
    quantity: 0,
    reason: '',
    notes: ''
  })
  const [batchFormData, setBatchFormData] = useState({
    batch_number: '',
    lot_number: '',
    expiry_date: '',
    quantity: 0,
    supplier: '',
    cost_per_unit: 0
  })
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false)
  const [openingBalanceData, setOpeningBalanceData] = useState({
    productId: '',
    productName: '',
    quantity: 0,
    unitCost: 0,
    movementDate: '2025-12-31',
    notes: ''
  })
  const [openingBalanceSearchTerm, setOpeningBalanceSearchTerm] = useState('')
  const [openingBalanceSearchResults, setOpeningBalanceSearchResults] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      fetchBatches(selectedProduct.id)
      fetchMovements(selectedProduct.id)
    }
  }, [selectedProduct])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name_th')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBatches = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_batches')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('expiry_date')

      if (error) throw error
      setBatches(data || [])
    } catch (error) {
      console.error('Error fetching batches:', error)
    }
  }

  const fetchMovements = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('movement_date', { ascending: false })
        .limit(20)

      if (error) throw error
      setMovements(data || [])
    } catch (error) {
      console.error('Error fetching movements:', error)
    }
  }

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      
      const quantityChange = adjustmentData.type === 'purchase' || adjustmentData.type === 'return' 
        ? adjustmentData.quantity 
        : -adjustmentData.quantity

      const newQuantity = selectedProduct.stock_quantity + quantityChange

      // บันทึกการเคลื่อนไหวสต็อก
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: selectedProduct.id,
          movement_type: adjustmentData.type,
          quantity: quantityChange,
          quantity_before: selectedProduct.stock_quantity,
          quantity_after: newQuantity,
          reason: adjustmentData.reason,
          notes: adjustmentData.notes,
          created_by: userData?.user?.id
        })

      if (movementError) throw movementError

      // อัพเดตจำนวนสต็อก
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', selectedProduct.id)

      if (updateError) throw updateError

      // Sync to ZortOut when receiving stock (purchase/return types)
      if (adjustmentData.type === 'purchase' || adjustmentData.type === 'return') {
        try {
          const product = products.find(p => p.id === selectedProduct.id)
          if (product) {
            zortOutService.updateProductStockBySkuForReceiving(
              product.barcode || product.id,
              quantityChange,
              newQuantity
            ).then(result => {
              if (result.success) {
                console.log('Stock synced to ZortOut:', product.name_th, '+', quantityChange)
              } else {
                console.warn('Failed to sync stock to ZortOut:', result.error)
              }
            }).catch(err => {
              console.error('Error syncing stock to ZortOut:', err)
            })
          }
        } catch (syncError) {
          console.error('Exception during ZortOut stock sync:', syncError)
        }
      }

      // รีเฟรชข้อมูล
      await fetchProducts()
      await fetchMovements(selectedProduct.id)
      
      setShowAdjustModal(false)
      setAdjustmentData({
        type: 'adjustment',
        quantity: 0,
        reason: '',
        notes: ''
      })
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert('เกิดข้อผิดพลาดในการปรับสต็อก')
    }
  }

  const handleAddBatch = async () => {
    if (!selectedProduct) return

    try {
      const { data: userData } = await supabase.auth.getUser()

      // เพิ่ม batch ใหม่
      const { error: batchError } = await supabase
        .from('stock_batches')
        .insert({
          product_id: selectedProduct.id,
          batch_number: batchFormData.batch_number,
          lot_number: batchFormData.lot_number,
          expiry_date: batchFormData.expiry_date,
          quantity: batchFormData.quantity,
          supplier: batchFormData.supplier,
          cost_per_unit: batchFormData.cost_per_unit,
          created_by: userData?.user?.id
        })

      if (batchError) throw batchError

      // บันทึกการรับสินค้าเข้า
      const newQuantity = selectedProduct.stock_quantity + batchFormData.quantity

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: selectedProduct.id,
          movement_type: 'purchase',
          quantity: batchFormData.quantity,
          quantity_before: selectedProduct.stock_quantity,
          quantity_after: newQuantity,
          unit_cost: batchFormData.cost_per_unit,
          total_cost: batchFormData.quantity * batchFormData.cost_per_unit,
          reason: `รับสินค้า Batch: ${batchFormData.batch_number}`,
          notes: `Supplier: ${batchFormData.supplier}`,
          created_by: userData?.user?.id
        })

      if (movementError) throw movementError

      // Sync to ZortOut - add stock when receiving batch
      try {
        const product = products.find(p => p.id === selectedProduct.id)
        if (product) {
          zortOutService.updateProductStockBySkuForReceiving(
            product.barcode || product.id,
            batchFormData.quantity,
            newQuantity
          ).then(result => {
            if (result.success) {
              console.log('Stock synced to ZortOut (batch):', product.name_th, '+', batchFormData.quantity)
            } else {
              console.warn('Failed to sync batch stock to ZortOut:', result.error)
            }
          }).catch(err => {
            console.error('Error syncing batch stock to ZortOut:', err)
          })
        }
      } catch (syncError) {
        console.error('Exception during ZortOut batch stock sync:', syncError)
      }

      // รีเฟรชข้อมูล
      await fetchProducts()
      await fetchBatches(selectedProduct.id)
      await fetchMovements(selectedProduct.id)
      
      setShowBatchModal(false)
      setBatchFormData({
        batch_number: '',
        lot_number: '',
        expiry_date: '',
        quantity: 0,
        supplier: '',
        cost_per_unit: 0
      })
    } catch (error) {
      console.error('Error adding batch:', error)
      alert('เกิดข้อผิดพลาดในการเพิ่ม Batch')
    }
  }

  const filteredProducts = products.filter(product =>
    product.name_th?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm)
  )

  // Opening Balance Functions
  const handleOpeningBalanceSearch = (term: string) => {
    setOpeningBalanceSearchTerm(term)
    if (term.length > 0) {
      const results = products.filter(product =>
        product.name_th?.toLowerCase().includes(term.toLowerCase()) ||
        product.name_en?.toLowerCase().includes(term.toLowerCase()) ||
        product.barcode?.includes(term)
      )
      setOpeningBalanceSearchResults(results)
    } else {
      setOpeningBalanceSearchResults([])
    }
  }

  const handleSelectOpeningBalanceProduct = (product: Product) => {
    setOpeningBalanceData(prev => ({
      ...prev,
      productId: product.id,
      productName: product.name_th
    }))
    setOpeningBalanceSearchTerm(product.name_th)
    setOpeningBalanceSearchResults([])
  }

  const handleSaveOpeningBalance = async () => {
    if (!openingBalanceData.productId || openingBalanceData.quantity <= 0) {
      alert('กรุณาเลือกสินค้าและระบุจำนวนที่ถูกต้อง')
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      
      // Get current stock quantity first
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', openingBalanceData.productId)
        .single()

      const currentStock = currentProduct?.stock_quantity || 0
      const newStock = currentStock + openingBalanceData.quantity

      // Create opening balance stock movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: openingBalanceData.productId,
          movement_type: 'opening_balance',
          quantity: openingBalanceData.quantity,
          quantity_before: currentStock,
          quantity_after: newStock,
          unit_cost: openingBalanceData.unitCost,
          total_cost: openingBalanceData.unitCost * openingBalanceData.quantity,
          reason: 'ยอดยกมา',
          notes: openingBalanceData.notes,
          movement_date: `${openingBalanceData.movementDate}T00:00:00.000Z`,
          reference_type: 'opening_balance',
          created_by: userData?.user?.id
        })

      if (movementError) throw movementError

      // Update product stock quantity (ADD to existing, not replace)
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', openingBalanceData.productId)

      if (updateError) throw updateError

      // Refresh data
      await fetchProducts()
      if (selectedProduct?.id === openingBalanceData.productId) {
        await fetchMovements(openingBalanceData.productId)
      }

      // Reset form
      setShowOpeningBalanceModal(false)
      setOpeningBalanceData({
        productId: '',
        productName: '',
        quantity: 0,
        unitCost: 0,
        movementDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
      setOpeningBalanceSearchTerm('')

      alert('บันทึกยอดยกมาเรียบร้อยแล้ว')
    } catch (error) {
      console.error('Error saving opening balance:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกยอดยกมา')
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity <= product.min_stock_level) {
      return { color: 'text-red-600 bg-red-50', text: 'วิกฤต' }
    } else if (product.stock_quantity <= product.reorder_point) {
      return { color: 'text-yellow-600 bg-yellow-50', text: 'ต่ำ' }
    }
    return { color: 'text-green-600 bg-green-50', text: 'ปกติ' }
  }

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      purchase: 'รับเข้า',
      sale: 'ขายออก',
      adjustment: 'ปรับยอด',
      return: 'รับคืน',
      supplier_return: 'คืนซัพพลายเออร์',
      expired: 'หมดอายุ',
      damaged: 'เสียหาย',
      transfer: 'โอนย้าย'
    }
    return types[type] || type
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Batch Selection Handlers
  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
    setSelectAll(newSelected.size === filteredProducts.length)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set())
      setSelectAll(false)
    } else {
      const allIds = new Set(filteredProducts.map(p => p.id))
      setSelectedProducts(allIds)
      setSelectAll(true)
    }
  }

  // Batch Operations
  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) return
    if (!confirm(`ต้องการลบสินค้า ${selectedProducts.size} รายการ?`)) return
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', Array.from(selectedProducts))
      
      if (error) throw error
      
      setSelectedProducts(new Set())
      setSelectAll(false)
      await fetchProducts()
      alert(`ลบสินค้า ${selectedProducts.size} รายการเรียบร้อย`)
    } catch (error) {
      console.error('Error deleting products:', error)
      alert('เกิดข้อผิดพลาดในการลบสินค้า')
    }
  }

  const handleBatchBrand = async () => {
    if (selectedProducts.size === 0 || !batchEditData.brand) return
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ brand: batchEditData.brand })
        .in('id', Array.from(selectedProducts))
      
      if (error) throw error
      
      setBatchAction(null)
      setBatchEditData({ ...batchEditData, brand: '' })
      await fetchProducts()
      alert(`ตั้งแบรนด์ ${batchEditData.brand} ให้ ${selectedProducts.size} รายการเรียบร้อย`)
    } catch (error) {
      console.error('Error updating brand:', error)
      alert('เกิดข้อผิดพลาดในการตั้งแบรนด์')
    }
  }

  const handleBatchCost = async () => {
    if (selectedProducts.size === 0 || batchEditData.cost_price === 0) return
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ cost_price: batchEditData.cost_price })
        .in('id', Array.from(selectedProducts))
      
      if (error) throw error
      
      setBatchAction(null)
      setBatchEditData({ ...batchEditData, cost_price: 0 })
      await fetchProducts()
      alert(`ตั้งต้นทุน ฿${batchEditData.cost_price} ให้ ${selectedProducts.size} รายการเรียบร้อย`)
    } catch (error) {
      console.error('Error updating cost:', error)
      alert('เกิดข้อผิดพลาดในการตั้งต้นทุน')
    }
  }

  const handleBatchPrice = async () => {
    if (selectedProducts.size === 0 || batchEditData.selling_price_excl_vat === 0) return
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          selling_price_excl_vat: batchEditData.selling_price_excl_vat,
          selling_price_incl_vat: batchEditData.selling_price_incl_vat
        })
        .in('id', Array.from(selectedProducts))
      
      if (error) throw error
      
      setBatchAction(null)
      setBatchEditData({ 
        ...batchEditData, 
        selling_price_excl_vat: 0,
        selling_price_incl_vat: 0 
      })
      await fetchProducts()
      alert(`ตั้งราคาขายให้ ${selectedProducts.size} รายการเรียบร้อย`)
    } catch (error) {
      console.error('Error updating price:', error)
      alert('เกิดข้อผิดพลาดในการตั้งราคา')
    }
  }

  const handleBatchPrint = () => {
    if (selectedProducts.size === 0) return
    
    const selectedProductsData = products.filter(p => selectedProducts.has(p.id))
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const barcodeHtml = selectedProductsData.map(product => `
      <div style="display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ccc; text-align: center; width: 200px;">
        <div style="font-size: 12px; margin-bottom: 5px;">${product.name_th}</div>
        <svg id="barcode-${product.id}" style="width: 100%;"></svg>
        <div style="font-size: 14px; font-weight: bold;">${product.barcode}</div>
        <div style="font-size: 12px; color: #666;">฿${product.selling_price_excl_vat || 0}</div>
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์บาร์โค้ด</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
        </head>
        <body style="font-family: Arial, sans-serif;">
          <h1 style="text-align: center;">บาร์โค้ด ${selectedProductsData.length} รายการ</h1>
          <div>${barcodeHtml}</div>
          <script>
            window.onload = function() {
              ${selectedProductsData.map(p => `
                JsBarcode("#barcode-${p.id}", "${p.barcode}", {
                  format: "CODE128",
                  width: 2,
                  height: 50,
                  displayValue: false
                });
              `).join('')}
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-[#7D735F]" />
            จัดการสต็อก
          </h1>
          <p className="text-gray-600 mt-1">ปรับยอดสต็อก, จัดการ Batch และติดตามการเคลื่อนไหว</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => window.location.href = '/stock-counting'}
            className="flex items-center gap-2"
          >
            <Barcode className="h-4 w-4" />
            ระบบนับสต็อก
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/manual-stock-cut-report'}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            รายงานตัดสต็อกแมนนวล
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/stock-replenishment-report'}
            className="flex items-center gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            รายงานแจ้งเติมสต็อก
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/purchase-preparation-report'}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            รายงานเตรียมสั่งซื้อ
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowChannelImportModal(true)}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            นำเข้าช่องทางขาย
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วยชื่อสินค้า หรือบาร์โค้ด..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
            />
          </div>
        </div>
      </Card>

      {/* Batch Operations Toolbar */}
      {selectedProducts.size > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              เลือก {selectedProducts.size} รายการ
            </span>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBatchAction('brand')}
                className="flex items-center gap-1"
              >
                <Tag className="h-4 w-4" />
                ตั้งแบรนด์
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBatchAction('cost')}
                className="flex items-center gap-1"
              >
                <DollarSign className="h-4 w-4" />
                ตั้งต้นทุน
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBatchAction('price')}
                className="flex items-center gap-1"
              >
                <DollarSign className="h-4 w-4" />
                ตั้งราคาขาย
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBatchPrint}
                className="flex items-center gap-1"
              >
                <Printer className="h-4 w-4" />
                พิมพ์บาร์โค้ด
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBatchDelete}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                ลบ
              </Button>
            </div>
            <button
              onClick={() => {
                setSelectedProducts(new Set())
                setSelectAll(false)
              }}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 inline" />
              ยกเลิกการเลือก
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">รายการสินค้า</h2>
            <button
              onClick={toggleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {selectAll ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  ยกเลิกเลือกทั้งหมด
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  เลือกทั้งหมด ({filteredProducts.length})
                </>
              )}
            </button>
          </div>
          
          {loading ? (
            <p className="text-center text-gray-600">กำลังโหลด...</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredProducts.map((product) => {
                const status = getStockStatus(product)
                const isSelected = selectedProducts.has(product.id)
                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedProduct?.id === product.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleProductSelection(product.id)
                        }}
                        className="mt-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name_th}</h3>
                        <p className="text-sm text-gray-600">{product.barcode}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-gray-600">
                            คงเหลือ: <strong>{product.stock_quantity}</strong> {product.unit_of_measure}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Product Details */}
        {selectedProduct ? (
          <div className="space-y-6">
            {/* Stock Info */}
            <Card>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedProduct.name_th}</h2>
                  <p className="text-sm text-gray-600">{selectedProduct.barcode}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAdjustModal(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    ปรับสต็อก
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (selectedProduct) {
                        setOpeningBalanceData({
                          productId: selectedProduct.id,
                          productName: selectedProduct.name_th,
                          quantity: 0,
                          unitCost: 0,
                          movementDate: '2025-12-31',
                          notes: ''
                        })
                        setOpeningBalanceSearchTerm(selectedProduct.name_th)
                      }
                      setShowOpeningBalanceModal(true)
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    ยอดยกมา
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowBatchModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    เพิ่ม Batch
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">คงเหลือ</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedProduct.stock_quantity} {selectedProduct.unit_of_measure}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ตำแหน่ง</p>
                  <p className="font-medium text-gray-900">{selectedProduct.location || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">จุดสั่งซื้อ</p>
                  <p className="font-medium text-gray-900">{selectedProduct.reorder_point}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ขั้นต่ำ</p>
                  <p className="font-medium text-gray-900">{selectedProduct.min_stock_level}</p>
                </div>
              </div>
            </Card>

            {/* Batches */}
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Batch/Lot</h3>
              {batches.length === 0 ? (
                <p className="text-center text-gray-600">ไม่มีข้อมูล Batch</p>
              ) : (
                <div className="space-y-2">
                  {batches.map((batch) => {
                    const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date)
                    return (
                      <div key={batch.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              Batch: {batch.batch_number}
                            </p>
                            {batch.lot_number && (
                              <p className="text-sm text-gray-600">Lot: {batch.lot_number}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              จำนวน: {batch.quantity} | ซัพพลายเออร์: {batch.supplier || '-'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">หมดอายุ</p>
                            <p className={`font-medium ${
                              daysUntilExpiry <= 30 ? 'text-red-600' :
                              daysUntilExpiry <= 90 ? 'text-yellow-600' :
                              'text-gray-900'
                            }`}>
                              {new Date(batch.expiry_date).toLocaleDateString('th-TH')}
                            </p>
                            <p className="text-xs text-gray-600">
                              ({daysUntilExpiry} วัน)
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Recent Movements */}
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                <History className="inline h-5 w-5 mr-2" />
                ประวัติการเคลื่อนไหว
              </h3>
              {movements.length === 0 ? (
                <p className="text-center text-gray-600">ไม่มีประวัติ</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {movements.map((movement) => (
                    <div key={movement.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            movement.quantity > 0 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {getMovementTypeLabel(movement.movement_type)}
                          </span>
                          {movement.reference_type === 'purchase_order' && (
                            <span className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              <ExternalLink className="inline h-3 w-3 mr-1" />
                              {movement.notes || 'PO'}
                            </span>
                          )}
                          <p className="text-sm text-gray-900 mt-1">
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity} {selectedProduct.unit_of_measure}
                          </p>
                          {movement.reason && (
                            <p className="text-xs text-gray-600">{movement.reason}</p>
                          )}
                          {movement.unit_cost > 0 && (
                            <p className="text-xs text-gray-500">ราคา: ฿{movement.unit_cost}/{selectedProduct.unit_of_measure}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">
                            {new Date(movement.movement_date).toLocaleDateString('th-TH')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {movement.quantity_before} → {movement.quantity_after}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">เลือกสินค้าเพื่อดูรายละเอียด</p>
            </div>
          </Card>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ปรับยอดสต็อก</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedProduct.name_th}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ประเภท</label>
                <select
                  value={adjustmentData.type}
                  onChange={(e) => setAdjustmentData({...adjustmentData, type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="adjustment">ปรับยอด</option>
                  <option value="purchase">รับเข้า</option>
                  <option value="return">รับคืน</option>
                  <option value="damaged">เสียหาย</option>
                  <option value="expired">หมดอายุ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">จำนวน</label>
                <input
                  type="number"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({...adjustmentData, quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">เหตุผล</label>
                <input
                  type="text"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({...adjustmentData, reason: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="ระบุเหตุผล..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
                <textarea
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({...adjustmentData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleStockAdjustment}
                disabled={adjustmentData.quantity === 0}
              >
                บันทึก
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAdjustModal(false)
                  setAdjustmentData({
                    type: 'adjustment',
                    quantity: 0,
                    reason: '',
                    notes: ''
                  })
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Batch Modal */}
      {showBatchModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">เพิ่ม Batch ใหม่</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedProduct.name_th}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number *</label>
                <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-2.5 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <input
                    type="text"
                    value={batchFormData.batch_number}
                    onChange={(e) => setBatchFormData({...batchFormData, batch_number: e.target.value})}
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lot Number</label>
                <input
                  type="text"
                  value={batchFormData.lot_number}
                  onChange={(e) => setBatchFormData({...batchFormData, lot_number: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">วันหมดอายุ *</label>
                <input
                  type="date"
                  value={batchFormData.expiry_date}
                  onChange={(e) => setBatchFormData({...batchFormData, expiry_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">จำนวน *</label>
                <input
                  type="number"
                  value={batchFormData.quantity}
                  onChange={(e) => setBatchFormData({...batchFormData, quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ซัพพลายเออร์</label>
                <input
                  type="text"
                  value={batchFormData.supplier}
                  onChange={(e) => setBatchFormData({...batchFormData, supplier: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ราคาต่อหน่วย</label>
                <input
                  type="number"
                  value={batchFormData.cost_per_unit}
                  onChange={(e) => setBatchFormData({...batchFormData, cost_per_unit: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleAddBatch}
                disabled={!batchFormData.batch_number || !batchFormData.expiry_date || batchFormData.quantity === 0}
              >
                บันทึก
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBatchModal(false)
                  setBatchFormData({
                    batch_number: '',
                    lot_number: '',
                    expiry_date: '',
                    quantity: 0,
                    supplier: '',
                    cost_per_unit: 0
                  })
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Batch Brand Modal */}
      {batchAction === 'brand' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ตั้งแบรนด์สินค้า</h3>
            <p className="text-sm text-gray-600 mb-4">เลือก {selectedProducts.size} รายการ</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">แบรนด์</label>
                <input
                  type="text"
                  value={batchEditData.brand}
                  onChange={(e) => setBatchEditData({...batchEditData, brand: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="ระบุชื่อแบรนด์..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleBatchBrand}
                disabled={!batchEditData.brand}
              >
                บันทึก
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBatchAction(null)}
              >
                ยกเลิก
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Batch Cost Modal */}
      {batchAction === 'cost' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ตั้งต้นทุนสินค้า</h3>
            <p className="text-sm text-gray-600 mb-4">เลือก {selectedProducts.size} รายการ</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ต้นทุน (฿)</label>
                <input
                  type="number"
                  value={batchEditData.cost_price || ''}
                  onChange={(e) => setBatchEditData({...batchEditData, cost_price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleBatchCost}
                disabled={batchEditData.cost_price === 0}
              >
                บันทึก
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBatchAction(null)}
              >
                ยกเลิก
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Batch Price Modal */}
      {batchAction === 'price' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ตั้งราคาขายสินค้า</h3>
            <p className="text-sm text-gray-600 mb-4">เลือก {selectedProducts.size} รายการ</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ราคาขายไม่รวม VAT (฿)</label>
                <input
                  type="number"
                  value={batchEditData.selling_price_excl_vat || ''}
                  onChange={(e) => {
                    const excl_vat = parseFloat(e.target.value) || 0
                    const incl_vat = Math.round(excl_vat * 1.07 * 100) / 100
                    setBatchEditData({
                      ...batchEditData,
                      selling_price_excl_vat: excl_vat,
                      selling_price_incl_vat: incl_vat
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ราคาขายรวม VAT (฿)</label>
                <input
                  type="number"
                  value={batchEditData.selling_price_incl_vat || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">คำนวณอัตโนมัติ (VAT 7%)</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleBatchPrice}
                disabled={batchEditData.selling_price_excl_vat === 0}
              >
                บันทึก
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBatchAction(null)}
              >
                ยกเลิก
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* Opening Balance Modal */}
      {showOpeningBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-blue-600" />
                ยอดยกมา (Opening Balance)
              </h3>
              <button
                onClick={() => setShowOpeningBalanceModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า *</label>
                <input
                  type="text"
                  value={openingBalanceSearchTerm}
                  onChange={(e) => handleOpeningBalanceSearch(e.target.value)}
                  placeholder="ค้นหาด้วยชื่อสินค้า หรือบาร์โค้ด..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {openingBalanceSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {openingBalanceSearchResults.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectOpeningBalanceProduct(product)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{product.name_th}</span>
                          <span className="text-sm text-gray-500 ml-2">({product.barcode})</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          คงเหลือ: {product.stock_quantity} {product.unit_of_measure}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนยอดยกมา *</label>
                <input
                  type="number"
                  value={openingBalanceData.quantity || ''}
                  onChange={(e) => setOpeningBalanceData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ยกมา *</label>
                <input
                  type="date"
                  value={openingBalanceData.movementDate}
                  onChange={(e) => setOpeningBalanceData(prev => ({ ...prev, movementDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Unit Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ราคาต่อหน่วย (฿)</label>
                <input
                  type="number"
                  value={openingBalanceData.unitCost || ''}
                  onChange={(e) => setOpeningBalanceData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={openingBalanceData.notes}
                  onChange={(e) => setOpeningBalanceData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="เช่น ยอดยกมาจากระบบเก่า..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleSaveOpeningBalance}
                disabled={!openingBalanceData.productId || openingBalanceData.quantity <= 0}
              >
                บันทึกยอดยกมา
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowOpeningBalanceModal(false)
                  setOpeningBalanceData({
                    productId: '',
                    productName: '',
                    quantity: 0,
                    unitCost: 0,
                    movementDate: '2025-12-31',
                    notes: ''
                  })
                  setOpeningBalanceSearchTerm('')
                  setOpeningBalanceSearchResults([])
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Sales Channel Import Modal */}
      <SalesChannelCSVImportModal
        isOpen={showChannelImportModal}
        onClose={() => setShowChannelImportModal(false)}
        onSuccess={() => {
          setShowChannelImportModal(false)
          fetchProducts()
        }}
      />
    </div>
  )
}
