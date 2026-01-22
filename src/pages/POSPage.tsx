import { useState } from 'react'
import { useCartStore } from '../stores/cartStore'
import { useProductStore } from '../stores/productStore'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Scan, Trash2, ShoppingCart } from 'lucide-react'

export default function POSPage() {
  const [barcode, setBarcode] = useState('')
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, getSubtotal } = useCartStore()
  const { getProductByBarcode } = useProductStore()

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode.trim()) return

    const product = getProductByBarcode(barcode)
    if (product) {
      addItem(product)
      setBarcode('')
    } else {
      alert('ไม่พบสินค้า')
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">ขายสินค้า (POS)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="สแกนบาร์โค้ด">
            <form onSubmit={handleBarcodeSubmit} className="mb-6">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="สแกนหรือพิมพ์บาร์โค้ดสินค้า"
                    autoFocus
                  />
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
