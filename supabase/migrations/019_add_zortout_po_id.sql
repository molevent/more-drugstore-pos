-- Migration to add zortout_po_id column to purchase_orders table
-- This stores the ZortOut PO ID to prevent duplicate creation

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS zortout_po_id VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_zortout_po_id 
ON purchase_orders(zortout_po_id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
