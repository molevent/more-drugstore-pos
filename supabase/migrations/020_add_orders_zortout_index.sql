-- Migration to add index on zortout_order_id for faster lookups
-- This fixes the 400/406 errors when syncing orders from ZortOut

-- Add index for zortout_order_id if not exists
CREATE INDEX IF NOT EXISTS idx_orders_zortout_order_id 
ON public.orders(zortout_order_id);

-- Also ensure the column allows NULL values properly
-- (It should already be VARCHAR(100) from initial schema)

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
