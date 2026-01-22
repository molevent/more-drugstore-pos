-- More Drug Store - Complete Database Schema
-- Migration: 001_initial_schema
-- Created: 2026-01-22

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'pharmacist', 'cashier');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'credit_card', 'promptpay');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE alert_type AS ENUM ('low', 'out');

-- ============================================================================
-- TABLE: users (extends auth.users)
-- ============================================================================

CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  avatar_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Extended user profiles linked to Supabase Auth';

-- ============================================================================
-- TABLE: categories
-- ============================================================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.categories IS 'Product categories with hierarchical support';

-- ============================================================================
-- TABLE: products
-- ============================================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode VARCHAR(50) NOT NULL UNIQUE,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_th TEXT,
  description_en TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_level >= 0),
  unit VARCHAR(50) NOT NULL DEFAULT 'ชิ้น',
  image_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.products IS 'Product catalog with pricing and inventory';

-- ============================================================================
-- TABLE: drug_info
-- ============================================================================

CREATE TABLE public.drug_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  active_ingredients TEXT NOT NULL,
  dosage TEXT NOT NULL,
  side_effects TEXT,
  contraindications TEXT,
  usage_instructions_th TEXT NOT NULL,
  usage_instructions_en TEXT NOT NULL,
  warnings TEXT,
  storage_info TEXT
);

COMMENT ON TABLE public.drug_info IS 'Detailed pharmaceutical information for drug products';

-- ============================================================================
-- TABLE: symptoms
-- ============================================================================

CREATE TABLE public.symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE public.symptoms IS 'Medical symptoms for product recommendations';

-- ============================================================================
-- TABLE: product_symptoms (Many-to-Many)
-- ============================================================================

CREATE TABLE public.product_symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  symptom_id UUID NOT NULL REFERENCES public.symptoms(id) ON DELETE CASCADE,
  relevance_score INTEGER NOT NULL DEFAULT 50 CHECK (relevance_score BETWEEN 1 AND 100),
  UNIQUE(product_id, symptom_id)
);

COMMENT ON TABLE public.product_symptoms IS 'Links products to symptoms they treat';

-- ============================================================================
-- TABLE: platforms
-- ============================================================================

CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.platforms IS 'Sales platforms (Walk-in, Shopee, Lazada, LINE, etc.)';

-- ============================================================================
-- TABLE: platform_prices
-- ============================================================================

CREATE TABLE public.platform_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, platform_id)
);

COMMENT ON TABLE public.platform_prices IS 'Platform-specific pricing for products';

-- ============================================================================
-- TABLE: orders
-- ============================================================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  platform_id UUID NOT NULL REFERENCES public.platforms(id),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_tax_id VARCHAR(20),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  zortout_synced BOOLEAN NOT NULL DEFAULT false,
  zortout_order_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.orders IS 'Sales orders from all platforms';

-- ============================================================================
-- TABLE: order_items
-- ============================================================================

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  label_printed BOOLEAN NOT NULL DEFAULT false,
  label_printed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.order_items IS 'Line items for each order';

-- ============================================================================
-- TABLE: stock_alerts
-- ============================================================================

CREATE TABLE public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  current_stock INTEGER NOT NULL,
  min_stock_level INTEGER NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.stock_alerts IS 'Low stock and out-of-stock alerts';

-- ============================================================================
-- TABLE: daily_reports
-- ============================================================================

CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL UNIQUE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_items_sold INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  transfer_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  card_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.daily_reports IS 'Daily sales and financial reports';

-- ============================================================================
-- TABLE: zortout_config
-- ============================================================================

CREATE TABLE public.zortout_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key TEXT NOT NULL,
  store_id VARCHAR(100) NOT NULL,
  webhook_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.zortout_config IS 'ZortOut integration configuration';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Products indexes
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_stock_quantity ON public.products(stock_quantity);

-- Orders indexes
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_platform_id ON public.orders(platform_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- Platform prices indexes
CREATE INDEX idx_platform_prices_product_platform ON public.platform_prices(product_id, platform_id);

-- Stock alerts indexes
CREATE INDEX idx_stock_alerts_product_id ON public.stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_is_resolved ON public.stock_alerts(is_resolved);
CREATE INDEX idx_stock_alerts_created_at ON public.stock_alerts(created_at DESC);

-- Product symptoms indexes
CREATE INDEX idx_product_symptoms_product_id ON public.product_symptoms(product_id);
CREATE INDEX idx_product_symptoms_symptom_id ON public.product_symptoms(symptom_id);

-- Daily reports indexes
CREATE INDEX idx_daily_reports_report_date ON public.daily_reports(report_date DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
  new_order_number TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 14) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.orders
  WHERE order_number LIKE 'ORD-' || date_part || '-%';
  
  new_order_number := 'ORD-' || date_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  NEW.order_number := new_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Check and create stock alerts
CREATE OR REPLACE FUNCTION check_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create alert if stock is low or out
  IF NEW.stock_quantity = 0 THEN
    INSERT INTO public.stock_alerts (product_id, alert_type, current_stock, min_stock_level)
    VALUES (NEW.id, 'out', NEW.stock_quantity, NEW.min_stock_level)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.stock_quantity <= NEW.min_stock_level THEN
    INSERT INTO public.stock_alerts (product_id, alert_type, current_stock, min_stock_level)
    VALUES (NEW.id, 'low', NEW.stock_quantity, NEW.min_stock_level)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update stock after order
CREATE OR REPLACE FUNCTION update_stock_after_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at on users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Generate order number
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Trigger: Check stock alerts
CREATE TRIGGER stock_alert_trigger
  AFTER INSERT OR UPDATE OF stock_quantity ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_alert();

-- Trigger: Update stock after order item created
CREATE TRIGGER update_stock_trigger
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_order();
