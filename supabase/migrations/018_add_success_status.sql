-- Migration to add 'success' status to purchase_orders status check constraint
-- This fixes the error: violates check constraint "purchase_orders_status_check"

-- First, drop the existing constraint
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

-- Add new constraint with 'success' included
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled', 'success'));

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
