import { useState, useEffect } from 'react'
import { X, Trash2, Save, Search } from 'lucide-react'
import { supabase } from '../services/supabase'

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount: number
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
  onClose: () => void
  onSave: () => void
}

export default function OrderEditModal({ orderId, onClose, onSave }: OrderEditModalProps) {
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    loadOrderData()
  }, [orderId])

  const loadOrderData = async () => {
    try {
      setLoading(true)
      
      // Load order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (orderError) throw orderError
      
      // Load order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('order_id', orderId)
      
      if (itemsError) throw itemsError
      
      setOrder(orderData)
      
      // Format items for editing
      const formattedItems = itemsData?.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name || item.product?.name_th || 'สินค้า',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total_price: item.total_price
      })) || []
      
      setItems(formattedItems)
    } catch (err) {
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
      setSaving(true)
      
      const { subtotal, discount, total } = calculateTotals()
      
      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          subtotal,
          discount,
          total,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
      
      if (orderError) throw orderError
      
      // Delete old items
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)
      
      if (deleteError) throw deleteError
      
      // Insert new items
      const orderItems = items.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total_price: item.total_price
      }))
      
      const { error: insertError } = await supabase
        .from('order_items')
        .insert(orderItems)
      
      if (insertError) throw insertError
      
      alert('บันทึกการแก้ไขสำเร็จ')
      onSave()
    } catch (err) {
      console.error('Error saving order:', err)
      alert('ไม่สามารถบันทึกการแก้ไขได้')
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
                      <div className="font-medium text-gray-900">{item.product_name}</div>
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
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
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
                      ฿{item.total_price.toFixed(2)}
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
