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
  // 1. ข้อมูลการระบุตัวตน (Identification)
  barcode: string
  sku: string
  name_th: string
  name_en: string
  product_type: 'finished_goods' | 'service'
  brand?: string
  is_active: boolean
  
  // 2. หมวดหมู่และการจัดกลุ่ม (Categorization)
  category_id?: string
  tags?: string[]
  indications?: string
  usage_instructions?: string
  active_ingredient?: string
  internal_notes?: string
  description_th?: string
  description_en?: string
  
  // 3. การตั้งราคาและบัญชี (Financials)
  base_price: number
  cost_price: number
  purchase_price_excl_vat?: number
  cost_per_unit?: number
  selling_price_excl_vat?: number
  selling_price_incl_vat?: number
  original_price?: number
  wholesale_price?: number
  unit: string
  
  // 4. การจัดการสต็อก (Inventory & Tracking)
  stock_quantity: number
  min_stock_level: number
  opening_stock_date?: string
  expiry_date?: string
  lot_number?: string
  packaging_size?: string
  
  // 5. โลจิสติกส์และรูปภาพ (Logistics & Media)
  weight_grams?: number
  width_cm?: number
  length_cm?: number
  height_cm?: number
  image_url?: string
  image_urls?: string[]
  
  // 6. ช่องทางการขาย (Sales Channels)
  sell_on_pos: boolean
  sell_on_grab: boolean
  sell_on_lineman: boolean
  sell_on_lazada: boolean
  sell_on_shopee: boolean
  sell_on_line_shopping: boolean
  sell_on_tiktok: boolean
  sell_on_consignment: boolean
  sell_on_website: boolean
  
  // 6.1 ราคาขายแยกตามช่องทาง (Channel-specific Prices)
  price_pos?: number
  price_grab?: number
  price_lineman?: number
  price_lazada?: number
  price_shopee?: number
  price_line_shopping?: number
  price_tiktok?: number
  price_consignment?: number
  price_website?: number
  
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
