import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Save, Search } from 'lucide-react'
import { supabase } from '../services/supabase'

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  total_price: number
}

interface Product {
  id: string
  name_th: string
  name_en: string
  barcode: string
  base_price: number
}

interface OrderEditModalProps {
  orderId: string
  orderSource?: 'pos' | 'website'
  onClose: () => void
  onSave: () => void
}

export default function OrderEditModal({ orderId, orderSource = 'pos', onClose, onSave }: OrderEditModalProps) {
  const [order, setOrder] = useState<any>(null)
  const [platformName, setPlatformName] = useState<string>('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<Array<{id: string; name: string}>>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent double loading in StrictMode
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    loadOrderData()
    fetchPaymentMethods()
  }, [orderId])

  const loadOrderData = async () => {
    try {
      setLoading(true)
      
      console.log('OrderEditModal - orderId:', orderId, 'orderSource:', orderSource)
      
      // Determine which table to use based on order source
      const isWebOrder = orderSource === 'website'
      console.log('OrderEditModal - isWebOrder:', isWebOrder)
      
      const orderTable = isWebOrder ? 'web_orders' : 'orders'
      const itemsTable = isWebOrder ? 'web_order_items' : 'order_items'
      const orderIdColumn = isWebOrder ? 'web_order_id' : 'order_id'
      
      console.log('OrderEditModal - Loading from table:', orderTable)
      
      // Load order details
      const { data: orderData, error: orderError } = await supabase
        .from(orderTable)
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (orderError) throw orderError
      
      // Load order items
      console.log('OrderEditModal - Querying items with:', { itemsTable, orderIdColumn, orderId })
      const { data: itemsData, error: itemsError } = await supabase
        .from(itemsTable)
        .select(`
          *,
          product:products(*)
        `)
        .eq(orderIdColumn, orderId)
      
      console.log('OrderEditModal - Items query result:', itemsData, 'Error:', itemsError)
      console.log('OrderEditModal - Items count:', itemsData?.length || 0)
      
      // Also try a simple query without joins to see if that's the issue
      const { data: simpleItems, error: simpleError } = await supabase
        .from(itemsTable)
        .select('*')
        .eq(orderIdColumn, orderId)
      console.log('OrderEditModal - Simple query result:', simpleItems, 'Error:', simpleError)
      
      if (itemsError) throw itemsError
      
      setOrder(orderData)
      setSelectedPaymentMethod(orderData?.payment_method || '')
      
      // Fetch platform name if platform_id exists (only for regular orders)
      if (!isWebOrder && orderData?.platform_id) {
        const { data: platformData } = await supabase
          .from('platforms')
          .select('name')
          .eq('id', orderData.platform_id)
          .single()
        if (platformData) {
          // Map platform names for display consistency
          const nameMap: Record<string, string> = {
            'Walk-in (ร้าน)': 'หน้าร้าน',
            'WALKIN': 'หน้าร้าน',
            'walk-in': 'หน้าร้าน'
          }
          setPlatformName(nameMap[platformData.name] || platformData.name)
        }
      } else if (isWebOrder) {
        setPlatformName('เว็บไซต์')
      }
      
      // Format items for editing - merge duplicates by product_id only
      // (combines free gifts and paid items of same product)
      const itemMap = new Map<string, any>()
      itemsData?.forEach((item: any) => {
        const key = item.product_id
        if (itemMap.has(key)) {
          // Merge with existing item
          const existing = itemMap.get(key)
          existing.quantity += item.quantity
          existing.total_price += item.total_price
          existing.discount = (existing.discount || 0) + (item.discount || 0)
        } else {
          // Create new entry
          itemMap.set(key, {
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name || item.product?.name_th || 'สินค้า',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            total_price: item.total_price
          })
        }
      })
      
      const formattedItems = Array.from(itemMap.values())
      setItems(formattedItems)
    } catch (err: any) {
      // Ignore AbortError (component unmounted or request cancelled)
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.log('Order loading aborted in modal')
        return
      }
      console.error('Error loading order:', err)
      alert('ไม่สามารถโหลดข้อมูลออเดอร์ได้')
    } finally {
      setLoading(false)
    }
  }

  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([])
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name_th.ilike.%${term}%,barcode.ilike.%${term}%`)
        .limit(10)
      
      if (error) throw error
      setSearchResults(data || [])
    } catch (err) {
      console.error('Error searching products:', err)
    }
  }

  const addItem = (product: Product) => {
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      product_id: product.id,
      product_name: product.name_th,
      quantity: 1,
      unit_price: product.base_price,
      discount: 0,
      subtotal: product.base_price,
      total_price: product.base_price
    }
    
    setItems([...items, newItem])
    setShowSearch(false)
    setSearchTerm('')
    setSearchResults([])
  }

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return
    
    const updatedItems = [...items]
    updatedItems[index].quantity = quantity
    updatedItems[index].total_price = (quantity * updatedItems[index].unit_price) - updatedItems[index].discount
    setItems(updatedItems)
  }

  const updateItemPrice = (index: number, price: number) => {
    if (price < 0) return
    
    const updatedItems = [...items]
    updatedItems[index].unit_price = price
    updatedItems[index].total_price = (updatedItems[index].quantity * price) - updatedItems[index].discount
    setItems(updatedItems)
  }

  const updateItemDiscount = (index: number, discount: number) => {
    if (discount < 0) return
    
    const updatedItems = [...items]
    updatedItems[index].discount = discount
    updatedItems[index].total_price = (updatedItems[index].quantity * updatedItems[index].unit_price) - discount
    setItems(updatedItems)
  }

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    setItems(updatedItems)
  }

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setPaymentMethods(data || [])
    } catch (err) {
      console.error('Error fetching payment methods:', err)
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const discount = items.reduce((sum, item) => sum + item.discount, 0)
    const total = subtotal - discount
    return { subtotal, discount, total }
  }

  const handleSave = async () => {
    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ')
      return
    }

    try {
      if (saving) return // Prevent double submission
      setSaving(true)
      
      // Determine table names based on order source
      const isWebOrder = orderSource === 'website'
      const orderTable = isWebOrder ? 'web_orders' : 'orders'
      const itemsTable = isWebOrder ? 'web_order_items' : 'order_items'
      const orderIdColumn = isWebOrder ? 'web_order_id' : 'order_id'
      
      const { subtotal, discount, total } = calculateTotals()
      
      // Update order with payment method
      const updateData: any = {
        subtotal,
        discount,
        payment_method: selectedPaymentMethod,
        updated_at: new Date().toISOString()
      }
      
      // web_orders uses total_amount, orders uses total
      if (isWebOrder) {
        updateData.total_amount = total
      } else {
        updateData.total = total
      }
      
      const { error: orderError } = await supabase
        .from(orderTable)
        .update(updateData)
        .eq('id', orderId)
      
      if (orderError) throw orderError
      
      // Delete old items
      console.log('Deleting old items for order:', orderId, 'from table:', itemsTable)
      const { error: deleteError, data: deleteData } = await supabase
        .from(itemsTable)
        .delete()
        .eq(orderIdColumn, orderId)
        .select()
      
      console.log('Delete result:', deleteData)
      
      if (deleteError) {
        console.error('Error deleting old items:', deleteError)
        throw deleteError
      }
      
      // Insert new items
      const orderItems = items.map(item => {
        const itemData: any = {
          [orderIdColumn]: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          total_price: (item.unit_price * item.quantity) - (item.discount || 0)
        }
        // Only add subtotal for web_order_items, not for order_items
        if (isWebOrder) {
          itemData.subtotal = (item.unit_price * item.quantity) - (item.discount || 0)
        }
        return itemData
      })
      
      console.log('Inserting new items:', orderItems, 'into table:', itemsTable)
      
      const { error: insertError, data: insertData } = await supabase
        .from(itemsTable)
        .insert(orderItems)
        .select()
      
      console.log('Insert result:', insertData)
      
      if (insertError) throw insertError
      
      alert('บันทึกการแก้ไขสำเร็จ')
      onSave()
    } catch (err: any) {
      console.error('Error saving order:', err)
      
      // Handle specific error types
      if (err?.code === '23514' || err?.message?.includes('stock_quantity_check')) {
        alert('ไม่สามารถบันทึกได้: สินค้าในสต็อกไม่เพียงพอ กรุณาตรวจสอบจำนวนสินค้า')
      } else if (err?.code === '23503') {
        alert('ไม่สามารถบันทึกได้: มีข้อมูลที่เชื่อมโยงกับสินค้าหรือออเดอร์นี้')
      } else if (err?.message) {
        alert('ไม่สามารถบันทึกการแก้ไขได้: ' + err.message)
      } else {
        alert('ไม่สามารถบันทึกการแก้ไขได้')
      }
    } finally {
      setSaving(false)
    }
  }

  const { subtotal, discount, total } = calculateTotals()

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              แก้ไขออเดอร์ {order?.order_number}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ลูกค้า: {order?.customer_name || '-'}
            </p>
            <p className="text-sm text-gray-500">
              ช่องทางการขาย: {platformName || '-'}
            </p>
            <div className="mt-2">
              <label className="text-sm text-gray-600">วิธีชำระเงิน:</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="ml-2 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- เลือกวิธีชำระ --</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.name}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Search Products */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">เพิ่มสินค้า</span>
            </div>
            <input
              type="text"
              placeholder="ค้นหาสินค้าด้วยชื่อหรือบาร์โค้ด..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                searchProducts(e.target.value)
                setShowSearch(true)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {showSearch && searchResults.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addItem(product)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-gray-900">{product.name_th}</div>
                    <div className="text-sm text-gray-500">
                      ราคา: ฿{product.base_price.toFixed(2)} | บาร์โค้ด: {product.barcode || '-'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    สินค้า
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                    จำนวน
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    ราคา/หน่วย
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    ส่วนลด
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    รวม
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                    ลบ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {item.unit_price === 0 && (
                          <span className="text-orange-500 mr-1">🎁 ของแถม:</span>
                        )}
                        {item.product_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unit_price}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            updateItemPrice(index, 0)
                            return
                          }
                          const numValue = parseFloat(value)
                          if (!isNaN(numValue) && numValue >= 0) {
                            updateItemPrice(index, numValue)
                          }
                        }}
                        className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItemDiscount(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ฿{((item.total_price ?? item.subtotal ?? (item.unit_price * item.quantity)) ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      ยังไม่มีรายการสินค้า
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">รวมก่อนลด</span>
              <span className="font-medium">฿{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ส่วนลด</span>
              <span className="font-medium text-red-600">-฿{discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>ยอดรวม</span>
              <span className="text-blue-600">฿{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#7D735F] text-white rounded-lg hover:bg-[#7D735F]/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  )
}
