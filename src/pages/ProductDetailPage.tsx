import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { 
  ShoppingCart, 
  ArrowLeft, 
  Package,
  Minus,
  Plus,
  Check,
  AlertCircle,
  AlertTriangle
} from 'lucide-react'

interface Product {
  id: string
  name_th: string
  name_en: string
  description_th: string | null
  description_en: string | null
  base_price: number
  stock_quantity: number
  image_url: string | null
  unit: string
  category_id: string | null
  barcode: string
  sku: string
  alert_custom?: boolean
  alert_custom_title?: string
}

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  stock: number
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [addedToCart, setAddedToCart] = useState(false)
  const [controlledCategoryIds, setControlledCategoryIds] = useState<Set<string>>(new Set())
  const [allCategories, setAllCategories] = useState<any[]>([])

  // Load cart from localStorage
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

  useEffect(() => {
    if (id) {
      fetchProduct()
    }
    fetchCategories()
  }, [id])

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name_th, parent_id')
      const allCats = data || []
      setAllCategories(allCats)
      const controlledParents = allCats.filter((c: any) =>
        c.name_th?.includes('ควบคุม') || c.name_th?.includes('Prescription')
      )
      const controlledIds = new Set<string>()
      const addDescendants = (parentId: string) => {
        controlledIds.add(parentId)
        allCats.filter((c: any) => c.parent_id === parentId).forEach((child: any) => {
          addDescendants(child.id)
        })
      }
      controlledParents.forEach((cp: any) => addDescendants(cp.id))
      setControlledCategoryIds(controlledIds)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching product:', error)
        return
      }

      setProduct(data)
      
      // Check if already in cart and set quantity
      const savedCart = localStorage.getItem('storefront_cart')
      if (savedCart) {
        const parsed = JSON.parse(savedCart)
        const existing = parsed.find((item: CartItem) => item.product_id === id)
        if (existing) {
          setQuantity(existing.quantity)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('storefront_cart', JSON.stringify(newCart))
  }

  const addToCart = () => {
    if (!product) return

    if (quantity > product.stock_quantity) {
      alert(`สินค้ามีจำนวนจำกัด ไม่สามารถเพิ่มเกิน ${product.stock_quantity} ชิ้น`)
      return
    }

    const existingItemIndex = cart.findIndex(item => item.product_id === product.id)
    let newCart: CartItem[]

    if (existingItemIndex >= 0) {
      newCart = cart.map((item, index) => 
        index === existingItemIndex 
          ? { ...item, quantity }
          : item
      )
    } else {
      newCart = [...cart, {
        product_id: product.id,
        name: product.name_th,
        price: product.base_price,
        quantity,
        image_url: product.image_url,
        stock: product.stock_quantity
      }]
    }

    updateCart(newCart)
    setAddedToCart(true)
    
    setTimeout(() => {
      setAddedToCart(false)
    }, 2000)
  }

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  const increaseQuantity = () => {
    if (product && quantity < product.stock_quantity) {
      setQuantity(quantity + 1)
    }
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Compute controlled medicine status
  const isControlled = (() => {
    if (!product) return false
    const isInControlledCategory = !!(product.category_id && controlledCategoryIds.has(product.category_id))
    const hasControlledAlert = !!(product.alert_custom && product.alert_custom_title?.includes('ควบคุม'))
    let ancestorIsControlled = false
    if (product.category_id && !isInControlledCategory) {
      let currentId: string | null = product.category_id
      const visited = new Set<string>()
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const cat = allCategories.find((c: any) => c.id === currentId)
        if (cat && (cat.name_th?.includes('ควบคุม') || cat.name_th?.includes('Prescription'))) {
          ancestorIsControlled = true
          break
        }
        currentId = cat?.parent_id || null
      }
    }
    return isInControlledCategory || hasControlledAlert || ancestorIsControlled
  })()

  if (loading) {
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
                <span className="font-semibold text-xl text-[#5A5A5A]">More Drugstore</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">ไม่พบสินค้า</h2>
          <p className="text-gray-500 mb-4">สินค้านี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
          <Link 
            to="/store" 
            className="inline-flex items-center gap-2 text-[#7D735F] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าร้านค้า
          </Link>
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

            <div className="flex items-center gap-4">
              <Link 
                to="/store/cart"
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-6 h-6 text-[#5A5A5A]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link 
          to="/store" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#7D735F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าร้านค้า
        </Link>
      </div>

      {/* Product Detail */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-6">
            {/* Product Image */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name_th}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Package className="w-24 h-24" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#5A5A5A] mb-2">{product.name_th}</h1>
                <p className="text-gray-500 mb-4">{product.name_en}</p>
                
                {isControlled ? (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-700">ยาควบคุม</p>
                      <p className="text-sm text-amber-600">โปรดติดต่อเภสัชกร เพื่อสอบถามราคาและความพร้อมจำหน่าย</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#7D735F] mb-6">
                      ฿{product.base_price.toLocaleString()}
                      <span className="text-base font-normal text-gray-500"> / {product.unit}</span>
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center gap-2 mb-6">
                      {product.stock_quantity > 0 ? (
                        product.stock_quantity <= 5 ? (
                          <>
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            <span className="text-orange-600">เหลือ {product.stock_quantity} ชิ้น</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-green-600">มีสินค้า ({product.stock_quantity} ชิ้น)</span>
                          </>
                        )
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-600">สินค้าหมด</span>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Description */}
                {product.description_th && (
                  <div className="mb-6">
                    <h3 className="font-medium text-[#5A5A5A] mb-2">รายละเอียด</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{product.description_th}</p>
                  </div>
                )}

                {/* SKU & Barcode */}
                <div className="text-sm text-gray-500 space-y-1 mb-6">
                  <p>SKU: {product.sku}</p>
                  <p>Barcode: {product.barcode}</p>
                </div>
              </div>

              {/* Add to Cart */}
              {product.stock_quantity > 0 && !isControlled && (
                <div className="space-y-4">
                  {/* Quantity Selector */}
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">จำนวน:</span>
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={decreaseQuantity}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium">{quantity}</span>
                      <button
                        onClick={increaseQuantity}
                        disabled={quantity >= product.stock_quantity}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="flex gap-3">
                    <button
                      onClick={addToCart}
                      className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        addedToCart 
                          ? 'bg-green-500 text-white' 
                          : 'bg-[#7D735F] text-white hover:bg-[#6D6350]'
                      }`}
                    >
                      {addedToCart ? (
                        <>
                          <Check className="w-5 h-5" />
                          เพิ่มลงตะกร้าแล้ว
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          เพิ่มลงตะกร้า
                        </>
                      )}
                    </button>
                    
                    <Link
                      to="/store/checkout"
                      onClick={() => {
                        if (!addedToCart) addToCart()
                      }}
                      className="flex-1 py-3 px-6 bg-[#5A5A5A] text-white rounded-lg font-medium hover:bg-[#4A4A4A] transition-colors text-center"
                    >
                      สั่งซื้อเลย
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
