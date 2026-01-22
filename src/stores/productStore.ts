import { create } from 'zustand'
import { Product } from '../types'
import { supabase } from '../services/supabase'

interface ProductState {
  products: Product[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  fetchProducts: () => Promise<void>
  getProductByBarcode: (barcode: string) => Product | undefined
  getFilteredProducts: () => Product[]
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  searchTerm: '',
  
  setSearchTerm: (term) => set({ searchTerm: term }),
  
  fetchProducts: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name_th, name_en)
        `)
        .order('name_th')
      
      if (error) {
        console.error('Error fetching products:', error)
        throw error
      }
      
      console.log('Fetched products:', data)
      set({ products: data || [], loading: false })
    } catch (error) {
      console.error('Error fetching products:', error)
      set({ loading: false })
    }
  },
  
  getProductByBarcode: (barcode) => {
    return get().products.find(p => p.barcode === barcode)
  },
  
  getFilteredProducts: () => {
    const { products, searchTerm } = get()
    if (!searchTerm) return products
    
    const term = searchTerm.toLowerCase()
    return products.filter(
      p =>
        p.name_th.toLowerCase().includes(term) ||
        p.name_en?.toLowerCase().includes(term) ||
        p.barcode.includes(term)
    )
  },
}))
