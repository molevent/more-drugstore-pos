// More Drug Store - Database Types
// Auto-generated from Supabase schema

export type UserRole = 'admin' | 'pharmacist' | 'cashier'
export type PaymentMethod = 'cash' | 'transfer' | 'credit_card' | 'promptpay'
export type PaymentStatus = 'pending' | 'paid' | 'refunded'
export type AlertType = 'low' | 'out'

// ============================================================================
// DATABASE TABLES
// ============================================================================

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  language?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name_th: string
  name_en: string
  parent_id?: string
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  barcode: string
  sku: string
  name_th: string
  name_en: string
  description_th?: string
  description_en?: string
  category_id?: string
  base_price: number
  cost_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DrugInfo {
  id: string
  product_id: string
  active_ingredients: string
  dosage: string
  side_effects?: string
  contraindications?: string
  usage_instructions_th: string
  usage_instructions_en: string
  warnings?: string
  storage_info?: string
}

export interface Symptom {
  id: string
  name_th: string
  name_en: string
  description?: string
  is_active: boolean
}

export interface ProductSymptom {
  id: string
  product_id: string
  symptom_id: string
  relevance_score: number
}

export interface Platform {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
}

export interface PlatformPrice {
  id: string
  product_id: string
  platform_id: string
  price: number
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  platform_id: string
  customer_name?: string
  customer_phone?: string
  customer_tax_id?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  notes?: string
  zortout_synced: boolean
  zortout_order_id?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount: number
  total_price: number
  label_printed: boolean
  label_printed_at?: string
}

export interface StockAlert {
  id: string
  product_id: string
  alert_type: AlertType
  current_stock: number
  min_stock_level: number
  is_resolved: boolean
  created_at: string
  resolved_at?: string
  resolved_by?: string
}

export interface DailyReport {
  id: string
  report_date: string
  total_orders: number
  total_items_sold: number
  total_revenue: number
  total_cost: number
  total_profit: number
  total_tax: number
  cash_amount: number
  transfer_amount: number
  card_amount: number
  generated_at: string
  generated_by?: string
}

export interface ZortOutConfig {
  id: string
  api_key: string
  store_id: string
  webhook_url?: string
  is_active: boolean
  last_sync_at?: string
  updated_at: string
}

// ============================================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================================

export interface ProductWithDetails extends Product {
  category?: Category
  drug_info?: DrugInfo
  symptoms?: Array<Symptom & { relevance_score: number }>
  platform_prices?: PlatformPrice[]
}

export interface OrderWithDetails extends Order {
  user?: User
  platform?: Platform
  items?: OrderItemWithProduct[]
}

export interface OrderItemWithProduct extends OrderItem {
  product?: Product
}

export interface StockAlertWithProduct extends StockAlert {
  product?: Product
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateOrderRequest {
  platform_id: string
  customer_name?: string
  customer_phone?: string
  customer_tax_id?: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
    discount?: number
  }>
  payment_method: PaymentMethod
  notes?: string
}

export interface UpdateStockRequest {
  product_id: string
  quantity: number
  type: 'add' | 'subtract' | 'set'
}

export interface ProductSearchParams {
  query?: string
  category_id?: string
  is_active?: boolean
  has_stock?: boolean
  symptom_id?: string
}

export interface OrderSearchParams {
  start_date?: string
  end_date?: string
  platform_id?: string
  payment_status?: PaymentStatus
  user_id?: string
}

// ============================================================================
// CART TYPES (Frontend State)
// ============================================================================

export interface CartItem {
  product: Product
  quantity: number
  discount: number
  platform_price?: number
}

export interface Cart {
  items: CartItem[]
  platform_id: string
  customer_name?: string
  customer_phone?: string
  customer_tax_id?: string
  notes?: string
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface DashboardStats {
  today_sales: number
  today_orders: number
  total_products: number
  low_stock_count: number
  out_of_stock_count: number
}

export interface SalesStats {
  total_revenue: number
  total_orders: number
  total_items: number
  average_order_value: number
  by_payment_method: Record<PaymentMethod, number>
  by_platform: Record<string, number>
}
