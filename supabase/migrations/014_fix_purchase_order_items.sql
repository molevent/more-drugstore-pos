-- Fix: Add missing columns to purchase_order_items if they don't exist
-- This fixes "Could not find the 'discount_amount' column" error

-- Add discount_amount column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN discount_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
END $$;

-- Add tax_amount column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN tax_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
END $$;

-- Add received_quantity column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name = 'received_quantity'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN received_quantity INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add notes column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE purchase_order_items ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Recreate the calculate_po_totals trigger to ensure it works correctly
DROP TRIGGER IF EXISTS trigger_calculate_po_totals ON purchase_order_items;

CREATE OR REPLACE FUNCTION calculate_po_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate totals for the purchase order
    UPDATE purchase_orders
    SET 
        total_amount = (
            SELECT COALESCE(SUM(total_amount), 0) 
            FROM purchase_order_items 
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_po_totals
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_po_totals();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
