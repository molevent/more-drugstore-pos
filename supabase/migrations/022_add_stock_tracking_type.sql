-- Migration to add stock_tracking_type column to products table
-- This column is required for the CSV import feature

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stock_tracking_type VARCHAR(20) DEFAULT 'tracked';

-- Add comment for documentation
COMMENT ON COLUMN public.products.stock_tracking_type IS 'Type of stock tracking: tracked, untracked, or service';

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
