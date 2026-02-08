-- Add alert columns to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products
ADD COLUMN IF NOT EXISTS alert_custom BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alert_custom_title TEXT,
ADD COLUMN IF NOT EXISTS alert_custom_message TEXT,
ADD COLUMN IF NOT EXISTS alert_out_of_stock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alert_out_of_stock_message TEXT,
ADD COLUMN IF NOT EXISTS alert_low_stock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alert_low_stock_message TEXT,
ADD COLUMN IF NOT EXISTS alert_expiry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alert_expiry_message TEXT,
ADD COLUMN IF NOT EXISTS alert_expiry_days INTEGER DEFAULT 30;

-- Add comments for documentation
COMMENT ON COLUMN products.alert_custom IS 'Enable custom alert for this product';
COMMENT ON COLUMN products.alert_custom_title IS 'Title for custom alert';
COMMENT ON COLUMN products.alert_custom_message IS 'Message for custom alert';
COMMENT ON COLUMN products.alert_out_of_stock IS 'Enable alert when stock is 0';
COMMENT ON COLUMN products.alert_out_of_stock_message IS 'Custom message for out of stock alert';
COMMENT ON COLUMN products.alert_low_stock IS 'Enable alert when stock is low';
COMMENT ON COLUMN products.alert_low_stock_message IS 'Custom message for low stock alert';
COMMENT ON COLUMN products.alert_expiry IS 'Enable alert when product is near expiry';
COMMENT ON COLUMN products.alert_expiry_message IS 'Custom message for expiry alert';
COMMENT ON COLUMN products.alert_expiry_days IS 'Days before expiry to show alert';
