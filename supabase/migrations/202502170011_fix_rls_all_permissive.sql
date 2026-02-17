-- Fix RLS for web_orders and web_order_items to allow full CRUD

-- First, check if RLS is enabled
ALTER TABLE web_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate with full permissions
DROP POLICY IF EXISTS "Allow authenticated users to delete web orders" ON web_orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete web order items" ON web_order_items;
DROP POLICY IF EXISTS "web_orders_select_policy" ON web_orders;
DROP POLICY IF EXISTS "web_orders_insert_policy" ON web_orders;
DROP POLICY IF EXISTS "web_orders_update_policy" ON web_orders;
DROP POLICY IF EXISTS "web_orders_delete_policy" ON web_orders;
DROP POLICY IF EXISTS "web_order_items_select_policy" ON web_order_items;
DROP POLICY IF EXISTS "web_order_items_insert_policy" ON web_order_items;
DROP POLICY IF EXISTS "web_order_items_update_policy" ON web_order_items;
DROP POLICY IF EXISTS "web_order_items_delete_policy" ON web_order_items;

-- Create new policies with full access for authenticated users
CREATE POLICY "web_orders_select_policy" ON web_orders
  FOR SELECT USING (true);

CREATE POLICY "web_orders_insert_policy" ON web_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "web_orders_update_policy" ON web_orders
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "web_orders_delete_policy" ON web_orders
  FOR DELETE USING (true);

CREATE POLICY "web_order_items_select_policy" ON web_order_items
  FOR SELECT USING (true);

CREATE POLICY "web_order_items_insert_policy" ON web_order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "web_order_items_update_policy" ON web_order_items
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "web_order_items_delete_policy" ON web_order_items
  FOR DELETE USING (true);
