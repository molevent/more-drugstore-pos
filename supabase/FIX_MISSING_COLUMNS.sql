-- ============================================================================
-- SQL Script: Add Missing Columns to Products Table
-- Run this in Supabase SQL Editor to fix schema cache errors
-- ============================================================================

-- Add all missing columns at once
ALTER TABLE products 
  -- Financial fields
  ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_price_excl_vat DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price_excl_vat DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price_incl_vat DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10,2) DEFAULT 0,
  
  -- Logistics fields
  ADD COLUMN IF NOT EXISTS weight_grams DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS width_cm DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS length_cm DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10,2),
  
  -- Inventory fields
  ADD COLUMN IF NOT EXISTS opening_stock_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS packaging_size VARCHAR(100),
  
  -- Categorization fields
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS indications TEXT,
  ADD COLUMN IF NOT EXISTS usage_instructions TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  
  -- Sales channels
  ADD COLUMN IF NOT EXISTS sell_on_pos BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sell_on_grab BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_lineman BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_lazada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_shopee BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_line_shopping BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_tiktok BOOLEAN DEFAULT false,
  
  -- Channel prices
  ADD COLUMN IF NOT EXISTS price_pos DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_grab DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_lineman DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_lazada DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_shopee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_line_shopping DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_tiktok DECIMAL(10,2) DEFAULT 0;

-- ============================================================================
-- Verify columns were added
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
