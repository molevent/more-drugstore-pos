-- Migration: Modify trigger to skip alerts for opening_balance movements
-- Created: 2026-02-12

-- Modify trigger function to skip alert creation for opening_balance
CREATE OR REPLACE FUNCTION update_product_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- อัพเดตจำนวนสต็อกหลัก
  UPDATE products 
  SET stock_quantity = NEW.quantity_after,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  -- ตรวจสอบการแจ้งเตือนสต็อกต่ำ (skip for opening_balance)
  IF NEW.movement_type != 'opening_balance' THEN
    PERFORM check_low_stock_alert(NEW.product_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_product_stock_on_movement() IS 'Updates product stock after movement. Skips alert creation for opening_balance type.';
