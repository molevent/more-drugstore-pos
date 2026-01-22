import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '../stores/cartStore'
import { useProductStore } from '../stores/productStore'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Scan, Trash2, ShoppingCart } from 'lucide-react'
import type { Product } from '../types/database'

export default function POSPage() {
  const [barcode, setBarcode] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, getSubtotal } = useCartStore()
  const { getProductByBarcode, products } = useProductStore()

  // Search products as user types
  useEffect(() => {
    if (barcode.trim().length > 0) {
      const searchTerm = barcode.toLowerCase()
      const results = products.filter(p => 
        p.barcode.toLowerCase().includes(searchTerm) ||
        p.name_th.toLowerCase().includes(searchTerm) ||
        p.name_en?.toLowerCase().includes(searchTerm)
      ).slice(0, 10) // Limit to 10 results
      
      setSearchResults(results)
      setShowDropdown(results.length > 0)
      setSelectedIndex(-1)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [barcode, products])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('กรุณาเพิ่มสินค้าในตะกร้า')
      return
    }
    alert('ฟังก์ชันชำระเงินยังไม่พร้อมใช้งาน')
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">ขายสินค้า (POS)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <Card title="สแกนบาร์โค้ด">
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
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
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
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product.name_th}</h3>
                      <p className="text-sm text-gray-500">฿{item.product.base_price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value))}
                        className="w-20 text-center"
                      />
                      <span className="font-medium text-gray-900 w-24 text-right">
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
