import { useState, useEffect, useRef } from 'react'
import { useCartStore, getProductPriceForChannel, SalesChannel } from '../stores/cartStore'
import { useProductStore } from '../stores/productStore'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Scan, Trash2, ShoppingCart, Save, X, Store, Bike, User, Search, Package, Receipt, AlertTriangle, History, Bell, Camera } from 'lucide-react'
import type { Product } from '../types/database'
import { supabase } from '../services/supabase'

interface SavedOrder {
  id: string
  name: string
  items: any[]
  createdAt: Date
  salesChannel: string
}

interface Contact {
  id: string
  name: string
  type: 'buyer' | 'seller' | 'both'
  phone?: string
}

// Map sales channel to platform UUID
const PLATFORM_UUIDS: Record<string, string> = {
  'walk-in': 'a1111111-1111-1111-1111-111111111111',
  'grab': 'a2222222-2222-2222-2222-222222222222',
  'shopee': 'a3333333-3333-3333-3333-333333333333',
  'lineman': 'a4444444-4444-4444-4444-444444444444',
}

const SALES_CHANNELS = [
  { id: 'walk-in', name: 'หน้าร้าน', icon: Store },
  { id: 'grab', name: 'GRAB', icon: Bike },
  { id: 'shopee', name: 'SHOPEE', icon: ShoppingCart },
  { id: 'lineman', name: 'LINEMAN', icon: Bike },
]

export default function POSPage() {
  const [barcode, setBarcode] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([])
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [salesChannel, setSalesChannel] = useState('walk-in')
  
  // Customer search states
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null)
  const [customerResults, setCustomerResults] = useState<Contact[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  
  // Product filter states
  const [showStockOnly, setShowStockOnly] = useState(false)
  
  // Camera barcode scanning states
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false)
  const [detectedProducts, setDetectedProducts] = useState<Product[]>([])
  const [selectedDetectedProducts, setSelectedDetectedProducts] = useState<Set<string>>(new Set())
  const [showDetectedProductsView, setShowDetectedProductsView] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Alert states
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [currentAlerts, setCurrentAlerts] = useState<Array<{
    type: string
    title: string
    message: string
    productName: string
  }>>([])
  const [savedAlertLogs, setSavedAlertLogs] = useState<Array<{
    id: string
    product_name: string
    alert_type: string
    alert_title: string
    alert_message?: string
    created_at: string
    acknowledged: boolean
    acknowledged_at?: string
  }>>([])
  const [showAlertHistory, setShowAlertHistory] = useState(false)
  
  // Recent sales states
  const [recentSales, setRecentSales] = useState<Array<{
    id: string
    order_number: string
    customer_name?: string
    total: number
    platform_id: string
    created_at: string
    item_count: number
  }>>([])
  const [showRecentSales, setShowRecentSales] = useState(false)
  const [loadingRecentSales, setLoadingRecentSales] = useState(false)

  // Held bills states
  const [heldBills, setHeldBills] = useState<SavedOrder[]>([])
  const [showHeldBills, setShowHeldBills] = useState(false)
  const [holdBillName, setHoldBillName] = useState('')
  const [showHoldBillModal, setShowHoldBillModal] = useState(false)

  // Payment methods states
  const [paymentMethods, setPaymentMethods] = useState<Array<{id: string; name: string; is_active: boolean}>>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { items, addItem, removeItem, updateQuantity, updateCustomPrice, clearCart, getTotal, getSubtotal, getTotalDiscount, setItems, setSalesChannel: setCartSalesChannel } = useCartStore()
  const { getProductByBarcode, products, fetchProducts } = useProductStore()

  // Load products and customers on mount
  useEffect(() => {
    console.log('POS: Loading products...')
    fetchProducts()
    // Load default customer
    setSelectedCustomer({ id: 'default', name: 'ลูกค้าทั่วไป', type: 'buyer' })
  }, [])

  // Sync sales channel with cart store
  useEffect(() => {
    setCartSalesChannel(salesChannel as SalesChannel)
  }, [salesChannel, setCartSalesChannel])

  // Search products as user types
  useEffect(() => {
    console.log('POS: Search triggered', { barcode, productsCount: products.length, showStockOnly })
    
    if (barcode.trim().length > 0) {
      const searchTerm = barcode.toLowerCase()
      let results = products.filter(p => 
        p.barcode?.toLowerCase().includes(searchTerm) ||
        p.name_th?.toLowerCase().includes(searchTerm) ||
        p.name_en?.toLowerCase().includes(searchTerm)
      )
      
      // Apply stock filter if enabled
      if (showStockOnly) {
        results = results.filter(p => (p.stock_quantity || 0) > 0)
      }
      
      results = results.slice(0, 10) // Limit to 10 results
      
      console.log('POS: Search results', { searchTerm, resultsCount: results.length, showStockOnly })
      
      setSearchResults(results)
      setShowDropdown(results.length > 0)
      setSelectedIndex(-1)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [barcode, products, showStockOnly])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search customers as user types
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.trim().length > 0) {
        try {
          const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .or(`name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
            .in('type', ['buyer', 'both'])
            .limit(10)
          
          if (error) throw error
          setCustomerResults(data || [])
          setShowCustomerDropdown((data || []).length > 0)
        } catch (error) {
          console.error('Error searching customers:', error)
          setCustomerResults([])
        }
      } else {
        setCustomerResults([])
        setShowCustomerDropdown(false)
      }
    }

    const timeoutId = setTimeout(searchCustomers, 300)
    return () => clearTimeout(timeoutId)
  }, [customerSearch])

  const handleSelectCustomer = (customer: Contact) => {
    setSelectedCustomer(customer)
    setCustomerSearch('')
    setShowCustomerDropdown(false)
  }

  const handleClearCustomer = () => {
    setSelectedCustomer({ id: 'default', name: 'ลูกค้าทั่วไป', type: 'buyer' })
    setCustomerSearch('')
  }

  const handleAddNewContact = async () => {
    if (!newContactName.trim()) {
      alert('กรุณาระบุชื่อผู้ติดต่อ')
      return
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: newContactName.trim(),
          phone: newContactPhone.trim() || null,
          type: 'buyer'
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding contact:', error)
        alert('ไม่สามารถเพิ่มผู้ติดต่อได้')
        return
      }

      if (data) {
        setSelectedCustomer(data as Contact)
        setNewContactName('')
        setNewContactPhone('')
        setShowAddContactModal(false)
        setCustomerSearch('')
        setShowCustomerDropdown(false)
        alert(`เพิ่มผู้ติดต่อ "${data.name}" สำเร็จ`)
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      alert('เกิดข้อผิดพลาดในการเพิ่มผู้ติดต่อ')
    }
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode.trim()) return

    // If there's a selected item from dropdown, use it
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      addProductToCart(searchResults[selectedIndex])
      return
    }

    // Otherwise try exact barcode match
    const product = getProductByBarcode(barcode)
    if (product) {
      addProductToCart(product)
    } else if (searchResults.length > 0) {
      // If there are search results, add the first one
      addProductToCart(searchResults[0])
    } else {
      alert('ไม่พบสินค้า')
    }
  }

  const addProductToCart = (product: Product) => {
    addItem(product)
    setBarcode('')
    setShowDropdown(false)
    setSearchResults([])
    setSelectedIndex(-1)
    inputRef.current?.focus()
    
    // Check for product alerts
    checkProductAlerts(product)
  }

  // Check product alerts and show modal if any
  const checkProductAlerts = (product: Product) => {
    const alerts: Array<{type: string, title: string, message: string, productName: string}> = []
    
    // Check out of stock alert
    if (product.alert_out_of_stock && product.stock_quantity === 0) {
      alerts.push({
        type: 'out_of_stock',
        title: 'สินค้าหมดสต็อก',
        message: product.alert_out_of_stock_message || 'สินค้าชิ้นนี้ขายหมดแล้ว จำนวนคงเหลือ = 0',
        productName: product.name_th
      })
    }
    
    // Check low stock alert
    if (product.alert_low_stock && product.stock_quantity > 0 && product.stock_quantity <= (product.min_stock_level || 5)) {
      alerts.push({
        type: 'low_stock',
        title: 'สินค้าใกล้หมด',
        message: product.alert_low_stock_message || `สินค้าเหลือน้อย คงเหลือ ${product.stock_quantity} ชิ้น`,
        productName: product.name_th
      })
    }
    
    // Check expiry alert
    if (product.alert_expiry && product.expiry_date) {
      const expiryDate = new Date(product.expiry_date)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const alertDays = product.alert_expiry_days || 30
      
      if (daysUntilExpiry <= alertDays && daysUntilExpiry > 0) {
        alerts.push({
          type: 'expiry',
          title: 'สินค้าใกล้หมดอายุ',
          message: product.alert_expiry_message || `สินค้าจะหมดอายุในอีก ${daysUntilExpiry} วัน`,
          productName: product.name_th
        })
      } else if (daysUntilExpiry <= 0) {
        alerts.push({
          type: 'expired',
          title: 'สินค้าหมดอายุแล้ว',
          message: product.alert_expiry_message || 'สินค้าหมดอายุแล้ว กรุณาตรวจสอบ',
          productName: product.name_th
        })
      }
    }
    
    // Check custom alert
    if (product.alert_custom && product.alert_custom_title) {
      alerts.push({
        type: 'custom',
        title: product.alert_custom_title,
        message: product.alert_custom_message || '',
        productName: product.name_th
      })
    }
    
    if (alerts.length > 0) {
      setCurrentAlerts(alerts)
      setShowAlertModal(true)
    }
  }

  // Check all cart items for alerts during checkout
  const checkAllCartAlerts = () => {
    const allAlerts: Array<{type: string, title: string, message: string, productName: string}> = []
    
    items.forEach(item => {
      const product = item.product
      
      // Check out of stock alert
      if (product.alert_out_of_stock && product.stock_quantity === 0) {
        allAlerts.push({
          type: 'out_of_stock',
          title: 'สินค้าหมดสต็อก',
          message: product.alert_out_of_stock_message || 'สินค้าชิ้นนี้ขายหมดแล้ว',
          productName: product.name_th
        })
      }
      
      // Check low stock alert
      if (product.alert_low_stock && product.stock_quantity > 0 && product.stock_quantity <= (product.min_stock_level || 5)) {
        allAlerts.push({
          type: 'low_stock',
          title: 'สินค้าใกล้หมด',
          message: product.alert_low_stock_message || `สินค้าเหลือน้อย คงเหลือ ${product.stock_quantity} ชิ้น`,
          productName: product.name_th
        })
      }
      
      // Check expiry alert
      if (product.alert_expiry && product.expiry_date) {
        const expiryDate = new Date(product.expiry_date)
        const today = new Date()
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const alertDays = product.alert_expiry_days || 30
        
        if (daysUntilExpiry <= alertDays) {
          allAlerts.push({
            type: 'expiry',
            title: 'สินค้าใกล้หมดอายุ',
            message: product.alert_expiry_message || `สินค้าจะหมดอายุในอีก ${daysUntilExpiry} วัน`,
            productName: product.name_th
          })
        }
      }
      
      // Check custom alert
      if (product.alert_custom && product.alert_custom_title) {
        allAlerts.push({
          type: 'custom',
          title: product.alert_custom_title,
          message: product.alert_custom_message || '',
          productName: product.name_th
        })
      }
    })
    
    return allAlerts
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSaveOrder = () => {
    if (items.length === 0) {
      alert('ไม่มีสินค้าในตะกร้า')
      return
    }

    const orderName = prompt('ชื่อรายการ (เช่น คุณสมชาย):', `รายการ ${savedOrders.length + 1}`)
    if (!orderName) return

    const newOrder: SavedOrder = {
      id: Date.now().toString(),
      name: orderName,
      items: [...items],
      createdAt: new Date(),
      salesChannel: salesChannel
    }

    setSavedOrders([...savedOrders, newOrder])
    clearCart()
    setSalesChannel('walk-in')
    setActiveOrderId(null)
    alert(`บันทึกรายการ "${orderName}" เรียบร้อยแล้ว`)
  }

  const handleLoadOrder = (order: SavedOrder) => {
    if (items.length > 0) {
      if (!confirm('มีสินค้าในตะกร้าอยู่ ต้องการบันทึกก่อนหรือไม่?')) {
        return
      }
      handleSaveOrder()
    }

    setItems(order.items)
    setSalesChannel(order.salesChannel)
    setActiveOrderId(order.id)
  }

  const handleDeleteOrder = (orderId: string) => {
    if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return
    
    setSavedOrders(savedOrders.filter(o => o.id !== orderId))
    if (activeOrderId === orderId) {
      setActiveOrderId(null)
    }
  }

  // Held Bills Functions
  const handleHoldBill = () => {
    if (items.length === 0) {
      alert('ไม่มีสินค้าในตะกร้า')
      return
    }
    setHoldBillName('')
    setShowHoldBillModal(true)
  }

  const confirmHoldBill = () => {
    const name = holdBillName.trim() || `บิล ${heldBills.length + 1}`
    const heldBill: SavedOrder = {
      id: Date.now().toString(),
      name: name,
      items: [...items],
      createdAt: new Date(),
      salesChannel: salesChannel
    }
    setHeldBills([...heldBills, heldBill])
    clearCart()
    setSalesChannel('walk-in')
    setShowHoldBillModal(false)
    alert(`พักบิล "${name}" เรียบร้อยแล้ว`)
  }

  const handleResumeBill = (bill: SavedOrder) => {
    if (items.length > 0) {
      if (!confirm('มีสินค้าในตะกร้าอยู่ ต้องการล้างตะกร้าก่อนหรือไม่?')) {
        return
      }
      clearCart()
    }
    setItems(bill.items)
    setSalesChannel(bill.salesChannel)
    setHeldBills(heldBills.filter(b => b.id !== bill.id))
    setShowHeldBills(false)
    alert(`เปิดบิล "${bill.name}" เรียบร้อย`)
  }

  const handleDeleteHeldBill = (billId: string) => {
    if (!confirm('ต้องการลบบิลที่พักไว้นี้ใช่หรือไม่?')) return
    setHeldBills(heldBills.filter(b => b.id !== billId))
  }

  // Fetch Payment Methods
  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (error) {
        console.error('Error fetching payment methods:', error)
        return
      }
      
      if (data) {
        setPaymentMethods(data)
        if (data.length > 0 && !selectedPaymentMethod) {
          setSelectedPaymentMethod(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
  }

  // Load payment methods on mount
  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('กรุณาเพิ่มสินค้าในตะกร้า')
      return
    }

    // Check for alerts before checkout
    const alerts = checkAllCartAlerts()
    if (alerts.length > 0) {
      setCurrentAlerts(alerts)
      setShowAlertModal(true)
      return
    }

    const channelName = SALES_CHANNELS.find(c => c.id === salesChannel)?.name || 'หน้าร้าน'
    const paymentMethodName = paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || 'เงินสด'
    const confirmed = confirm(`ยืนยันการขายผ่าน ${channelName}\nวิธีชำระ: ${paymentMethodName}\nยอดชำระ: ฿${getTotal().toFixed(2)}`)
    
    if (confirmed) {
      // Save order to database
      try {
        const orderNumber = `ORD${Date.now()}`
        const platformUuid = PLATFORM_UUIDS[salesChannel] || PLATFORM_UUIDS['walk-in']
        const subtotal = getSubtotal()
        const discount = getTotalDiscount()
        const total = getTotal()
        const paymentMethodName = paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || 'เงินสด'
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            platform_id: platformUuid,
            customer_name: selectedCustomer?.name || 'ลูกค้าทั่วไป',
            subtotal: subtotal,
            discount: discount,
            total: total,
            payment_method: paymentMethodName,
          })
          .select()
          .single()

        if (orderError) {
          console.error('Error saving order:', orderError)
          alert('ไม่สามารถบันทึกออเดอร์ได้')
          return
        }

        // Save order items
        const orderItems = items.map(item => ({
          order_id: orderData.id,
          product_id: item.product.id,
          product_name: item.product.name_th,
          quantity: item.quantity,
          unit_price: item.product.base_price,
          discount: item.discount || 0,
          total_price: item.product.base_price * item.quantity - (item.discount || 0),
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)

        if (itemsError) {
          console.error('Error saving order items:', itemsError)
        }

        // Remove from saved orders if it was a saved order
        if (activeOrderId) {
          setSavedOrders(savedOrders.filter(o => o.id !== activeOrderId))
          setActiveOrderId(null)
        }
        
        // Show print receipt confirmation
        const printReceipt = confirm(`ขายสำเร็จ! เลขออเดอร์: ${orderNumber}\nช่องทาง: ${channelName}\n\nต้องการพิมพ์ใบเสร็จรับเงินหรือไม่?`)
        if (printReceipt) {
          handlePrintReceipt()
        }
        
        clearCart()
        setSalesChannel('walk-in')
      } catch (err) {
        console.error('Exception during checkout:', err)
        alert('เกิดข้อผิดพลาดในการบันทึกออเดอร์')
      }
    }
  }

  // Proceed with checkout after acknowledging alerts
  const proceedWithCheckout = () => {
    setShowAlertModal(false)
    
    const channelName = SALES_CHANNELS.find(c => c.id === salesChannel)?.name || 'หน้าร้าน'
    const confirmed = confirm(`ยืนยันการขายผ่าน ${channelName}\nยอดชำระ: ฿${getTotal().toFixed(2)}`)
    
    if (confirmed) {
      // Save alerts to database before clearing
      if (currentAlerts.length > 0) {
        saveAlertsToDatabase(currentAlerts)
      }

      // Remove from saved orders if it was a saved order
      if (activeOrderId) {
        setSavedOrders(savedOrders.filter(o => o.id !== activeOrderId))
        setActiveOrderId(null)
      }
      
      // Show print receipt confirmation
      const printReceipt = confirm(`ขายสำเร็จ! ช่องทาง: ${channelName}\n\nต้องการพิมพ์ใบเสร็จรับเงินหรือไม่?`)
      if (printReceipt) {
        handlePrintReceipt()
      }
      
      // Refresh alert logs to show new alerts
      fetchAlertLogs()
      
      clearCart()
      setSalesChannel('walk-in')
      setCurrentAlerts([])
    }
  }

  const handlePrintReceipt = () => {
    // Generate receipt content
    const receiptContent = `
      <div style="font-family: monospace; width: 80mm; padding: 10px;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 18px;">MORE DRUGSTORE</h2>
          <p style="margin: 5px 0; font-size: 12px;">ใบเสร็จรับเงิน / Receipt</p>
          <p style="margin: 5px 0; font-size: 11px;">${new Date().toLocaleString('th-TH')}</p>
        </div>
        
        <div style="margin-bottom: 10px;">
          <p style="margin: 3px 0; font-size: 11px;">ลูกค้า: ${selectedCustomer?.name || 'ลูกค้าทั่วไป'}</p>
          <p style="margin: 3px 0; font-size: 11px;">ช่องทาง: ${SALES_CHANNELS.find(c => c.id === salesChannel)?.name || 'หน้าร้าน'}</p>
        </div>
        
        <div style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          ${items.map(item => `
            <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px;">
              <span>${item.product.name_th} x${item.quantity}</span>
              <span>฿${(item.product.base_price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div style="text-align: right; margin-bottom: 10px;">
          <p style="margin: 3px 0; font-size: 12px;">ยอดรวม: ฿${getSubtotal().toFixed(2)}</p>
          <p style="margin: 3px 0; font-size: 12px;">ส่วนลด: ฿0.00</p>
          <p style="margin: 5px 0; font-size: 16px; font-weight: bold;">ยอดชำระ: ฿${getTotal().toFixed(2)}</p>
        </div>
        
        <div style="text-align: center; border-top: 1px dashed #000; padding-top: 10px; font-size: 11px;">
          <p style="margin: 5px 0;">ขอบคุณที่ใช้บริการ</p>
          <p style="margin: 5px 0;">Thank you for your purchase</p>
        </div>
      </div>
    `
    
    // Open print window
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>ใบเสร็จรับเงิน - MORE DRUGSTORE</title>
            <style>
              @media print {
                body { margin: 0; }
                * { -webkit-print-color-adjust: exact !important; }
              }
            </style>
          </head>
          <body>${receiptContent}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Save alerts to database
  const saveAlertsToDatabase = async (alerts: Array<{type: string, title: string, message: string, productName: string}>, orderId?: string) => {
    try {
      const alertLogs = alerts.map(alert => ({
        order_id: orderId,
        product_id: items.find(item => item.product.name_th === alert.productName)?.product.id,
        product_name: alert.productName,
        alert_type: alert.type,
        alert_title: alert.title,
        alert_message: alert.message,
        acknowledged: false,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('sale_alert_logs')
        .insert(alertLogs)

      if (error) {
        console.error('Error saving alerts:', error)
      } else {
        console.log('Alerts saved successfully')
      }
    } catch (err) {
      console.error('Exception saving alerts:', err)
    }
  }

  // Fetch saved alert logs
  const fetchAlertLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sale_alert_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching alert logs:', error)
        return
      }

      setSavedAlertLogs(data || [])
    } catch (err) {
      console.error('Exception fetching alert logs:', err)
    }
  }

  // Load alert logs on mount
  useEffect(() => {
    fetchAlertLogs()
  }, [])

  // Fetch recent sales
  const fetchRecentSales = async () => {
    setLoadingRecentSales(true)
    try {
      console.log('Fetching recent sales...')
      
      // Fetch recent orders with item count
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          total,
          platform_id,
          created_at,
          order_items(count)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      console.log('Orders response:', { orders, error })

      if (error) {
        console.error('Error fetching recent sales:', error)
        alert('ไม่สามารถโหลดรายการขายได้: ' + error.message)
        return
      }

      const formattedSales = orders?.map((order: any) => {
        console.log('Processing order:', order)
        // Handle count from Supabase - it can be a number directly or in an array
        let itemCount = 0
        if (order.order_items) {
          if (Array.isArray(order.order_items)) {
            itemCount = order.order_items[0]?.count || 0
          } else if (typeof order.order_items === 'number') {
            itemCount = order.order_items
          }
        }
        return {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          total: order.total,
          platform_id: order.platform_id,
          created_at: order.created_at,
          item_count: itemCount
        }
      }) || []

      console.log('Formatted sales:', formattedSales)
      setRecentSales(formattedSales)
    } catch (err) {
      console.error('Exception fetching recent sales:', err)
      alert('เกิดข้อผิดพลาดในการโหลดรายการขาย')
    } finally {
      setLoadingRecentSales(false)
    }
  }

  // Load sale to cart (re-order)
  const handleLoadSale = async (orderId: string) => {
    try {
      // Fetch order items
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('order_id', orderId)

      if (error) {
        console.error('Error fetching order items:', error)
        alert('ไม่สามารถโหลดรายการขายได้')
        return
      }

      if (!orderItems || orderItems.length === 0) {
        alert('ไม่พบรายการสินค้าในออเดอร์นี้')
        return
      }

      // Clear current cart
      clearCart()

      // Add items to cart
      let addedCount = 0
      for (const item of orderItems) {
        if (item.product) {
          addItem(item.product, item.quantity)
          addedCount++
        }
      }

      alert(`โหลดรายการขายสำเร็จ เพิ่มสินค้า ${addedCount} รายการ`)
      setShowRecentSales(false)
    } catch (err) {
      console.error('Exception loading sale:', err)
      alert('เกิดข้อผิดพลาดในการโหลดรายการขาย')
    }
  }

  // Format date for display
  const formatSaleDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get platform name
  const getPlatformName = (platformId: string) => {
    const channel = SALES_CHANNELS.find(c => c.id === platformId)
    return channel?.name || platformId
  }

  // Format date for display
  const formatAlertDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get alert type color
  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'out_of_stock': return 'bg-red-100 text-red-700 border-red-300'
      case 'low_stock': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'expiry':
      case 'expired': return 'bg-orange-100 text-orange-700 border-orange-300'
      default: return 'bg-blue-100 text-blue-700 border-blue-300'
    }
  }

  // Camera barcode scanning functions
  const handleOpenCamera = () => {
    setShowCameraModal(true)
    setCapturedImage(null)
  }

  const handleCloseCamera = () => {
    setShowCameraModal(false)
    setCapturedImage(null)
    // Stop camera stream if active
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งานกล้อง')
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        processBarcodeFromImage(imageData)
      }
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImage(imageData)
        processBarcodeFromImage(imageData)
      }
      reader.readAsDataURL(file)
    }
  }

  const processBarcodeFromImage = async (imageData: string) => {
    setIsProcessingBarcode(true)
    try {
      // Check if Barcode Detection API is supported
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']
        })
        
        // Create image element
        const img = new Image()
        img.src = imageData
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
        
        const barcodes = await barcodeDetector.detect(img)
        
        if (barcodes.length > 0) {
          console.log(`Found ${barcodes.length} barcodes:`, barcodes.map((b: any) => b.rawValue))
          
          // Find all products matching detected barcodes
          const foundProducts: Product[] = []
          const uniqueBarcodes = new Set<string>()
          
          for (const barcode of barcodes) {
            const code = barcode.rawValue
            if (!uniqueBarcodes.has(code)) {
              uniqueBarcodes.add(code)
              
              // Try to find product by barcode
              const product = getProductByBarcode(code) || products.find(p => p.barcode === code)
              if (product && !foundProducts.find(p => p.id === product.id)) {
                foundProducts.push(product)
              }
            }
          }
          
          if (foundProducts.length > 0) {
            // Show product selection view
            setDetectedProducts(foundProducts)
            setSelectedDetectedProducts(new Set(foundProducts.map(p => p.id)))
            setShowDetectedProductsView(true)
          } else {
            alert('ไม่พบสินค้าที่ตรงกับบาร์โค้ดในรูปภาพ กรุณาลองถ่ายใหม่หรือเลือกรูปอื่น')
            // Keep captured image visible for user to retry
          }
        } else {
          alert('ไม่พบบาร์โค้ดในรูปภาพ กรุณาลองใหม่')
          // Keep captured image visible for user to retry
        }
      } else {
        // Fallback: just show the image and let user enter barcode manually
        alert('เบราว์เซอร์นี้ไม่รองรับการอ่านบาร์โค้ดอัตโนมัติ กรุณาดูบาร์โค้ดจากรูปแล้วกรอกด้วยตนเอง')
        setShowCameraModal(false)
      }
    } catch (error) {
      console.error('Error processing image:', error)
      alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ')
    } finally {
      setIsProcessingBarcode(false)
    }
  }

  const handleToggleProductSelection = (productId: string) => {
    setSelectedDetectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const handleSelectAllDetected = () => {
    setSelectedDetectedProducts(new Set(detectedProducts.map(p => p.id)))
  }

  const handleDeselectAllDetected = () => {
    setSelectedDetectedProducts(new Set())
  }

  const handleAddSelectedToCart = () => {
    const selectedProducts = detectedProducts.filter(p => selectedDetectedProducts.has(p.id))
    
    for (const product of selectedProducts) {
      addItem(product)
    }
    
    alert(`เพิ่มสินค้า ${selectedProducts.length} รายการเข้าตะกร้าแล้ว`)
    handleCloseCamera()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ขายสินค้า (POS)</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              fetchAlertLogs()
              setShowAlertHistory(true)
            }}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            ประวัติแจ้งเตือน
            {savedAlertLogs.filter(log => !log.acknowledged).length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {savedAlertLogs.filter(log => !log.acknowledged).length}
              </span>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              fetchRecentSales()
              setShowRecentSales(true)
            }}
            className="flex items-center gap-2"
          >
            <Receipt className="h-4 w-4" />
            รายการขายล่าสุด
          </Button>
          {items.length > 0 && (
            <Button
              variant="secondary"
              onClick={handleSaveOrder}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              บันทึกไว้ก่อน
            </Button>
          )}
        </div>
      </div>

      {showAlertHistory && (
        <div className="mb-4 bg-white rounded-lg shadow p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">ประวัติการแจ้งเตือน</h3>
            </div>
            <button
              onClick={() => setShowAlertHistory(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {savedAlertLogs.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p>ไม่มีประวัติการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedAlertLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border-l-4 ${getAlertTypeColor(log.alert_type)} ${
                    !log.acknowledged ? 'ring-2 ring-blue-300' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{log.product_name}</p>
                      <p className="font-medium text-sm">{log.alert_title}</p>
                      {log.alert_message && (
                        <p className="text-sm text-gray-600 mt-1">{log.alert_message}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatAlertDate(log.created_at)}
                      </p>
                    </div>
                    {!log.acknowledged && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        ใหม่
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Orders Tabs */}
      {savedOrders.length > 0 && (
        <div className="mb-4 bg-white rounded-lg shadow p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">รายการที่บันทึกไว้:</p>
          <div className="flex flex-wrap gap-2">
            {savedOrders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                  activeOrderId === order.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <button
                  onClick={() => handleLoadOrder(order)}
                  className="flex items-center gap-2 flex-1"
                >
                  <ShoppingCart className="h-4 w-4 text-gray-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-900">{order.name}</p>
                    <p className="text-xs text-gray-500">
                      {order.items.length} รายการ • {SALES_CHANNELS.find(c => c.id === order.salesChannel)?.name}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteOrder(order.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <Card title="สแกนบาร์โค้ด">
            {/* Filter Options */}
            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={() => setShowStockOnly(!showStockOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  showStockOnly
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <Package className="h-4 w-4" />
                {showStockOnly ? 'เฉพาะสินค้ามี stock' : 'แสดงทั้งหมด'}
              </button>
              {showStockOnly && (
                <span className="text-xs text-green-600">กรอง: สินค้าคงเหลือ {'>'} 0</span>
              )}
            </div>

            <form onSubmit={handleBarcodeSubmit} className="mb-6">
              <div className="flex gap-2">
                <div className="flex-1 relative" ref={dropdownRef}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="สแกนหรือพิมพ์บาร์โค้ดสินค้า"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                    autoFocus
                  />
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-[9999] w-full mt-1 bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                      {searchResults.map((product, index) => (
                        <div
                          key={product.id}
                          onClick={() => addProductToCart(product)}
                          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 ${
                            index === selectedIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{product.name_th}</p>
                              {product.name_en && (
                                <p className="text-sm text-gray-500">{product.name_en}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                บาร์โค้ด: {product.barcode}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-blue-600">
                                ฿{getProductPriceForChannel(product, salesChannel as SalesChannel).toFixed(2)}
                              </p>
                              {getProductPriceForChannel(product, salesChannel as SalesChannel) !== product.base_price && (
                                <p className="text-xs text-gray-400 line-through">
                                  ฿{product.base_price.toFixed(2)}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                คงเหลือ: {product.stock_quantity}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" variant="primary">
                  <Scan className="h-5 w-5" />
                </Button>
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={handleOpenCamera}
                  title="ถ่ายรูปบาร์โค้ด"
                >
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>ยังไม่มีสินค้าในตะกร้า</p>
                  <p className="text-sm">สแกนบาร์โค้ดเพื่อเพิ่มสินค้า</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Product Image */}
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name_th}
                        className="h-14 w-14 object-cover rounded-lg border flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 bg-gray-200 rounded-lg border flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.product.name_th}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">ราคา:</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.custom_price ?? getProductPriceForChannel(item.product, salesChannel as SalesChannel)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            if (!isNaN(value) && value >= 0) {
                              updateCustomPrice(item.product.id, value)
                            }
                          }}
                          className="w-20 text-sm h-6 py-0"
                        />
                        {item.custom_price !== undefined && item.custom_price !== null && (
                          <span className="text-xs text-orange-500">(แก้ไข)</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 line-through">
                        ราคาปกติ: ฿{getProductPriceForChannel(item.product, salesChannel as SalesChannel).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Minus Button */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                        }}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (!isNaN(value) && value >= 1) {
                            updateQuantity(item.product.id, value)
                          }
                        }}
                        className="w-14 text-center h-8"
                      />
                      {/* Plus Button */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                      <span className="font-medium text-gray-900 w-20 text-right">
                        ฿{((item.custom_price ?? getProductPriceForChannel(item.product, salesChannel as SalesChannel)) * item.quantity).toFixed(2)}
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card title="สรุปรายการ">
            {/* Customer Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ลูกค้า
              </label>
              <div className="relative" ref={customerDropdownRef}>
                {selectedCustomer && selectedCustomer.id !== 'default' ? (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <User className="h-4 w-4 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 truncate">{selectedCustomer.name}</p>
                      {selectedCustomer.phone && (
                        <p className="text-xs text-blue-600">{selectedCustomer.phone}</p>
                      )}
                    </div>
                    <button
                      onClick={handleClearCustomer}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="พิมพ์ชื่อลูกค้า (ลูกค้าทั่วไป)"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}

                {/* Customer Dropdown */}
                {showCustomerDropdown && customerResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customerResults.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{customer.name}</p>
                            {customer.phone && (
                              <p className="text-xs text-gray-500">{customer.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Contact Button - Show when searching but no results */}
                {customerSearch.trim().length > 0 && !showCustomerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="text-sm text-gray-500 mb-2">ไม่พบลูกค้า "{customerSearch}"</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setNewContactName(customerSearch)
                        setShowAddContactModal(true)
                        setShowCustomerDropdown(false)
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      เพิ่มผู้ติดต่อใหม่
                    </Button>
                  </div>
                )}
              </div>
              {selectedCustomer?.id === 'default' && (
                <p className="text-xs text-gray-500 mt-1">ค่าเริ่มต้น: ลูกค้าทั่วไป</p>
              )}
            </div>

            {/* Sales Channel Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ช่องทางการขาย
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SALES_CHANNELS.map((channel) => {
                  const Icon = channel.icon
                  const isSelected = salesChannel === channel.id
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setSalesChannel(channel.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : ''}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'font-bold' : ''}`}>{channel.name}</span>
                      {isSelected && (
                        <span className="ml-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {salesChannel && (
                <p className="mt-2 text-sm text-blue-700 font-medium">
                  กำลังขายผ่าน: {SALES_CHANNELS.find(c => c.id === salesChannel)?.name}
                </p>
              )}
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">
                วิธีชำระ
              </label>
              {paymentMethods.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`px-4 py-2 rounded-full border-2 transition-all text-sm whitespace-nowrap ${
                        selectedPaymentMethod === method.id
                          ? 'border-green-500 bg-green-500 text-white font-medium shadow-md'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded-full">
                  ยังไม่มีวิธีการชำระเงิน
                </p>
              )}
            </div>

            {/* Held Bills Section */}
            {heldBills.length > 0 && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-800">
                    บิลที่พักไว้ ({heldBills.length})
                  </span>
                  <button
                    onClick={() => setShowHeldBills(true)}
                    className="text-sm text-yellow-700 hover:text-yellow-900 underline"
                  >
                    ดูทั้งหมด
                  </button>
                </div>
                <div className="text-xs text-yellow-700">
                  ล่าสุด: {heldBills[heldBills.length - 1]?.name}
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>ยอดรวม</span>
                <span>฿{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>ส่วนลด</span>
                <span>฿0.00</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>ยอดชำระ</span>
                  <span>฿{getTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={items.length === 0}
              >
                ชำระเงิน
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleHoldBill}
                  disabled={items.length === 0}
                >
                  <Save className="h-5 w-5 mr-2" />
                  พักบิล
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handlePrintReceipt}
                  disabled={items.length === 0}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  พิมพ์ใบเสร็จ
                </Button>
              </div>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={clearCart}
                disabled={items.length === 0}
              >
                ล้างตะกร้า
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Alert Modal */}
      {showAlertModal && currentAlerts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-900">
                  {currentAlerts.length === 1 ? 'การแจ้งเตือน' : `การแจ้งเตือน (${currentAlerts.length})`}
                </h2>
              </div>
              <button 
                onClick={() => setShowAlertModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {currentAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'out_of_stock' ? 'bg-red-50 border-red-500' :
                    alert.type === 'low_stock' ? 'bg-yellow-50 border-yellow-500' :
                    alert.type === 'expiry' || alert.type === 'expired' ? 'bg-orange-50 border-orange-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{alert.productName}</p>
                  <p className={`font-medium text-sm ${
                    alert.type === 'out_of_stock' ? 'text-red-700' :
                    alert.type === 'low_stock' ? 'text-yellow-700' :
                    alert.type === 'expiry' || alert.type === 'expired' ? 'text-orange-700' :
                    'text-blue-700'
                  }`}>
                    {alert.title}
                  </p>
                  {alert.message && (
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  )}
                </div>
              ))}
              
              <p className="text-sm text-gray-500 mt-4">
                กรุณาตรวจสอบสินค้าเหล่านี้ก่อนดำเนินการต่อ
              </p>
            </div>
            
            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowAlertModal(false)}
              >
                กลับไปแก้ไข
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={proceedWithCheckout}
              >
                ดำเนินการต่อ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">ถ่ายรูปบาร์โค้ด</h2>
              <button 
                onClick={handleCloseCamera}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Video/Camera Preview */}
              {!capturedImage ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ maxHeight: '400px' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="flex-1"
                      onClick={startCamera}
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      เปิดกล้อง
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={capturePhoto}
                      disabled={!videoRef.current?.srcObject}
                    >
                      ถ่ายรูป
                    </Button>
                  </div>
                  
                  {/* File Upload Option */}
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2">หรือเลือกรูปจากเครื่อง</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ) : showDetectedProductsView ? (
                /* Detected Products Selection View */
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-800 font-medium">
                      พบสินค้า {detectedProducts.length} รายการจากรูปภาพ
                    </p>
                    <p className="text-sm text-green-600">
                      เลือกสินค้าที่ต้องการเพิ่มเข้าตะกร้า
                    </p>
                  </div>

                  {/* Select/Deselect All Buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSelectAllDetected}
                      className="flex-1"
                    >
                      เลือกทั้งหมด
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleDeselectAllDetected}
                      className="flex-1"
                    >
                      ยกเลิกทั้งหมด
                    </Button>
                  </div>

                  {/* Products List */}
                  <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg">
                    {detectedProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleToggleProductSelection(product.id)}
                        className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors flex items-center gap-3 ${
                          selectedDetectedProducts.has(product.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDetectedProducts.has(product.id)}
                          onChange={() => handleToggleProductSelection(product.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name_th}</p>
                          {product.name_en && (
                            <p className="text-sm text-gray-500">{product.name_en}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            บาร์โค้ด: {product.barcode}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">
                            ฿{getProductPriceForChannel(product, salesChannel as SalesChannel).toFixed(2)}
                            {getProductPriceForChannel(product, salesChannel as SalesChannel) !== product.base_price && (
                              <span className="text-xs text-gray-400 line-through ml-1">
                                ฿{product.base_price.toFixed(2)}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            คงเหลือ: {product.stock_quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary and Add Button */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-600">
                        เลือก {selectedDetectedProducts.size} จาก {detectedProducts.length} รายการ
                      </span>
                      <span className="font-bold text-blue-600">
                        รวม: ฿{detectedProducts
                          .filter(p => selectedDetectedProducts.has(p.id))
                          .reduce((sum, p) => sum + getProductPriceForChannel(p, salesChannel as SalesChannel), 0)
                          .toFixed(2)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setShowDetectedProductsView(false)}
                      >
                        ถ่ายใหม่
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        className="flex-1"
                        onClick={handleAddSelectedToCart}
                        disabled={selectedDetectedProducts.size === 0}
                      >
                        เพิ่มเข้าตะกร้า ({selectedDetectedProducts.size})
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Captured Image Preview */
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={capturedImage} 
                      alt="Captured barcode"
                      className="w-full h-auto max-h-80 object-contain"
                    />
                  </div>
                  
                  {isProcessingBarcode ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">กำลังอ่านบาร์โค้ด...</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setCapturedImage(null)}
                      >
                        ถ่ายใหม่
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        className="flex-1"
                        onClick={() => processBarcodeFromImage(capturedImage)}
                      >
                        อ่านบาร์โค้ด
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                หมายเหตุ: ฟีเจอร์นี้ใช้ Barcode Detection API ของเบราว์เซอร์ รองรับ Chrome, Edge, Safari
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sales Modal */}
      {showRecentSales && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Receipt className="h-6 w-6 text-blue-500" />
                <h2 className="text-lg font-bold text-gray-900">รายการขายล่าสุด</h2>
              </div>
              <button 
                onClick={() => setShowRecentSales(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4">
              {loadingRecentSales ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">กำลังโหลด...</p>
                </div>
              ) : recentSales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>ยังไม่มีรายการขาย</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer border border-gray-200 hover:border-blue-300"
                      onClick={() => handleLoadSale(sale.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{sale.order_number}</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {getPlatformName(sale.platform_id)}
                            </span>
                          </div>
                          {sale.customer_name && (
                            <p className="text-sm text-gray-600">{sale.customer_name}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatSaleDate(sale.created_at)} • {sale.item_count} รายการ
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">฿{sale.total.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">คลิกเพื่อโหลด</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowRecentSales(false)}
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {showHeldBills && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Save className="h-6 w-6 text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-900">บิลที่พักไว้</h2>
              </div>
              <button
                onClick={() => setShowHeldBills(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Save className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>ไม่มีบิลที่พักไว้</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {heldBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{bill.name}</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {SALES_CHANNELS.find(c => c.id === bill.salesChannel)?.name || 'หน้าร้าน'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {bill.items.length} รายการ • {new Date(bill.createdAt).toLocaleString('th-TH')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleResumeBill(bill)}
                          >
                            เปิดบิล
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteHeldBill(bill.id)}
                          >
                            ลบ
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowHeldBills(false)}
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Bill Confirmation Modal */}
      {showHoldBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Save className="h-6 w-6 text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-900">พักบิล</h2>
              </div>
              <button
                onClick={() => setShowHoldBillModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-gray-600 mb-4">ระบุชื่อหรือหมายเหตุสำหรับบิลนี้:</p>
              <input
                type="text"
                value={holdBillName}
                onChange={(e) => setHoldBillName(e.target.value)}
                placeholder={`บิล ${heldBills.length + 1}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowHoldBillModal(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={confirmHoldBill}
              >
                พักบิล
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <User className="h-6 w-6 text-blue-500" />
                <h2 className="text-lg font-bold text-gray-900">เพิ่มผู้ติดต่อใหม่</h2>
              </div>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="ชื่อผู้ติดต่อ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="เบอร์โทรศัพท์ (ถ้ามี)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowAddContactModal(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleAddNewContact}
              >
                บันทึก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
