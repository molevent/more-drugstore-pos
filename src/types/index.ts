// Re-export all types from database.ts
export * from './database'

// Legacy type aliases for backward compatibility
import type { Product as DBProduct } from './database'

// Backward compatible Product type
export interface LegacyProduct {
  id: string
  barcode: string
  name: string
  name_en?: string
  description?: string
  price: number
  cost: number
  stock: number
  min_stock: number
  category: string
  is_drug: boolean
  drug_info?: {
    generic_name?: string
    dosage?: string
    usage?: string
    side_effects?: string
    warnings?: string
    symptoms?: string[]
  }
  created_at: string
  updated_at: string
}

// Helper function to convert new Product to legacy format
export function toLegacyProduct(product: DBProduct): LegacyProduct {
  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name_th,
    name_en: product.name_en,
    description: product.description_th,
    price: product.base_price,
    cost: product.cost_price,
    stock: product.stock_quantity,
    min_stock: product.min_stock_level,
    category: product.category_id || '',
    is_drug: false, // Will be determined by drug_info presence
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
}
