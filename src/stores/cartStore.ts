import { create } from 'zustand'
import { CartItem, Product } from '../types'

interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateDiscount: (productId: string, discount: number) => void
  clearCart: () => void
  getTotal: () => number
  getSubtotal: () => number
  getTotalDiscount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (product, quantity = 1) => {
    const items = get().items
    const existingItem = items.find(item => item.product.id === product.id)
    
    if (existingItem) {
      set({
        items: items.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      })
    } else {
      set({
        items: [...items, { product, quantity, discount: 0 }],
      })
    }
  },
  
  removeItem: (productId) => {
    set({
      items: get().items.filter(item => item.product.id !== productId),
    })
  },
  
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    
    set({
      items: get().items.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    })
  },
  
  updateDiscount: (productId, discount) => {
    set({
      items: get().items.map(item =>
        item.product.id === productId ? { ...item, discount } : item
      ),
    })
  },
  
  clearCart: () => set({ items: [] }),
  
  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.product.base_price * item.quantity,
      0
    )
  },
  
  getTotalDiscount: () => {
    return get().items.reduce((sum, item) => sum + item.discount, 0)
  },
  
  getTotal: () => {
    return get().getSubtotal() - get().getTotalDiscount()
  },
}))
