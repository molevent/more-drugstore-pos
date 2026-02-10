import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { FileText, Plus, Trash2, X, Search, CheckCircle, Package, AlertCircle, ShoppingCart, Eye, History, RefreshCw } from 'lucide-react'
import { zortOutService } from '../services/zortout'
import type { Product } from '../types/database'

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_name: string
  supplier_contact: string
  order_date: string
  expected_delivery_date: string
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled' | 'success'
  payment_status: 'unpaid' | 'partial' | 'paid'
  warehouse_id: string
  total_amount: number
  tax_amount: number
  discount_amount: number
  net_amount: number
  notes: string
  created_at: string
}

interface Contact {
  id: string
  name: string
  type: 'buyer' | 'seller' | 'both'
  phone: string
  email: string
  company_name: string
  code?: string
}

interface POItem {
  id: string
  purchase_order_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  total_amount: number
  notes: string
  product?: {
    name_th: string
    sku: string
  }
}

interface Warehouse {
  id: string
  name: string
  code: string
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('th-TH')
}

export default function PurchaseOrderPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [poItems, setPoItems] = useState<POItem[]>([])
  const [poMovements, setPoMovements] = useState<any[]>([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  const [poFormData, setPoFormData] = useState({
    supplier_name: '',
    supplier_contact: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    warehouse_id: '',
    reference: '',
    notes: '',
    status: 'draft'
  })

  const [itemFormData, setItemFormData] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 7,
    notes: '',
    price_includes_vat: true
  })

  useEffect(() => {
    fetchPurchaseOrders()
    fetchProducts()
    fetchWarehouses()
    fetchContacts()
  }, [])

  const fetchPurchaseOrders = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPurchaseOrders(data)
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name_th')
    if (data) setProducts(data)
  }

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name')
    if (data) {
      setWarehouses(data)
      // Set default warehouse to 'คลังสินค้าหลัก' (main warehouse) if available
      const mainWarehouse = data.find(w => w.name === 'คลังสินค้าหลัก' || w.code === 'MAIN')
      if (mainWarehouse && !poFormData.warehouse_id) {
        setPoFormData(prev => ({ ...prev, warehouse_id: mainWarehouse.id }))
      } else if (data.length > 0 && !poFormData.warehouse_id) {
        // Fallback to first warehouse if main not found
        setPoFormData(prev => ({ ...prev, warehouse_id: data[0].id }))
      }
    }
  }

  // Fetch contacts that are sellers or both (can supply products)
  const fetchContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .in('type', ['seller', 'both'])
      .order('name')
    if (data) setContacts(data)
  }

  // Generate PO number: PO-YYYY-XXXXX
  const generatePONumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `PO-${year}-`
    
    // Get the latest PO number for this year
    const { data } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .ilike('po_number', `${prefix}%`)
      .order('po_number', { ascending: false })
      .limit(1)
    
    let nextNumber = 1
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].po_number.replace(prefix, ''))
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }
    
    return `${prefix}${String(nextNumber).padStart(5, '0')}`
  }

  const calculateItemTotals = () => {
    const subtotal = itemFormData.quantity * itemFormData.unit_price
    const discountAmount = subtotal * (itemFormData.discount_percent / 100)
    const afterDiscount = subtotal - discountAmount
    
    // Calculate tax based on whether price includes VAT or not
    let taxAmount = 0
    let finalSubtotal = afterDiscount
    
    if (itemFormData.price_includes_vat) {
      // Price includes VAT: need to extract tax from the amount
      // VAT amount = total * (tax_rate / (100 + tax_rate))
      taxAmount = afterDiscount * (itemFormData.tax_percent / (100 + itemFormData.tax_percent))
      finalSubtotal = afterDiscount - taxAmount
    } else {
      // Price excludes VAT: add tax on top
      taxAmount = afterDiscount * (itemFormData.tax_percent / 100)
    }
    
    const total = finalSubtotal + taxAmount
    return { subtotal, discountAmount, taxAmount, total, finalSubtotal }
  }

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Generate PO number
      const poNumber = await generatePONumber()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([{
          ...poFormData,
          po_number: poNumber,
          status: poFormData.status,
          payment_status: 'unpaid',
          reference: poFormData.reference || ''
        }])
        .select()
        .single()
      
      if (error) throw error
      
      setShowModal(false)
      setSelectedContactId('') // Reset selected contact
      setPoFormData({
        supplier_name: '',
        supplier_contact: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        warehouse_id: '',
        reference: '',
        notes: '',
        status: 'draft'
      })
      fetchPurchaseOrders()
      
      // Open the new PO to add items
      if (data) {
        setSelectedPO(data)
        setShowItemModal(true)
      }
    } catch (error: any) {
      alert('Error creating PO: ' + error.message)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPO) return

    try {
      const totals = calculateItemTotals()
      
      // 1. Add PO item
      const { error: itemError } = await supabase
        .from('purchase_order_items')
        .insert([{
          purchase_order_id: selectedPO.id,
          product_id: itemFormData.product_id,
          quantity: itemFormData.quantity,
          unit_price: itemFormData.unit_price,
          discount_percent: itemFormData.discount_percent,
          discount_amount: totals.discountAmount,
          tax_percent: itemFormData.tax_percent,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          notes: itemFormData.notes
        }])
      
      if (itemError) throw itemError
      
      // 2. Get product info
      const product = products.find(p => p.id === itemFormData.product_id)
      if (!product) throw new Error('Product not found')
      
      const quantityBefore = product.stock_quantity || 0
      const quantityAfter = quantityBefore + itemFormData.quantity
      
      // 3. Add stock batch
      const batchNumber = `PO-${selectedPO.po_number}-${Date.now()}`
      const { data: batchData, error: batchError } = await supabase
        .from('stock_batches')
        .insert([{
          product_id: itemFormData.product_id,
          batch_number: batchNumber,
          quantity: itemFormData.quantity,
          cost_per_unit: itemFormData.unit_price,
          supplier: selectedPO.supplier_name,
          expiry_date: selectedPO.expected_delivery_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: `รับจาก PO: ${selectedPO.po_number}`
        }])
        .select()
        .single()
      
      if (batchError) console.warn('Batch creation warning:', batchError)
      
      // 4. Update product stock quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: quantityAfter })
        .eq('id', itemFormData.product_id)
      
      if (updateError) throw updateError
      
      // 5. Record stock movement
      const { data: userData } = await supabase.auth.getUser()
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: itemFormData.product_id,
          batch_id: batchData?.id || null,
          movement_type: 'purchase',
          quantity: itemFormData.quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          unit_cost: itemFormData.unit_price,
          total_cost: totals.subtotal,
          reference_type: 'purchase_order',
          reference_id: selectedPO.id,
          reason: `รับสินค้าจาก ${selectedPO.supplier_name}`,
          notes: `PO: ${selectedPO.po_number}`,
          created_by: userData?.user?.id
        })
      
      if (movementError) console.warn('Movement recording warning:', movementError)
      
      // 6. Sync to ZortOut (async - don't block UI)
      if (product.barcode) {
        zortOutService.updateProductStockBySkuForReceiving(
          product.barcode,
          itemFormData.quantity,
          quantityAfter
        ).then(result => {
          if (result.success) {
            console.log('Stock synced to ZortOut:', product.name_th, '+', itemFormData.quantity)
          } else {
            console.warn('Failed to sync stock to ZortOut:', result.error)
          }
        }).catch(err => {
          console.error('Error syncing stock to ZortOut:', err)
        })
      }
      
      // 7. Update PO status to 'received' if first item
      if (selectedPO.status === 'draft' || selectedPO.status === 'sent') {
        await supabase
          .from('purchase_orders')
          .update({ status: 'received' })
          .eq('id', selectedPO.id)
      }
      
      setItemFormData({
        product_id: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_percent: 7,
        notes: '',
        price_includes_vat: false
      })
      
      fetchPurchaseOrders()
      fetchProducts() // Refresh product stock
      alert('เพิ่มรายการสินค้าและรับเข้าสต็อกเรียบร้อย')
    } catch (error: any) {
      alert('Error adding item: ' + error.message)
    }
  }

  const handleDeletePO = async (id: string) => {
    if (!confirm('ยืนยันการลบ PO นี้?')) return
    try {
      await supabase.from('purchase_orders').delete().eq('id', id)
      fetchPurchaseOrders()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleUpdateStatus = async (po: PurchaseOrder, newStatus: string) => {
    try {
      await supabase
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', po.id)
      fetchPurchaseOrders()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleMarkAsReceivedAndPaid = async (po: PurchaseOrder) => {
    if (!confirm('ยืนยันการรับสินค้าครบและชำระเงินแล้ว?')) return
    try {
      await supabase
        .from('purchase_orders')
        .update({ 
          status: 'received',
          payment_status: 'paid'
        })
        .eq('id', po.id)
      fetchPurchaseOrders()
      alert('อัปเดตสถานะเป็น "รับครบและชำระแล้ว" เรียบร้อย')
    } catch (error: any) {
      alert(error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: FileText, label: 'ร่าง' },
      sent: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'ส่งแล้ว' },
      partial: { color: 'bg-yellow-100 text-yellow-700', icon: Package, label: 'รับบางส่วน' },
      received: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'รับครบ' },
      cancelled: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'ยกเลิก' }
    }
    
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const config: Record<string, { color: string; label: string }> = {
      unpaid: { color: 'bg-red-100 text-red-700', label: 'ยังไม่ชำระ' },
      partial: { color: 'bg-yellow-100 text-yellow-700', label: 'ชำระบางส่วน' },
      paid: { color: 'bg-green-100 text-green-700', label: 'ชำระครบ' }
    }
    
    const status = config[paymentStatus] || config.unpaid
    
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
        {status.label}
      </span>
    )
  }

  const filteredPOs = purchaseOrders.filter(po => {
    // Handle combined status+payment filters
    if (statusFilter === 'waiting_transfer') {
      return po.status === 'sent' && po.payment_status !== 'paid'
    }
    if (statusFilter === 'transfer_completed') {
      return po.status === 'received' && po.payment_status !== 'paid'
    }
    if (statusFilter === 'waiting_payment') {
      return (po.status === 'sent' || po.status === 'received') && po.payment_status === 'unpaid'
    }
    if (statusFilter === 'payment_completed') {
      return po.payment_status === 'paid'
    }
    const matchesStatus = !statusFilter || po.status === statusFilter
    const matchesSearch = !searchTerm || 
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Fetch PO items with product details
  const fetchPOItems = async (poId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          product:products(name_th, sku)
        `)
        .eq('purchase_order_id', poId)
      
      if (error) throw error
      setPoItems(data || [])
    } catch (error) {
      console.error('Error fetching PO items:', error)
    }
  }

  // Fetch stock movements related to PO
  const fetchPOMovements = async (poId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(name_th, unit_of_measure)
        `)
        .eq('reference_type', 'purchase_order')
        .eq('reference_id', poId)
        .order('movement_date', { ascending: false })
      
      if (error) throw error
      setPoMovements(data || [])
    } catch (error) {
      console.error('Error fetching PO movements:', error)
    }
  }

  const syncPOToZortOut = async (po: PurchaseOrder) => {
    if (!poItems || poItems.length === 0) {
      alert('ไม่มีรายการสินค้าใน PO นี้')
      return
    }

    setIsSyncing(true)
    try {
      // Prepare items for ZortOut
      const zortItems = poItems.map(item => {
        const product = products.find(p => p.id === item.product_id)
        return {
          sku: product?.barcode || product?.sku || item.product_id,
          name: item.product?.name_th || product?.name_th || 'Unknown',
          quantity: item.quantity,
          pricepernumber: item.unit_price,
          totalprice: item.total_amount,
          discount: item.discount_amount > 0 ? item.discount_amount.toString() : '',
          vat_status: item.tax_amount > 0 ? 2 : 0 // 2 = Have Vat, 0 = Follow Vat Type
        }
      })

      // Calculate VAT type
      let vattype = 1 // No Vat (default)
      const totalTax = po.tax_amount || 0
      if (totalTax > 0) {
        vattype = 2 // Exclude Vat
      }

      // Get warehouse code
      const warehouse = warehouses.find(w => w.id === po.warehouse_id)
      const warehousecode = warehouse?.code || ''

      // Find contact code from supplier name
      const contact = contacts.find(c => 
        c.company_name === po.supplier_name || c.name === po.supplier_name
      )
      const customercode = contact?.code || ''

      const result = await zortOutService.addPurchaseOrder({
        number: po.po_number,
        customername: po.supplier_name,
        customerphone: po.supplier_contact || '',
        customercode: customercode,
        purchaseorderdate: po.order_date,
        amount: po.total_amount,
        vatamount: po.tax_amount || 0,
        vattype: vattype as 1 | 2 | 3,
        warehousecode: warehousecode,
        discount: po.discount_amount > 0 ? po.discount_amount.toString() : '',
        description: po.notes || '',
        reference: '',
        items: zortItems
      })

      if (result.success) {
        alert(`Sync PO ไปยัง ZortOut สำเร็จ! (PO ID: ${result.poId})`)
        // Check PO status to determine stock transfer behavior
        if (result.poId) {
          const today = new Date().toISOString().split('T')[0]
          if (po.status === 'success') {
            // Status = success: transfer stock immediately in ZortOut
            await zortOutService.updatePurchaseOrderStatus(result.poId.toString(), 'Success', warehousecode, today)
            alert('สถานะ: โอนสินค้าเข้าคลังสำเร็จ (ZortOut)')
          } else {
            // Status = draft: keep as Waiting in ZortOut (no immediate transfer)
            await zortOutService.updatePurchaseOrderStatus(result.poId.toString(), 'Waiting', warehousecode, today)
            alert('สถานะ: รอโอนสินค้า (ZortOut) - สามารถโอนเข้าคลังภายหลังได้')
          }
        }
        // Refresh PO list
        fetchPurchaseOrders()
      } else {
        alert(`Sync ไม่สำเร็จ: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Error syncing PO to ZortOut:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const openPODetail = (po: PurchaseOrder) => {
    setSelectedPO(po)
    fetchPOItems(po.id)
    fetchPOMovements(po.id)
    setShowDetailModal(true)
  }

  // Delete the duplicate formatDate function below

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-7 w-7 text-blue-600" />
              ใบสั่งซื้อ (Purchase Orders)
            </h1>
            <p className="text-gray-600 mt-1">จัดการใบสั่งซื้อจากซัพพลายเออร์</p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="h-5 w-5 mr-2" />
            สร้าง PO ใหม่
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white">
            <div className="text-sm text-gray-500">ทั้งหมด</div>
            <div className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-orange-600">รอโอนสินค้า</div>
            <div className="text-2xl font-bold text-orange-700">
              {purchaseOrders.filter(po => po.status === 'sent' && po.payment_status !== 'paid').length}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-green-600">โอนสินค้าสำเร็จ</div>
            <div className="text-2xl font-bold text-green-700">
              {purchaseOrders.filter(po => po.status === 'received' && po.payment_status !== 'paid').length}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-red-600">รอชำระเงิน</div>
            <div className="text-2xl font-bold text-red-700">
              {purchaseOrders.filter(po => (po.status === 'sent' || po.status === 'received') && po.payment_status === 'unpaid').length}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm text-blue-600">ชำระเงินสำเร็จ</div>
            <div className="text-2xl font-bold text-blue-700">
              {purchaseOrders.filter(po => po.payment_status === 'paid').length}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="flex items-center gap-2 bg-[#E8EBF0] rounded-full px-4 py-3 border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาใบสำคัญจ่าย..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">สถานะทั้งหมด</option>
              <option value="waiting_transfer">รอโอนสินค้า</option>
              <option value="transfer_completed">โอนสินค้าสำเร็จ</option>
              <option value="waiting_payment">รอชำระเงิน</option>
              <option value="payment_completed">ชำระเงินสำเร็จ</option>
              <option value="draft">ร่าง</option>
              <option value="sent">ส่งแล้ว</option>
              <option value="partial">รับบางส่วน</option>
              <option value="received">รับครบ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">กำลังโหลด...</p>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>ไม่พบใบสั่งซื้อ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ซัพพลายเออร์</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สั่ง</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openPODetail(po)}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-blue-600 hover:underline">{po.po_number}</div>
                        <div className="text-sm text-gray-500">
                          {warehouses.find(w => w.id === po.warehouse_id)?.name || 'ไม่ระบุคลัง'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{po.supplier_name}</div>
                        <div className="text-sm text-gray-500">{po.supplier_contact}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{formatDate(po.order_date)}</div>
                        <div className="text-sm text-gray-500">
                          รับ: {formatDate(po.expected_delivery_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(po.status)}
                        <div className="mt-1">{getPaymentStatusBadge(po.payment_status || 'unpaid')}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          ฿{po.total_amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openPODetail(po)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            ดู
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPO(po)
                              setShowItemModal(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            รับสินค้า
                          </Button>
                          <select
                            value={po.status}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleUpdateStatus(po, e.target.value)
                            }}
                            className="text-sm px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="draft">ร่าง</option>
                            <option value="sent">ส่งแล้ว</option>
                            <option value="partial">รับบางส่วน</option>
                            <option value="received">รับครบ</option>
                            <option value="cancelled">ยกเลิก</option>
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePO(po.id)
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create PO Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">สร้างใบสั่งซื้อใหม่</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreatePO} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลือกคู่ค้า (ซัพพลายเออร์)</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => {
                      const contactId = e.target.value
                      setSelectedContactId(contactId)
                      const contact = contacts.find(c => c.id === contactId)
                      if (contact) {
                        setPoFormData({
                          ...poFormData,
                          supplier_name: contact.company_name || contact.name,
                          supplier_contact: contact.phone || contact.email || ''
                        })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- เลือกจากผู้ติดต่อ --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name || c.name} {c.phone && `(${c.phone})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อซัพพลายเออร์ *</label>
                  <Input
                    value={poFormData.supplier_name}
                    onChange={(e) => setPoFormData({ ...poFormData, supplier_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ข้อมูลติดต่อ</label>
                  <Input
                    value={poFormData.supplier_contact}
                    onChange={(e) => setPoFormData({ ...poFormData, supplier_contact: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สั่งซื้อ</label>
                    <Input
                      type="date"
                      value={poFormData.order_date}
                      onChange={(e) => setPoFormData({ ...poFormData, order_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่คาดว่าจะรับ</label>
                    <Input
                      type="date"
                      value={poFormData.expected_delivery_date}
                      onChange={(e) => setPoFormData({ ...poFormData, expected_delivery_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">คลังสินค้าที่รับ</label>
                  <select
                    value={poFormData.warehouse_id}
                    onChange={(e) => setPoFormData({ ...poFormData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกคลัง</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                  <select
                    value={poFormData.status}
                    onChange={(e) => setPoFormData({ ...poFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="draft">รอโอนสินค้า</option>
                    <option value="success">โอนสินค้าสำเร็จ (เข้าคลังทันที)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อ้างอิง (เลขที่ใบกำกับภาษี/ใบเสร็จ)</label>
                  <Input
                    value={poFormData.reference}
                    onChange={(e) => setPoFormData({ ...poFormData, reference: e.target.value })}
                    placeholder="INV-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                  <Input
                    value={poFormData.notes}
                    onChange={(e) => setPoFormData({ ...poFormData, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" variant="primary" className="flex-1">
                    สร้าง PO
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                    ยกเลิก
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Items Modal */}
        {showItemModal && selectedPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">เพิ่มสินค้าใน PO</h2>
                  <p className="text-sm text-gray-500">{selectedPO.po_number}</p>
                </div>
                <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า *</label>
                  <select
                    value={itemFormData.product_id}
                    onChange={(e) => {
                      const product = products.find(p => p.id === e.target.value)
                      setItemFormData({
                        ...itemFormData,
                        product_id: e.target.value,
                        unit_price: product?.cost_price || 0
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกสินค้า</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name_th} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน *</label>
                    <Input
                      type="number"
                      min={1}
                      value={itemFormData.quantity}
                      onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ราคาต่อหน่วย *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={itemFormData.unit_price}
                      onChange={(e) => setItemFormData({ ...itemFormData, unit_price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ส่วนลด (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={itemFormData.discount_percent}
                      onChange={(e) => setItemFormData({ ...itemFormData, discount_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ภาษี (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={itemFormData.tax_percent}
                      onChange={(e) => setItemFormData({ ...itemFormData, tax_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                {/* VAT Toggle */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="price_includes_vat"
                    checked={itemFormData.price_includes_vat}
                    onChange={(e) => setItemFormData({ ...itemFormData, price_includes_vat: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="price_includes_vat" className="text-sm text-gray-700 cursor-pointer">
                    ราคาที่ระบุ <strong>รวม VAT แล้ว</strong> (Price includes VAT)
                  </label>
                  <span className="text-xs text-gray-500 ml-auto">
                    {itemFormData.price_includes_vat ? 'ระบบจะแยก VAT ออกจากราคา' : 'ระบบจะคิด VAT เพิ่มจากราคา'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                  <Input
                    value={itemFormData.notes}
                    onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                  />
                </div>
                {/* Preview calculated totals */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>รวมเงิน:</span>
                    <span>฿{calculateItemTotals().subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ส่วนลด:</span>
                    <span>฿{calculateItemTotals().discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ภาษี:</span>
                    <span>฿{calculateItemTotals().taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>ยอดรวม:</span>
                    <span>฿{calculateItemTotals().total.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" variant="primary" className="flex-1">
                    เพิ่มรายการ
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowItemModal(false)}>
                    ปิด
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* PO Detail Modal */}
        {showDetailModal && selectedPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPO.po_number}</h2>
                  <p className="text-sm text-gray-500">{selectedPO.supplier_name}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedPO.status)}
                  <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* PO Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">วันที่สั่ง</p>
                  <p className="font-medium">{formatDate(selectedPO.order_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">วันที่รับ</p>
                  <p className="font-medium">{formatDate(selectedPO.expected_delivery_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">คลัง</p>
                  <p className="font-medium">{warehouses.find(w => w.id === selectedPO.warehouse_id)?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">สถานะ</p>
                  <select
                    value={selectedPO.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value
                      const { error } = await supabase
                        .from('purchase_orders')
                        .update({ status: newStatus, updated_at: new Date().toISOString() })
                        .eq('id', selectedPO.id)
                      if (!error) {
                        setSelectedPO({ ...selectedPO, status: newStatus as any })
                        fetchPurchaseOrders()
                      } else {
                        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ')
                      }
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">รอโอนสินค้า</option>
                    <option value="success">โอนสินค้าสำเร็จ</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedPO.status === 'success' ? 'ส่งไป ZortOut: โอนเข้าคลังทันที' : 'ส่งไป ZortOut: รอโอนเข้าคลัง'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ยอดรวม</p>
                  <p className="font-medium text-blue-600">฿{selectedPO.total_amount?.toLocaleString() || '0'}</p>
                </div>
              </div>

              {/* PO Items */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">รายการสินค้า</h3>
                {poItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">ยังไม่มีรายการสินค้า</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">สินค้า</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">จำนวน</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ราคา/หน่วย</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {poItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">{item.product?.name_th || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{item.product?.sku || ''}</div>
                          </td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">฿{item.unit_price?.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-medium">฿{item.total_amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Stock Movements */}
              {poMovements.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <History className="h-5 w-5 mr-2" />
                    รายการเคลื่อนไหวสต็อก
                  </h3>
                  <div className="space-y-2">
                    {poMovements.map((movement) => (
                      <div key={movement.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              รับเข้า
                            </span>
                            <p className="font-medium text-gray-900 mt-1">{movement.product?.name_th}</p>
                            <p className="text-sm text-gray-600">+{movement.quantity} {movement.product?.unit_of_measure || 'ชิ้น'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{new Date(movement.movement_date).toLocaleDateString('th-TH')}</p>
                            <p className="text-xs text-gray-500">{movement.quantity_before} → {movement.quantity_after}</p>
                          </div>
                        </div>
                        {movement.batch_id && (
                          <p className="text-xs text-gray-500 mt-1">Batch: {movement.batch_id.slice(0, 8)}...</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const result = await zortOutService.testPurchaseOrderAPI()
                    alert(result.available ? '✅ ' + result.message : '❌ ' + result.message)
                  }}
                >
                  ทดสอบ PO API
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => selectedPO && syncPOToZortOut(selectedPO)}
                  disabled={isSyncing || poItems.length === 0}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'กำลัง Sync...' : 'Sync ไป ZortOut'}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => selectedPO && handleMarkAsReceivedAndPaid(selectedPO)}
                  disabled={!selectedPO || selectedPO.status === 'received'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  รับครบและชำระ
                </Button>
                <Button variant="primary" onClick={() => { setShowDetailModal(false); setShowItemModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  รับสินค้าเพิ่ม
                </Button>
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
