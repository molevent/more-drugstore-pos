import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { 
  ShoppingCart, 
  Search, 
  Menu, 
  X,
  Package,
  Phone,
  MapPin
} from 'lucide-react'

interface Product {
  id: string
  name_th: string
  name_en: string
  description_th: string | null
  base_price: number
  stock_quantity: number
  image_url: string | null
  unit: string
  category_id: string | null
}

interface Category {
  id: string
  name_th: string
  name_en: string
}

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  stock: number
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('storefront_cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Error parsing cart:', e)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('storefront_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [selectedCategory])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('stock_quantity', 0) // Only show products with stock
        .order('name_th', { ascending: true })

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching products:', error)
        return
      }

      setProducts(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name_th', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      setCategories(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id)
    
    if (existingItem) {
      // Check stock limit
      if (existingItem.quantity >= product.stock_quantity) {
        alert(`สินค้า ${product.name_th} มีจำนวนจำกัด ไม่สามารถเพิ่มได้อีก`)
        return
      }
      
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name_th,
        price: product.base_price,
        quantity: 1,
        image_url: product.image_url,
        stock: product.stock_quantity
      }])
    }
    
    setShowCart(true)
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find(i => i.product_id === productId)
    if (!item) return
    
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    // Check stock limit
    if (newQuantity > item.stock) {
      alert(`สินค้า ${item.name} มีจำนวนจำกัด (${item.stock} ชิ้น)`)
      return
    }
    
    setCart(cart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const filteredProducts = products.filter(product => 
    searchQuery === '' || 
    product.name_th.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description_th && product.description_th.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/store" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#7D735F] rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="font-semibold text-xl text-[#5A5A5A] hidden sm:block">
                More Drugstore
              </span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาสินค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7D735F]/20 focus:border-[#7D735F] outline-none"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Cart Button */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-6 h-6 text-[#5A5A5A]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-[#5A5A5A]" />
                ) : (
                  <Menu className="w-6 h-6 text-[#5A5A5A]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Categories */}
          <aside className={`lg:w-64 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold text-[#5A5A5A] mb-4">หมวดหมู่สินค้า</h2>
              <nav className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === null 
                      ? 'bg-[#7D735F]/10 text-[#7D735F] font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ทั้งหมด
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.id 
                        ? 'bg-[#7D735F]/10 text-[#7D735F] font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {category.name_th}
                  </button>
                ))}
              </nav>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <h2 className="font-semibold text-[#5A5A5A] mb-4">ติดต่อเรา</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>02-xxx-xxxx</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>ร้าน More Drugstore</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Banner */}
            <div className="bg-gradient-to-r from-[#7D735F] to-[#9D9380] rounded-lg p-6 mb-6 text-white">
              <h1 className="text-2xl font-bold mb-2">ยินดีต้อนรับสู่ More Drugstore</h1>
              <p className="text-white/80">สั่งซื้อสินค้าออนไลน์ ส่งตรงถึงมือคุณ</p>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ไม่พบสินค้า</p>
                {searchQuery && (
                  <button
                    onClick={() => {setSearchQuery(''); setSelectedCategory(null)}}
                    className="mt-2 text-[#7D735F] hover:underline"
                  >
                    ล้างการค้นหา
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Product Image */}
                    <Link to={`/store/product/${product.id}`} className="block aspect-square bg-gray-100 relative">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name_th}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-12 h-12" />
                        </div>
                      )}
                      {product.stock_quantity <= 5 && (
                        <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                          เหลือ {product.stock_quantity} ชิ้น
                        </span>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="p-3">
                      <Link to={`/store/product/${product.id}`}>
                        <h3 className="font-medium text-[#5A5A5A] text-sm line-clamp-2 hover:text-[#7D735F] transition-colors">
                          {product.name_th}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">{product.unit}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-semibold text-[#7D735F]">
                          ฿{product.base_price.toLocaleString()}
                        </span>
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stock_quantity === 0}
                          className="p-2 bg-[#7D735F] text-white rounded-lg hover:bg-[#6D6350] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-[#5A5A5A] text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                ตะกร้าสินค้า
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">ตะกร้าว่างเปล่า</p>
                  <button
                    onClick={() => setShowCart(false)}
                    className="mt-4 text-[#7D735F] hover:underline"
                  >
                    กลับไปเลือกสินค้า
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                      {/* Image */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[#5A5A5A] text-sm line-clamp-2">{item.name}</h4>
                        <p className="text-[#7D735F] font-medium mt-1">฿{item.price.toLocaleString()}</p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white border rounded hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white border rounded hover:bg-gray-50"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1">รวม: ฿{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>รวมทั้งหมด</span>
                  <span className="text-[#7D735F]">฿{cartTotal.toLocaleString()}</span>
                </div>
                <Link
                  to="/store/checkout"
                  onClick={() => setShowCart(false)}
                  className="block w-full py-3 bg-[#7D735F] text-white text-center rounded-lg hover:bg-[#6D6350] transition-colors font-medium"
                >
                  ดำเนินการสั่งซื้อ
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
