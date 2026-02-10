-- Migration: Add reference column to purchase_orders table
-- Stores invoice/tax invoice number for POs

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'reference'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN reference VARCHAR(100);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN purchase_orders.reference IS 'Invoice/Tax invoice number reference';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
