import { create } from 'zustand'
import { CartItem, Product } from '../types'

// Sales channel type
export type SalesChannel = 'walk-in' | 'grab' | 'shopee' | 'lineman' | 'lazada' | 'line_shopping' | 'tiktok' | 'website'

// Helper function to get product price based on sales channel
export const getProductPriceForChannel = (product: Product, channel: SalesChannel): number => {
  switch (channel) {
    case 'walk-in':
      return product.price_pos ?? product.base_price
    case 'grab':
      return product.price_grab ?? product.base_price
    case 'shopee':
      return product.price_shopee ?? product.base_price
    case 'lineman':
      return product.price_lineman ?? product.base_price
    case 'lazada':
      return product.price_lazada ?? product.base_price
    case 'line_shopping':
      return product.price_line_shopping ?? product.base_price
    case 'tiktok':
      return product.price_tiktok ?? product.base_price
    case 'website':
      return product.price_website ?? product.base_price
    default:
      return product.base_price
  }
}

interface CartState {
  items: CartItem[]
  salesChannel: SalesChannel
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateDiscount: (productId: string, discount: number) => void
  setItems: (items: CartItem[]) => void
  clearCart: () => void
  setSalesChannel: (channel: SalesChannel) => void
  getTotal: () => number
  getSubtotal: () => number
  getTotalDiscount: () => number
  getProductPrice: (product: Product) => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  salesChannel: 'walk-in',
  
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
    // Prevent negative quantities - minimum is 1
    if (quantity < 1 || isNaN(quantity)) {
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
  
  setItems: (items) => set({ items }),
  
  clearCart: () => set({ items: [], salesChannel: 'walk-in' }),
  
  setSalesChannel: (channel) => set({ salesChannel: channel }),
  
  getProductPrice: (product) => {
    return getProductPriceForChannel(product, get().salesChannel)
  },
  
  getSubtotal: () => {
    const channel = get().salesChannel
    return get().items.reduce(
      (sum, item) => sum + getProductPriceForChannel(item.product, channel) * item.quantity,
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
