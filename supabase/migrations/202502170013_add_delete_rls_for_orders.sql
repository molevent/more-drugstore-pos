-- Add DELETE RLS policies for orders and order_items tables
-- This fixes the issue where POS orders cannot be deleted

-- Enable RLS if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policies if they exist
DROP POLICY IF EXISTS "orders_delete_policy" ON orders;
DROP POLICY IF EXISTS "order_items_delete_policy" ON order_items;

-- Create delete policies for authenticated users
CREATE POLICY "orders_delete_policy" ON orders
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "order_items_delete_policy" ON order_items
  FOR DELETE TO authenticated USING (true);
