-- Migration: Add payment_status column to purchase_orders table
-- This enables marking POs as paid/unpaid/partial

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid';
    END IF;
END $$;

-- Update existing records to have default value
UPDATE purchase_orders SET payment_status = 'unpaid' WHERE payment_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN purchase_orders.payment_status IS 'Payment status: unpaid, partial, or paid';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
