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
      // Fetch all products (Supabase defaults to 1000 row limit)
      const allProducts: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: page, error: pageError } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(id, name_th, name_en)
          `)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1)
        
        if (pageError) throw pageError
        
        if (page && page.length > 0) {
          allProducts.push(...page)
          from += pageSize
          hasMore = page.length === pageSize
        } else {
          hasMore = false
        }
      }
      
      console.log('Fetched products:', allProducts.length)
      set({ products: allProducts, loading: false })
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
