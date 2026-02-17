-- ============================================================================
-- MIGRATION: Fix RLS policies for web_order_items (allow read for authenticated)
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to view web order items" ON public.web_order_items;
DROP POLICY IF EXISTS "Allow authenticated users to update web order items" ON public.web_order_items;

-- Allow authenticated users to SELECT web order items
CREATE POLICY "Allow authenticated users to select web order items"
  ON public.web_order_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to INSERT web order items
CREATE POLICY "Allow authenticated users to insert web order items"
  ON public.web_order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to UPDATE web order items
CREATE POLICY "Allow authenticated users to update web order items"
  ON public.web_order_items FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to DELETE web order items
CREATE POLICY "Allow authenticated users to delete web order items"
  ON public.web_order_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- Also ensure web_orders has proper policies
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to view web orders" ON public.web_orders;
DROP POLICY IF EXISTS "Allow authenticated users to update web orders" ON public.web_orders;

CREATE POLICY "Allow authenticated users to select web orders"
  ON public.web_orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update web orders"
  ON public.web_orders FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete web orders"
  ON public.web_orders FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- NOTIFY
-- ============================================================================
NOTIFY pgrst, 'reload schema';
