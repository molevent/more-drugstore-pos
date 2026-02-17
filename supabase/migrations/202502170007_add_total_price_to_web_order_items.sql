-- ============================================================================
-- MIGRATION: Add total_price to web_order_items
-- ทำให้ชื่อฟิลด์สอดคล้องกับ order_items ที่มี total_price
-- ============================================================================

-- Add total_price column (nullable initially)
ALTER TABLE public.web_order_items
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2);

-- Update existing rows: copy subtotal to total_price
UPDATE public.web_order_items
SET total_price = subtotal
WHERE total_price IS NULL;

-- Make it not null with default
ALTER TABLE public.web_order_items
ALTER COLUMN total_price SET NOT NULL,
ALTER COLUMN total_price SET DEFAULT 0;

-- ============================================================================
-- Update function to include total_price when deducting stock
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_stock_on_web_order_confirm()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  available_stock INTEGER;
BEGIN
  -- Only process when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Check and deduct stock for each item
    FOR item IN 
      SELECT * FROM web_order_items WHERE web_order_id = NEW.id
    LOOP
      -- Get available stock
      SELECT stock_quantity INTO available_stock
      FROM products WHERE id = item.product_id;
      
      IF available_stock < item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product: %', item.product_name;
      END IF;
      
      -- Insert stock movement (sale)
      INSERT INTO stock_movements (
        product_id,
        movement_type,
        quantity,
        quantity_before,
        quantity_after,
        unit_cost,
        total_cost,
        reference_type,
        reference_id,
        reason,
        movement_date
      ) VALUES (
        item.product_id,
        'sale',
        -item.quantity,
        available_stock,
        available_stock - item.quantity,
        item.unit_price,
        COALESCE(item.total_price, item.subtotal), -- Use total_price if available
        'web_order',
        NEW.id,
        'Web order #' || NEW.order_number,
        NOW()
      );
      
      -- Update product stock
      UPDATE products 
      SET stock_quantity = stock_quantity - item.quantity,
          updated_at = NOW()
      WHERE id = item.product_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Sync total_price with subtotal
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_web_order_item_total_price()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price = NEW.subtotal;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_total_price ON public.web_order_items;

CREATE TRIGGER trigger_sync_total_price
BEFORE INSERT OR UPDATE ON public.web_order_items
FOR EACH ROW
EXECUTE FUNCTION sync_web_order_item_total_price();

-- ============================================================================
-- NOTIFY
-- ============================================================================
NOTIFY pgrst, 'reload schema';
