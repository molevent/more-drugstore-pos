-- Fix RLS policies to allow deletion for web_orders and web_order_items
-- Disable RLS temporarily for testing

ALTER TABLE web_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE web_order_items DISABLE ROW LEVEL SECURITY;

-- Re-enable with proper policies
ALTER TABLE web_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_order_items ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "web_orders_select_policy" ON web_orders;
DROP POLICY IF EXISTS "web_orders_insert_policy" ON web_orders;
DROP POLICY IF EXISTS "web_orders_update_policy" ON web_orders;
DROP POLICY IF EXISTS "web_orders_delete_policy" ON web_orders;
DROP POLICY IF EXISTS "web_order_items_select_policy" ON web_order_items;
DROP POLICY IF EXISTS "web_order_items_insert_policy" ON web_order_items;
DROP POLICY IF EXISTS "web_order_items_update_policy" ON web_order_items;
DROP POLICY IF EXISTS "web_order_items_delete_policy" ON web_order_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete web orders" ON web_orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete web order items" ON web_order_items;

-- Create permissive policies
CREATE POLICY "web_orders_select_policy" ON web_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "web_orders_insert_policy" ON web_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "web_orders_update_policy" ON web_orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "web_orders_delete_policy" ON web_orders
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "web_order_items_select_policy" ON web_order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "web_order_items_insert_policy" ON web_order_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "web_order_items_update_policy" ON web_order_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "web_order_items_delete_policy" ON web_order_items
  FOR DELETE TO authenticated USING (true);
