-- Add 'grab_wallet' to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'grab_wallet';

-- Add sales_order_id to grab_orders to link to main orders table
ALTER TABLE public.grab_orders
ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.orders(id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
