import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '../stores/cartStore'
import { useProductStore } from '../stores/productStore'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Scan, Trash2, ShoppingCart, Save, X, Store, Bike, User, Search, Package, Receipt } from 'lucide-react'
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
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  
  // Product filter states
  const [showStockOnly, setShowStockOnly] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, getSubtotal, setItems } = useCartStore()
  const { getProductByBarcode, products, fetchProducts } = useProductStore()

  // Load products and customers on mount
  useEffect(() => {
    console.log('POS: Loading products...')
    fetchProducts()
    // Load default customer
    setSelectedCustomer({ id: 'default', name: 'ลูกค้าทั่วไป', type: 'buyer' })
  }, [])

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

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('กรุณาเพิ่มสินค้าในตะกร้า')
      return
    }

    const channelName = SALES_CHANNELS.find(c => c.id === salesChannel)?.name || 'หน้าร้าน'
    const confirmed = confirm(`ยืนยันการขายผ่าน ${channelName}\nยอดชำระ: ฿${getTotal().toFixed(2)}`)
    
    if (confirmed) {
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
      
      clearCart()
      setSalesChannel('walk-in')
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ขายสินค้า (POS)</h1>
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
                                ฿{product.base_price.toFixed(2)}
                              </p>
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
                      <p className="text-sm text-gray-500">฿{item.product.base_price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value))}
                        className="w-16 text-center"
                      />
                      <span className="font-medium text-gray-900 w-20 text-right">
                        ฿{(item.product.base_price * item.quantity).toFixed(2)}
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
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setSalesChannel(channel.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        salesChannel === channel.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{channel.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

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
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handlePrintReceipt}
                disabled={items.length === 0}
              >
                <Receipt className="h-5 w-5 mr-2" />
                พิมพ์ใบเสร็จ
              </Button>
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
    </div>
  )
}
