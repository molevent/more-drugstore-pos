-- ============================================================================
-- MIGRATION: Add admin RLS policies for web_orders and web_order_items
-- ให้ admin สามารถอ่านและแก้ไข web orders ได้
-- ============================================================================

-- ============================================================================
-- RLS POLICY: Allow admin full access to web_orders
-- ============================================================================
CREATE POLICY "Allow admin full access to web orders"
  ON public.web_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin%'
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin%'
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- RLS POLICY: Allow admin full access to web_order_items  
-- ============================================================================
CREATE POLICY "Allow admin full access to web order items"
  ON public.web_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin%'
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin%'
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- Alternative: Allow authenticated users to update web orders (simpler approach)
-- ============================================================================
-- ถ้าแบบด้านบนซับซ้อนเกินไป ใช้แบบนี้แทน:
DROP POLICY IF EXISTS "Allow admin full access to web orders" ON public.web_orders;
DROP POLICY IF EXISTS "Allow admin full access to web order items" ON public.web_order_items;

-- Allow any authenticated user to view web orders
CREATE POLICY "Allow authenticated users to view web orders"
  ON public.web_orders FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow any authenticated user to update web orders  
CREATE POLICY "Allow authenticated users to update web orders"
  ON public.web_orders FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow any authenticated user to view web order items
CREATE POLICY "Allow authenticated users to view web order items"
  ON public.web_order_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow any authenticated user to update web order items
CREATE POLICY "Allow authenticated users to update web order items"
  ON public.web_order_items FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- NOTIFY
-- ============================================================================
NOTIFY pgrst, 'reload schema';
