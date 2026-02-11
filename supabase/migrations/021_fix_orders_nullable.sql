-- Migration to fix order sync errors
-- Make required fields nullable for ZortOut imported orders

-- user_id: Make nullable for external orders
ALTER TABLE public.orders 
ALTER COLUMN user_id DROP NOT NULL;

-- platform_id: Make nullable for external orders  
ALTER TABLE public.orders 
ALTER COLUMN platform_id DROP NOT NULL;

-- payment_method: Make nullable for external orders
ALTER TABLE public.orders 
ALTER COLUMN payment_method DROP NOT NULL;

-- Add index for faster lookups on zortout_order_id
CREATE INDEX IF NOT EXISTS idx_orders_zortout_order_id 
ON public.orders(zortout_order_id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
