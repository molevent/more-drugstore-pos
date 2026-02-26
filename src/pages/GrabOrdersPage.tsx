import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { scanGrabOrder, verifyPickedItems, scanAndVerifyOrder, GrabOrderData, CombinedScanResult } from '../services/grabOrderOcr'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuthStore } from '../stores/authStore'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { GrabOrder, GrabOrderItem } from '../types/database'
import { zortOutService } from '../services/zortout'
import { getAutoSyncConfig } from './FlowAccountSettingsPage'
import { convertOrderToCashInvoice, createInvoice } from '../services/flowaccount'
import {
  Camera, Upload, ScanLine, Check, X, Package, Loader2,
  Eye, Truck, CheckCircle2, XCircle,
  AlertTriangle, Search, RefreshCw, Image,
  ShoppingBag, Phone, User, FileText, Trash2
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────

type ViewMode = 'list' | 'new' | 'detail'
type ScanStep = 'upload' | 'scanning' | 'review' | 'saved'

interface SimpleProduct {
  id: string
  name_th: string
  name_en: string
  barcode: string
  base_price: number
  stock_quantity: number
}

interface MatchedOrderItem extends GrabOrderItem {
  matched_product?: SimpleProduct | null
}

// ─── Status helpers ──────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  scanned: { label: 'สแกนแล้ว', color: 'bg-blue-100 text-blue-700', icon: ScanLine },
  picking: { label: 'กำลังหยิบของ', color: 'bg-yellow-100 text-yellow-700', icon: Package },
  verified: { label: 'ตรวจสอบแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  completed: { label: 'เสร็จสิ้น', color: 'bg-gray-100 text-gray-700', icon: Check },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  grab: { label: 'Grab', color: 'bg-green-500' },
  lineman: { label: 'LINE MAN', color: 'bg-emerald-500' },
  robinhood: { label: 'Robinhood', color: 'bg-purple-500' },
  foodpanda: { label: 'Foodpanda', color: 'bg-pink-500' },
  other: { label: 'อื่นๆ', color: 'bg-gray-500' },
}

function formatCurrency(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Main Component ──────────────────────────────────────────

export default function GrabOrdersPage() {
  const { t: _t } = useLanguage()
  const user = useAuthStore(s => s.user)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedOrder, setSelectedOrder] = useState<GrabOrder | null>(null)

  // List state
  const [orders, setOrders] = useState<GrabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])

  // New order state
  const [scanStep, setScanStep] = useState<ScanStep>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [newPickFiles, setNewPickFiles] = useState<File[]>([])
  const [newPickPreviews, setNewPickPreviews] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<GrabOrderData | null>(null)
  const [combinedResult, setCombinedResult] = useState<CombinedScanResult | null>(null)
  const [scanError, setScanError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const newPickInputRef = useRef<HTMLInputElement>(null)
  const newPickCameraRef = useRef<HTMLInputElement>(null)

  // Detail / Pick state
  const [orderItems, setOrderItems] = useState<MatchedOrderItem[]>([])
  const [products, setProducts] = useState<SimpleProduct[]>([])
  const [pickFiles, setPickFiles] = useState<File[]>([])
  const [pickPreviews, setPickPreviews] = useState<string[]>([])
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const pickInputRef = useRef<HTMLInputElement>(null)
  const [imagePopup, setImagePopup] = useState<string | null>(null)

  // ─── Load orders ─────────────────────────────────────────

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('grab_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateFilter) {
        query = query.eq('order_date', dateFilter)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [dateFilter, statusFilter])

  // Load products for matching
  useEffect(() => {
    supabase
      .from('products')
      .select('id, name_th, name_en, barcode, base_price, stock_quantity')
      .eq('is_active', true)
      .then(({ data }) => setProducts(data || []))
  }, [])

  // ─── Filtered orders ────────────────────────────────────

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders
    const q = searchQuery.toLowerCase()
    return orders.filter(o =>
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.driver_name?.toLowerCase().includes(q)
    )
  }, [orders, searchQuery])

  // ─── File handling ───────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setFiles(prev => [...prev, ...selectedFiles])
    selectedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    setScanError('')
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleNewPickFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return
    setNewPickFiles(prev => [...prev, ...selectedFiles])
    selectedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setNewPickPreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    setScanError('')
  }

  const removeNewPickFile = (index: number) => {
    setNewPickFiles(prev => prev.filter((_, i) => i !== index))
    setNewPickPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // ─── OCR Scan ────────────────────────────────────────────

  const handleScan = async () => {
    if (files.length === 0) return
    setScanning(true)
    setScanError('')
    setScanStep('scanning')

    try {
      // Combined mode: order + pick photos together
      if (newPickFiles.length > 0) {
        const result = await scanAndVerifyOrder(files, newPickFiles)
        setCombinedResult(result)
        setScanResult(result.order)
        setScanStep('review')
      } else {
        // Order-only mode
        const result = await scanGrabOrder(files)
        setScanResult(result)
        setCombinedResult(null)
        setScanStep('review')
      }
    } catch (err: any) {
      setScanError(err.message || 'เกิดข้อผิดพลาดในการสแกน')
      setScanStep('upload')
    } finally {
      setScanning(false)
    }
  }

  // ─── Save order ──────────────────────────────────────────

  const handleSaveOrder = async () => {
    if (!scanResult) return
    setSaving(true)

    try {
      // Upload order image
      let orderImageUrl = ''
      if (files.length > 0) {
        const file = files[0]
        const filePath = `orders/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('grab-orders')
          .upload(filePath, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('grab-orders')
            .getPublicUrl(filePath)
          orderImageUrl = urlData.publicUrl
        }
      }

      // Upload pick image if combined mode
      let pickImageUrl = ''
      if (newPickFiles.length > 0) {
        const pickFile = newPickFiles[0]
        const pickPath = `picks/${Date.now()}_${pickFile.name}`
        const { error: pickUploadErr } = await supabase.storage
          .from('grab-orders')
          .upload(pickPath, pickFile)
        if (!pickUploadErr) {
          const { data: pickUrlData } = supabase.storage
            .from('grab-orders')
            .getPublicUrl(pickPath)
          pickImageUrl = pickUrlData.publicUrl
        }
      }

      const hasPick = combinedResult?.verification != null
      const isVerified = hasPick && combinedResult?.verification?.overall_match === true

      // Match items with products
      const matchedItems = scanResult.items.map(item => {
        const match = findBestProductMatch(item.item_name, products)
        return {
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes || '',
          matched_product_id: match?.id || null,
          matched_product_name: match?.name_th || null,
          match_confidence: match ? match.score : 0,
          is_picked: hasPick ? true : false,
        }
      })

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('grab_orders')
        .insert({
          order_number: scanResult.order_number || `ORD-${Date.now()}`,
          booking_code: scanResult.booking_code || '',
          tracking_number: scanResult.tracking_number || '',
          platform: scanResult.platform || 'grab',
          customer_name: scanResult.customer_name || '',
          customer_phone: scanResult.customer_phone || '',
          customer_notes: scanResult.customer_notes || '',
          driver_name: scanResult.driver_name || '',
          driver_phone: scanResult.driver_phone || '',
          subtotal: scanResult.subtotal || 0,
          discount: scanResult.discount || 0,
          delivery_fee: scanResult.delivery_fee || 0,
          platform_fee: scanResult.platform_fee || 0,
          vat: scanResult.vat || 0,
          grand_total: scanResult.grand_total || 0,
          status: isVerified ? 'verified' : hasPick ? 'picking' : 'scanned',
          order_image_url: orderImageUrl,
          pick_image_url: pickImageUrl || null,
          picked_by: hasPick ? (user?.full_name || user?.email || '') : null,
          verified_at: isVerified ? new Date().toISOString() : null,
          verified_by: isVerified ? (user?.full_name || user?.email || '') : null,
          ocr_raw_json: combinedResult || scanResult,
          order_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Insert items
      if (matchedItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('grab_order_items')
          .insert(matchedItems.map(item => ({
            ...item,
            grab_order_id: order.id
          })))
        if (itemsError) throw itemsError
      }

      // Auto-create sales order in orders/order_items table
      await createSalesOrderFromGrab(order, matchedItems)

      setScanStep('saved')
      fetchOrders()

      // Auto-open detail
      setTimeout(() => {
        resetNewOrder()
        openOrderDetail(order)
      }, 1500)

    } catch (err: any) {
      console.error('Error saving order:', err)
      setScanError(err.message || 'ไม่สามารถบันทึกออเดอร์ได้')
    } finally {
      setSaving(false)
    }
  }

  // ─── Auto-create sales order from Grab order ───────────

  const createSalesOrderFromGrab = async (
    grabOrder: any,
    matchedItems: Array<{
      item_name: string
      quantity: number
      unit_price: number
      total_price: number
      notes: string
      matched_product_id: string | null
      matched_product_name: string | null
      match_confidence: number
      is_picked: boolean
    }>
  ) => {
    try {
      // Only items with matched products can be inserted (product_id is NOT NULL)
      const salesItems = matchedItems.filter(item => item.matched_product_id)
      if (salesItems.length === 0) {
        console.warn('[Grab→Sales] No matched products — skipping sales order creation')
        return
      }

      const userId = (await supabase.auth.getUser()).data.user?.id
      if (!userId) {
        console.warn('[Grab→Sales] No auth user — skipping sales order creation')
        return
      }

      // Lookup Grab platform ID
      const { data: platformData } = await supabase
        .from('platforms')
        .select('id')
        .eq('code', 'GRAB')
        .single()

      if (!platformData) {
        console.warn('[Grab→Sales] GRAB platform not found in platforms table — skipping')
        return
      }

      // Generate unique order number for sales order
      const salesOrderNumber = `GRAB-${grabOrder.order_number || Date.now()}`

      // Create sales order
      const { data: salesOrder, error: salesOrderError } = await supabase
        .from('orders')
        .insert({
          order_number: salesOrderNumber,
          user_id: userId,
          platform_id: platformData.id,
          customer_name: grabOrder.customer_name || 'ลูกค้า Grab',
          customer_phone: grabOrder.customer_phone || null,
          subtotal: grabOrder.subtotal || grabOrder.grand_total || 0,
          discount: grabOrder.discount || 0,
          tax: grabOrder.vat || 0,
          total: grabOrder.grand_total || 0,
          payment_method: 'grab_wallet',
          payment_status: 'paid',
          notes: `Grab Order: ${grabOrder.order_number || ''} | Driver: ${grabOrder.driver_name || '-'}`,
        })
        .select()
        .single()

      if (salesOrderError) {
        console.error('[Grab→Sales] Error creating sales order:', salesOrderError)
        return
      }

      console.log('[Grab→Sales] Sales order created:', salesOrder.id, salesOrderNumber)

      // Create order items
      const orderItems = salesItems.map(item => ({
        order_id: salesOrder.id,
        product_id: item.matched_product_id!,
        product_name: item.matched_product_name || item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: 0,
        total_price: item.total_price,
      }))

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (orderItemsError) {
        console.error('[Grab→Sales] Error creating order items:', orderItemsError)
      }

      // Link grab_order to sales order
      await supabase
        .from('grab_orders')
        .update({ sales_order_id: salesOrder.id })
        .eq('id', grabOrder.id)

      // ── Sync to ZortOut (async — don't block UI) ──
      try {
        // Get product SKUs for ZortOut sync
        const productIds = salesItems.map(i => i.matched_product_id).filter(Boolean)
        const { data: productDetails } = await supabase
          .from('products')
          .select('id, sku, barcode, name_th, base_price')
          .in('id', productIds)

        const productMap = new Map((productDetails || []).map(p => [p.id, p]))

        const zortItems = salesItems.map(item => {
          const prod = productMap.get(item.matched_product_id!)
          return {
            sku: prod?.sku || prod?.barcode || '',
            name: item.matched_product_name || item.item_name,
            quantity: item.quantity,
            price: item.unit_price,
          }
        }).filter(i => i.sku) // Only items with SKU

        if (zortItems.length > 0) {
          zortOutService.syncOrderAndStockToZortOut({
            customername: grabOrder.customer_name || 'ลูกค้า Grab',
            items: zortItems,
            total: grabOrder.grand_total || 0,
            paymentmethod: 'Grab Wallet',
            notes: `Grab Order: ${salesOrderNumber}`,
          }).then(result => {
            if (result.orderSuccess) {
              console.log('[Grab→ZortOut] Order synced:', result.orderId)
              // Update zortout_synced flag
              supabase.from('orders').update({ zortout_synced: true, zortout_order_id: String(result.orderId) }).eq('id', salesOrder.id).then(() => {})
            } else {
              console.warn('[Grab→ZortOut] Sync failed:', result.error)
            }
          }).catch(err => console.error('[Grab→ZortOut] Error:', err))
        }
      } catch (zortErr) {
        console.error('[Grab→ZortOut] Exception:', zortErr)
      }

      // ── Auto-sync to FlowAccount (async — don't block UI) ──
      try {
        const faAutoSync = getAutoSyncConfig()
        if (faAutoSync.enabled) {
          const faOrderData = convertOrderToCashInvoice({
            order_number: salesOrderNumber,
            customer_name: grabOrder.customer_name || 'ลูกค้า Grab',
            total: grabOrder.grand_total || 0,
            subtotal: grabOrder.subtotal || grabOrder.grand_total || 0,
            discount: grabOrder.discount || 0,
            payment_method: 'Grab Wallet',
            created_at: new Date().toISOString(),
            platform_name: 'GRAB',
            items: salesItems.map(item => ({
              product_name: item.matched_product_name || item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount: 0,
              total_price: item.total_price,
            })),
          })

          createInvoice(faOrderData, 'cash-invoice').then((result: any) => {
            const faId = result?.data?.recordId || result?.data?.documentId
            console.log(`[Grab→FA] Cash invoice created for ${salesOrderNumber}, FA ID: ${faId}`)
            if (faId) {
              supabase
                .from('orders')
                .update({ flowaccount_id: faId, flowaccount_synced_at: new Date().toISOString() })
                .eq('id', salesOrder.id)
                .then(() => console.log(`[Grab→FA] Order updated with FA ID ${faId}`))
            }
          }).catch(err => {
            console.warn(`[Grab→FA] Failed for ${salesOrderNumber}:`, err.message)
          })
        }
      } catch (faErr) {
        console.error('[Grab→FA] Exception:', faErr)
      }

      console.log('[Grab→Sales] Complete — sales order + syncs initiated for', salesOrderNumber)

    } catch (err) {
      console.error('[Grab→Sales] Unexpected error:', err)
      // Don't throw — this is a secondary action, grab order is already saved
    }
  }

  // ─── Product matching ────────────────────────────────────

  function findBestProductMatch(itemName: string, products: SimpleProduct[]): { id: string; name_th: string; score: number } | null {
    if (!itemName || products.length === 0) return null

    const nameLower = itemName.toLowerCase().replace(/[^a-z0-9ก-๙\s]/g, '')
    let bestMatch: { id: string; name_th: string; score: number } | null = null

    for (const p of products) {
      const pName = (p.name_th || '').toLowerCase().replace(/[^a-z0-9ก-๙\s]/g, '')
      const pNameEn = (p.name_en || '').toLowerCase().replace(/[^a-z0-9ก-๙\s]/g, '')

      let score = 0

      // Exact match
      if (pName === nameLower || pNameEn === nameLower) {
        score = 100
      }
      // Contains match
      else if (pName.includes(nameLower) || nameLower.includes(pName) ||
               pNameEn.includes(nameLower) || nameLower.includes(pNameEn)) {
        score = 80
      }
      // Word-level match
      else {
        const words = nameLower.split(/\s+/).filter(w => w.length > 2)
        const pWords = `${pName} ${pNameEn}`.split(/\s+/)
        let matchCount = 0
        for (const w of words) {
          if (pWords.some(pw => pw.includes(w) || w.includes(pw))) matchCount++
        }
        score = words.length > 0 ? Math.round((matchCount / words.length) * 70) : 0
      }

      if (score > (bestMatch?.score || 30)) {
        bestMatch = { id: p.id, name_th: p.name_th, score }
      }
    }

    return bestMatch
  }

  // ─── Order detail ────────────────────────────────────────

  const openOrderDetail = async (order: GrabOrder) => {
    setSelectedOrder(order)
    setViewMode('detail')
    setVerifyResult(null)
    setPickFiles([])
    setPickPreviews([])

    const { data: items } = await supabase
      .from('grab_order_items')
      .select('*')
      .eq('grab_order_id', order.id)
      .order('created_at')

    const matched = (items || []).map((item: GrabOrderItem) => ({
      ...item,
      matched_product: products.find(p => p.id === item.matched_product_id) || null,
    }))

    setOrderItems(matched)
  }

  // ─── Pick item toggle ───────────────────────────────────

  const togglePickItem = async (itemId: string, isPicked: boolean) => {
    await supabase
      .from('grab_order_items')
      .update({ is_picked: isPicked, pick_quantity: isPicked ? orderItems.find(i => i.id === itemId)?.quantity : null })
      .eq('id', itemId)

    setOrderItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, is_picked: isPicked, pick_quantity: isPicked ? i.quantity : undefined } : i
    ))
  }

  // ─── Update order status ─────────────────────────────────

  const updateOrderStatus = async (status: string) => {
    if (!selectedOrder) return

    const updates: any = { status }
    if (status === 'picking') {
      updates.picked_by = user?.full_name || user?.email || ''
    }
    if (status === 'verified') {
      updates.verified_at = new Date().toISOString()
      updates.verified_by = user?.full_name || user?.email || ''
    }

    await supabase
      .from('grab_orders')
      .update(updates)
      .eq('id', selectedOrder.id)

    setSelectedOrder(prev => prev ? { ...prev, ...updates } : null)
    fetchOrders()
  }

  // ─── Pick photo handling ─────────────────────────────────

  const handlePickFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return
    setPickFiles(prev => [...prev, ...selectedFiles])
    selectedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPickPreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  // ─── Verify picked items ────────────────────────────────

  const handleVerifyPick = async () => {
    if (pickFiles.length === 0 || !selectedOrder) return
    setVerifying(true)

    try {
      // Upload pick image
      const file = pickFiles[0]
      const filePath = `picks/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('grab-orders')
        .upload(filePath, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('grab-orders')
          .getPublicUrl(filePath)
        await supabase
          .from('grab_orders')
          .update({ pick_image_url: urlData.publicUrl })
          .eq('id', selectedOrder.id)
      }

      const expected = orderItems.map(i => ({
        item_name: i.item_name,
        quantity: i.quantity
      }))

      const result = await verifyPickedItems(pickFiles, expected)
      setVerifyResult(result)

      if (result.overall_match) {
        await updateOrderStatus('verified')
      }
    } catch (err: any) {
      console.error('Verify error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ')
    } finally {
      setVerifying(false)
    }
  }

  // ─── Delete order ────────────────────────────────────────

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('ต้องการลบออเดอร์นี้?')) return
    await supabase.from('grab_order_items').delete().eq('grab_order_id', orderId)
    await supabase.from('grab_orders').delete().eq('id', orderId)
    fetchOrders()
    if (selectedOrder?.id === orderId) {
      setViewMode('list')
      setSelectedOrder(null)
    }
  }

  // ─── Reset new order ────────────────────────────────────

  const resetNewOrder = () => {
    setFiles([])
    setPreviews([])
    setNewPickFiles([])
    setNewPickPreviews([])
    setScanResult(null)
    setCombinedResult(null)
    setScanError('')
    setScanStep('upload')
    setViewMode('list')
  }

  // ─── Stats ──────────────────────────────────────────────

  const stats = useMemo(() => {
    const today = orders
    return {
      total: today.length,
      scanned: today.filter(o => o.status === 'scanned').length,
      picking: today.filter(o => o.status === 'picking').length,
      verified: today.filter(o => o.status === 'verified' || o.status === 'completed').length,
      totalValue: today.reduce((sum, o) => sum + (o.grand_total || 0), 0),
    }
  }, [orders])

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#5D4E37]">
            {viewMode === 'new' ? '📸 สแกนออเดอร์ใหม่' : viewMode === 'detail' ? `📦 ${selectedOrder?.order_number}` : '🛵 ออเดอร์ GRAB'}
          </h1>
          {viewMode === 'list' && (
            <p className="text-sm text-gray-500 mt-1">ถ่ายรูปออเดอร์ → AI อ่านข้อมูล → หยิบของ → ถ่ายรูปเช็ค</p>
          )}
        </div>
        <div className="flex gap-2">
          {viewMode !== 'list' && (
            <Button
              onClick={() => { resetNewOrder(); setViewMode('list'); setSelectedOrder(null) }}
              className="bg-[#5D4E37] text-white hover:bg-[#4A3D2B]"
            >
              ← กลับไปหน้าออเดอร์
            </Button>
          )}
          {viewMode === 'list' && (
            <Button
              onClick={() => setViewMode('new')}
              className="bg-[#8B6F4E] text-white hover:bg-[#7A5F3E]"
            >
              <Camera className="w-4 h-4 mr-1" /> สแกนออเดอร์
            </Button>
          )}
        </div>
      </div>

      {/* ═══ LIST VIEW ═══════════════════════════════════════ */}
      {viewMode === 'list' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-[#5D4E37]">{stats.total}</p>
              <p className="text-xs text-gray-500">ออเดอร์ทั้งหมด</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.scanned}</p>
              <p className="text-xs text-gray-500">รอหยิบของ</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.picking}</p>
              <p className="text-xs text-gray-500">กำลังหยิบ</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              <p className="text-xs text-gray-500">เสร็จแล้ว</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-[#8B6F4E]">฿{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-gray-500">ยอดรวม</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="scanned">รอหยิบของ</option>
              <option value="picking">กำลังหยิบ</option>
              <option value="verified">ตรวจสอบแล้ว</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหา เลขออเดอร์, ลูกค้า..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <button onClick={fetchOrders} className="p-2 text-gray-500 hover:text-gray-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Order list */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              กำลังโหลด...
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400">ยังไม่มีออเดอร์วันนี้</p>
              <Button
                onClick={() => setViewMode('new')}
                className="mt-4 bg-[#8B6F4E] text-white hover:bg-[#7A5F3E]"
              >
                <Camera className="w-4 h-4 mr-1" /> สแกนออเดอร์แรก
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map(order => {
                const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.scanned
                const platformCfg = PLATFORM_CONFIG[order.platform] || PLATFORM_CONFIG.other
                const StatusIcon = statusCfg.icon

                return (
                  <Card
                    key={order.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openOrderDetail(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${platformCfg.color}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#5D4E37]">{order.order_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                              <StatusIcon className="w-3 h-3 inline mr-1" />
                              {statusCfg.label}
                            </span>
                            <span className="text-xs text-gray-400">{platformCfg.label}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            {order.customer_name && <span><User className="w-3 h-3 inline" /> {order.customer_name}</span>}
                            {order.driver_name && <span><Truck className="w-3 h-3 inline" /> {order.driver_name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#8B6F4E]">฿{formatCurrency(order.grand_total)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ NEW ORDER (SCAN) ════════════════════════════════ */}
      {viewMode === 'new' && (
        <Card className="p-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {['ถ่ายรูป', 'AI ประมวลผล', 'ตรวจสอบ & บันทึก'].map((step, i) => {
              const stepKeys: ScanStep[] = ['upload', 'scanning', 'review']
              const currentIdx = Math.min(stepKeys.indexOf(scanStep), 2)
              const savedIdx = scanStep === 'saved' ? 3 : currentIdx
              const isActive = i === savedIdx || (i === 2 && scanStep === 'saved')
              const isDone = i < savedIdx || scanStep === 'saved'
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isDone ? 'bg-green-500 text-white' : isActive ? 'bg-[#8B6F4E] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${isActive ? 'text-[#5D4E37] font-bold' : 'text-gray-400'}`}>
                    {step}
                  </span>
                  {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
                </div>
              )
            })}
          </div>

          {/* Upload step — 2 zones */}
          {(scanStep === 'upload' || scanStep === 'scanning') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Zone 1: Order photos */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#5D4E37] text-sm flex items-center gap-1">
                    <FileText className="w-4 h-4" /> 1. รูปออเดอร์ <span className="text-red-500">*</span>
                  </h3>
                  <div
                    className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center hover:border-green-500 transition-colors cursor-pointer bg-green-50/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <p className="text-sm text-gray-600">ถ่ายรูปหน้าจอออเดอร์</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> ถ่ายรูป
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> เลือกรูป
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {previews.map((preview, i) => (
                        <div key={i} className="relative group">
                          <img src={preview} alt="" className="w-full h-28 object-cover rounded-lg border-2 border-green-200" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-80 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {previews.length > 0 && (
                    <p className="text-xs text-green-600 text-center">✓ {previews.length} รูปออเดอร์</p>
                  )}
                </div>

                {/* Zone 2: Pick photos */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#5D4E37] text-sm flex items-center gap-1">
                    <Package className="w-4 h-4" /> 2. รูปสินค้าที่หยิบ <span className="text-xs text-gray-400">(ไม่บังคับ)</span>
                  </h3>
                  <div
                    className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50/30"
                    onClick={() => newPickInputRef.current?.click()}
                  >
                    <Camera className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <p className="text-sm text-gray-600">ถ่ายรูปสินค้าที่หยิบแล้ว</p>
                    <p className="text-xs text-gray-400 mt-0.5">AI จะตรวจให้เลยว่าหยิบครบ</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button type="button" onClick={() => newPickCameraRef.current?.click()} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> ถ่ายรูป
                    </button>
                    <button type="button" onClick={() => newPickInputRef.current?.click()} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> เลือกรูป
                    </button>
                  </div>
                  <input ref={newPickInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleNewPickFileSelect} />
                  <input ref={newPickCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNewPickFileSelect} />

                  {newPickPreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {newPickPreviews.map((preview, i) => (
                        <div key={i} className="relative group">
                          <img src={preview} alt="" className="w-full h-28 object-cover rounded-lg border-2 border-blue-200" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeNewPickFile(i) }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-80 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {newPickPreviews.length > 0 && (
                    <p className="text-xs text-blue-600 text-center">✓ {newPickPreviews.length} รูปสินค้า</p>
                  )}
                </div>
              </div>

              {scanError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-1" /> {scanError}
                </div>
              )}

              {/* Scan button */}
              <button
                type="button"
                onClick={handleScan}
                disabled={files.length === 0 || scanning}
                className="w-full px-4 py-3 bg-[#8B6F4E] text-white font-medium rounded-lg hover:bg-[#7A5F3E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {scanning ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> AI กำลังประมวลผล{newPickFiles.length > 0 ? ' (อ่านออเดอร์ + เช็คสินค้า)' : ''}...</>
                ) : (
                  <><ScanLine className="w-5 h-5" /> {newPickFiles.length > 0 ? 'สแกนออเดอร์ + ตรวจสินค้า ด้วย AI' : 'สแกนออเดอร์ด้วย AI'}</>
                )}
              </button>

              {newPickFiles.length > 0 && !scanning && (
                <p className="text-xs text-center text-gray-400">
                  AI จะอ่านออเดอร์ + เทียบสินค้าที่หยิบให้ในรอบเดียว ⚡
                </p>
              )}
            </div>
          )}

          {/* Review step */}
          {scanStep === 'review' && scanResult && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#5D4E37]">ตรวจสอบข้อมูลที่สแกนได้</h3>

              {/* Order info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs text-gray-400">เลขออเดอร์</label>
                  <p className="font-bold">{scanResult.order_number || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400">แพลตฟอร์ม</label>
                  <p className="font-bold capitalize">{scanResult.platform || 'grab'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400">ลูกค้า</label>
                  <p>{scanResult.customer_name || '-'} {scanResult.customer_phone}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400">คนขับ</label>
                  <p>{scanResult.driver_name || '-'} {scanResult.driver_phone}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 mb-2">
                  รายการสินค้า ({scanResult.items.length} รายการ)
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">สินค้า</th>
                        <th className="text-center p-2 w-16">จำนวน</th>
                        <th className="text-right p-2 w-20">ราคา</th>
                        <th className="text-right p-2 w-24">รวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.items.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{item.item_name}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">฿{formatCurrency(item.unit_price)}</td>
                          <td className="p-2 text-right font-medium">฿{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan={3} className="p-2 text-right">ยอดรวม</td>
                        <td className="p-2 text-right text-[#8B6F4E]">฿{formatCurrency(scanResult.grand_total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Combined verification result */}
              {combinedResult?.verification && (
                <div className={`p-4 rounded-lg ${combinedResult.verification.overall_match ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {combinedResult.verification.overall_match ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-bold">
                      {combinedResult.verification.overall_match ? 'หยิบของครบถูกต้อง ✅' : 'พบรายการที่ไม่ตรง ⚠️'}
                    </span>
                    <span className="text-xs text-gray-500">ความมั่นใจ {combinedResult.verification.confidence}%</span>
                  </div>

                  {combinedResult.verification.items_found?.length > 0 && (
                    <div className="text-sm space-y-0.5 mb-2">
                      <p className="font-medium text-gray-600">สินค้าที่พบในรูป:</p>
                      {combinedResult.verification.items_found.map((item, i) => (
                        <p key={i} className="text-gray-700">
                          ✓ {item.item_name} × {item.quantity_visible}
                          {item.notes && <span className="text-gray-400 text-xs ml-1">({item.notes})</span>}
                        </p>
                      ))}
                    </div>
                  )}

                  {combinedResult.verification.missing_items?.length > 0 && (
                    <div className="text-sm space-y-0.5 mb-2">
                      <p className="font-medium text-red-600">สินค้าที่ไม่พบ:</p>
                      {combinedResult.verification.missing_items.map((name, i) => (
                        <p key={i} className="text-red-700">✗ {name}</p>
                      ))}
                    </div>
                  )}

                  {combinedResult.verification.notes && (
                    <p className="text-xs text-gray-500 mt-1">{combinedResult.verification.notes}</p>
                  )}
                </div>
              )}

              {scanError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-1" /> {scanError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setScanStep('upload'); setScanResult(null); setCombinedResult(null) }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-1"
                >
                  <Camera className="w-4 h-4" /> สแกนใหม่
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#8B6F4E] text-white font-medium rounded-lg hover:bg-[#7A5F3E] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>
                  ) : (
                    <><Check className="w-4 h-4" /> ยืนยันและบันทึก</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Saved step */}
          {scanStep === 'saved' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-bold text-green-700">บันทึกออเดอร์สำเร็จ!</p>
              <p className="text-sm text-gray-500 mt-1">
                {combinedResult?.verification?.overall_match
                  ? 'หยิบของครบถูกต้อง — ออเดอร์พร้อมส่ง ✅'
                  : 'กำลังเปิดรายละเอียดออเดอร์...'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ═══ DETAIL VIEW ═════════════════════════════════════ */}
      {viewMode === 'detail' && selectedOrder && (
        <div className="space-y-4">
          {/* Order header */}
          <Card className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${PLATFORM_CONFIG[selectedOrder.platform]?.color || 'bg-gray-400'}`} />
                  <span className="text-sm text-gray-500">{PLATFORM_CONFIG[selectedOrder.platform]?.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[selectedOrder.status]?.color}`}>
                    {STATUS_CONFIG[selectedOrder.status]?.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {selectedOrder.customer_name && (
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{selectedOrder.customer_name}</span>
                      {selectedOrder.customer_phone && (
                        <a href={`tel:${selectedOrder.customer_phone}`} className="text-blue-500"><Phone className="w-3 h-3" /></a>
                      )}
                    </div>
                  )}
                  {selectedOrder.driver_name && (
                    <div className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-gray-400" />
                      <span>{selectedOrder.driver_name}</span>
                      {selectedOrder.driver_phone && (
                        <a href={`tel:${selectedOrder.driver_phone}`} className="text-blue-500"><Phone className="w-3 h-3" /></a>
                      )}
                    </div>
                  )}
                  {selectedOrder.booking_code && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-mono">{selectedOrder.booking_code}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-[#8B6F4E]">฿{formatCurrency(selectedOrder.grand_total)}</p>
                <div className="flex gap-1 mt-2">
                  {selectedOrder.order_image_url && (
                    <button
                      type="button"
                      onClick={() => setImagePopup(selectedOrder.order_image_url!)}
                      className="text-blue-500 text-xs flex items-center gap-0.5 hover:underline"
                    >
                      <Image className="w-3 h-3" /> ดูรูปออเดอร์
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Pick checklist */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#5D4E37]">
                <Package className="w-4 h-4 inline mr-1" />
                รายการหยิบสินค้า ({orderItems.filter(i => i.is_picked).length}/{orderItems.length})
              </h3>
              {selectedOrder.status === 'scanned' && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus('picking')}
                  className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 active:bg-yellow-700 transition-colors"
                >
                  เริ่มหยิบของ
                </button>
              )}
            </div>

            <div className="space-y-2">
              {orderItems.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.is_picked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => togglePickItem(item.id, !item.is_picked)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.is_picked
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-gray-300 text-gray-300 hover:border-green-400'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${item.is_picked ? 'line-through text-gray-400' : 'text-[#5D4E37]'}`}>
                      {item.item_name}
                    </p>
                    {item.matched_product_name && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        → {item.matched_product_name}
                        <span className="text-gray-400 ml-1">({item.match_confidence}%)</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-[#8B6F4E] text-lg">{item.quantity}</span>
                    <p className="text-xs text-gray-400">฿{formatCurrency(item.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pick verification */}
          {(selectedOrder.status === 'picking' || selectedOrder.status === 'scanned') && (
            <Card className="p-4">
              <h3 className="font-bold text-[#5D4E37] mb-3">
                <Camera className="w-4 h-4 inline mr-1" />
                ถ่ายรูปยืนยันการหยิบสินค้า
              </h3>

              <div className="space-y-3">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#8B6F4E]"
                  onClick={() => pickInputRef.current?.click()}
                >
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">ถ่ายรูปสินค้าที่หยิบแล้ว</p>
                </div>

                <input
                  ref={pickInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePickFileSelect}
                />

                {pickPreviews.length > 0 && (
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      {pickPreviews.map((preview, i) => (
                        <div key={i} className="relative group">
                          <img src={preview} alt="" className="w-full h-32 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => {
                              setPickFiles(prev => prev.filter((_, idx) => idx !== i))
                              setPickPreviews(prev => prev.filter((_, idx) => idx !== i))
                              setVerifyResult(null)
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPickFiles([])
                        setPickPreviews([])
                        setVerifyResult(null)
                      }}
                      className="mt-2 w-full px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ลบรูปทั้งหมด แล้วถ่ายใหม่
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyPick}
                  disabled={pickFiles.length === 0 || verifying}
                  className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1" /> AI กำลังตรวจสอบ...</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-1" /> ตรวจสอบด้วย AI</>
                  )}
                </button>

                {/* Verify result */}
                {verifyResult && (
                  <div className={`p-4 rounded-lg ${verifyResult.overall_match ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {verifyResult.overall_match ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                      <span className="font-bold">
                        {verifyResult.overall_match ? 'หยิบของครบถูกต้อง ✅' : 'พบรายการที่ไม่ตรง ⚠️'}
                      </span>
                      <span className="text-xs text-gray-500">ความมั่นใจ {verifyResult.confidence}%</span>
                    </div>

                    {verifyResult.items_found?.length > 0 && (
                      <div className="text-sm space-y-1 mb-2">
                        <p className="font-medium text-gray-600">สินค้าที่พบในรูป:</p>
                        {verifyResult.items_found.map((item: any, i: number) => (
                          <p key={i} className="text-gray-700">
                            ✓ {item.item_name} × {item.quantity_visible}
                            {item.notes && <span className="text-gray-400 text-xs ml-1">({item.notes})</span>}
                          </p>
                        ))}
                      </div>
                    )}

                    {verifyResult.missing_items?.length > 0 && (
                      <div className="text-sm space-y-1 mb-2">
                        <p className="font-medium text-red-600">สินค้าที่ไม่พบ:</p>
                        {verifyResult.missing_items.map((name: string, i: number) => (
                          <p key={i} className="text-red-700">✗ {name}</p>
                        ))}
                      </div>
                    )}

                    {verifyResult.notes && (
                      <p className="text-xs text-gray-500 mt-2">{verifyResult.notes}</p>
                    )}

                    {!verifyResult.overall_match && (
                      <button
                        type="button"
                        onClick={() => updateOrderStatus('verified')}
                        className="mt-3 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        ยืนยันหยิบครบแล้ว (override)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {selectedOrder.status === 'verified' && (
              <button
                type="button"
                onClick={() => updateOrderStatus('completed')}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" /> เสร็จสิ้น (ส่งแล้ว)
              </button>
            )}
            {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="px-4 py-2 bg-red-100 text-red-600 font-medium rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> ลบ
              </button>
            )}
          </div>
        </div>
      )}
      {/* Image popup modal */}
      {imagePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setImagePopup(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setImagePopup(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full p-1.5 shadow-lg hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={imagePopup}
              alt="รูปออเดอร์"
              className="w-full max-h-[85vh] object-contain rounded-lg bg-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}
