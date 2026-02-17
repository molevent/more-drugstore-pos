import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { 
  ShoppingCart, 
  ArrowLeft, 
  Package,
  MapPin,
  User,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Copy,
  ChevronRight
} from 'lucide-react'

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  stock: number
}

interface OrderFormData {
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_line_id: string
  shipping_address: string
  shipping_province: string
  shipping_district: string
  shipping_postal_code: string
  customer_note: string
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [lineUrl, setLineUrl] = useState('')
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_line_id: '',
    shipping_address: '',
    shipping_province: '',
    shipping_district: '',
    shipping_postal_code: '',
    customer_note: ''
  })

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('storefront_cart')
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart)
        setCart(parsed)
        if (parsed.length === 0) {
          // Redirect to store if cart is empty
          navigate('/store')
        }
      } catch (e) {
        console.error('Error parsing cart:', e)
        navigate('/store')
      }
    } else {
      navigate('/store')
    }
  }, [navigate])

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('storefront_cart', JSON.stringify(newCart))
    if (newCart.length === 0) {
      navigate('/store')
    }
  }

  const removeFromCart = (productId: string) => {
    updateCart(cart.filter(item => item.product_id !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    const item = cart.find(i => i.product_id === productId)
    if (!item) return
    
    if (newQuantity > item.stock) {
      alert(`สินค้า ${item.name} มีจำนวนจำกัด (${item.stock} ชิ้น)`)
      return
    }
    
    updateCart(cart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shippingFee = cartSubtotal >= 1000 ? 0 : 50 // Free shipping over 1000
  const cartTotal = cartSubtotal + shippingFee

  const generateLineMessage = (orderNum: string) => {
    const items = cart.map(item => 
      `- ${item.name} x${item.quantity} = ฿${(item.price * item.quantity).toLocaleString()}`
    ).join('\n')
    
    return `🛒 คำสั่งซื้อใหม่ #${orderNum}

📦 รายการสินค้า:
${items}

💰 ยอดรวม: ฿${cartSubtotal.toLocaleString()}
🚚 ค่าจัดส่ง: ฿${shippingFee.toLocaleString()}
💵 ยอดสุทธิ: ฿${cartTotal.toLocaleString()}

👤 ข้อมูลลูกค้า:
ชื่อ: ${formData.customer_name}
โทร: ${formData.customer_phone}
${formData.customer_line_id ? `LINE ID: ${formData.customer_line_id}` : ''}

📍 ที่อยู่จัดส่ง:
${formData.shipping_address}
${formData.shipping_district}, ${formData.shipping_province} ${formData.shipping_postal_code}

${formData.customer_note ? `📝 หมายเหตุ: ${formData.customer_note}` : ''}
`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (cart.length === 0) {
      alert('กรุณาเพิ่มสินค้าในตะกร้าก่อนสั่งซื้อ')
      return
    }

    setLoading(true)
    
    try {
      // Create web order
      const { data: order, error: orderError } = await supabase
        .from('web_orders')
        .insert({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email || null,
          customer_line_id: formData.customer_line_id || null,
          shipping_address: formData.shipping_address,
          shipping_province: formData.shipping_province,
          shipping_district: formData.shipping_district,
          shipping_postal_code: formData.shipping_postal_code,
          customer_note: formData.customer_note || null,
          subtotal: cartSubtotal,
          shipping_fee: shippingFee,
          total_amount: cartTotal
        })
        .select()
        .single()

      if (orderError || !order) {
        console.error('Error creating order:', orderError)
        alert(`เกิดข้อผิดพลาด: ${orderError?.message || 'ไม่สามารถสร้างคำสั่งซื้อได้'}`)
        return
      }

      // Create order items
      const orderItems = cart.map(item => ({
        web_order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        total_price: item.price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('web_order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        // Continue anyway - order was created
      }

      setOrderNumber(order.order_number)
      
      // Generate Line message and URL
      const message = generateLineMessage(order.order_number)
      const encodedMessage = encodeURIComponent(message)
      
      // Line Official Account URL (replace with actual LINE Official ID)
      // Format: https://line.me/R/oaMessage/{LINE_ID}/?{message}
      // or https://line.me/R/ti/p/{LINE_ID} for personal
      const lineOfficialId = '@moredrugstore' // Replace with actual LINE Official ID
      const url = `https://line.me/R/oaMessage/${lineOfficialId}/?${encodedMessage}`
      
      setLineUrl(url)
      setOrderComplete(true)
      
      // Clear cart
      localStorage.removeItem('storefront_cart')
      setCart([])
      
    } catch (error) {
      console.error('Error:', error)
      alert('เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    const message = generateLineMessage(orderNumber)
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/store" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#7D735F] rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <span className="font-semibold text-xl text-[#5A5A5A]">More Drugstore</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#5A5A5A] mb-2">สั่งซื้อสำเร็จ!</h1>
            <p className="text-gray-500 mb-6">เลขที่คำสั่งซื้อของคุณ: <span className="font-semibold text-[#7D735F]">{orderNumber}</span></p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-4">
                กรุณาส่งข้อมูลคำสั่งซื้อไปยัง LINE Official ของเราเพื่อยืนยันการสั่งซื้อ
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-[#00B900] text-white rounded-lg font-medium hover:bg-[#00A000] transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  ส่งข้อความไป LINE
                </a>
                
                <button
                  onClick={copyToClipboard}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      คัดลอกแล้ว!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      คัดลอกข้อความ
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              เราจะติดต่อกลับเพื่อยืนยันการสั่งซื้อและแจ้งช่องทางการชำระเงินภายใน 24 ชั่วโมง
            </p>

            <Link
              to="/store"
              className="inline-flex items-center gap-2 text-[#7D735F] hover:underline font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าร้านค้า
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/store" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#7D735F] rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="font-semibold text-xl text-[#5A5A5A] hidden sm:block">More Drugstore</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to="/store" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#7D735F] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปเลือกสินค้า
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#5A5A5A] mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#7D735F]" />
                  ข้อมูลติดต่อ
                </h2>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                      placeholder="ชื่อ นามสกุล"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      โทรศัพท์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                      placeholder="08x-xxx-xxxx"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 text-[#00B900]" />
                      LINE ID (สำหรับรับการแจ้งเตือน)
                    </label>
                    <input
                      type="text"
                      value={formData.customer_line_id}
                      onChange={(e) => setFormData({ ...formData, customer_line_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                      placeholder="@line_id หรือเบอร์โทรที่ใช้กับ LINE"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#5A5A5A] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#7D735F]" />
                  ที่อยู่จัดส่ง
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ที่อยู่ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.shipping_address}
                      onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                      placeholder="บ้านเลขที่, หมู่บ้าน, ซอย, ถนน"
                    />
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        จังหวัด <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.shipping_province}
                        onChange={(e) => setFormData({ ...formData, shipping_province: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                        placeholder="เช่น กรุงเทพมหานคร"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        เขต/อำเภอ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.shipping_district}
                        onChange={(e) => setFormData({ ...formData, shipping_district: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                        placeholder="เช่น วัฒนา"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รหัสไปรษณีย์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={formData.shipping_postal_code}
                      onChange={(e) => setFormData({ ...formData, shipping_postal_code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                      placeholder="10110"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      หมายเหตุ (ถ้ามี)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.customer_note}
                      onChange={(e) => setFormData({ ...formData, customer_note: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                      placeholder="เช่น ส่งช่วงเย็น, โทรก่อนส่ง"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button (Mobile) */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#7D735F] text-white rounded-lg font-medium hover:bg-[#6D6350] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังสั่งซื้อ...
                    </>
                  ) : (
                    <>
                      สั่งซื้อ ฿{cartTotal.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-lg font-semibold text-[#5A5A5A] mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#7D735F]" />
                สรุปคำสั่งซื้อ
              </h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.product_id} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[#5A5A5A] line-clamp-2">{item.name}</h4>
                      <p className="text-xs text-gray-500">฿{item.price.toLocaleString()} x {item.quantity}</p>
                      <p className="text-sm font-medium text-[#7D735F]">฿{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ลบ
                      </button>
                      <div className="flex items-center border rounded">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-sm"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ยอดรวม</span>
                  <span>฿{cartSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ค่าจัดส่ง</span>
                  <span>{shippingFee === 0 ? 'ฟรี' : `฿${shippingFee.toLocaleString()}`}</span>
                </div>
                {shippingFee > 0 && (
                  <p className="text-xs text-gray-500">
                    สั่งซื้อ ฿1,000 ขึ้นไป ส่งฟรี! (เหลืออีก ฿{(1000 - cartSubtotal).toLocaleString()})
                  </p>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span className="text-[#5A5A5A]">ยอดสุทธิ</span>
                  <span className="text-[#7D735F]">฿{cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Button (Desktop) */}
              <div className="hidden lg:block mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-[#7D735F] text-white rounded-lg font-medium hover:bg-[#6D6350] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังสั่งซื้อ...
                    </>
                  ) : (
                    <>
                      สั่งซื้อ
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    หลังสั่งซื้อ กรุณาส่งข้อความยืนยันผ่าน LINE Official ของเรา
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
