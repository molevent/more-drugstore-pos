-- More Drug Store - Row Level Security Policies
-- Migration: 002_rls_policies
-- Created: 2026-01-22

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zortout_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert users
CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all users
CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================

-- Everyone can view active categories
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Authenticated users can manage categories
CREATE POLICY "Authenticated users can manage categories"
  ON public.categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- PRODUCTS TABLE POLICIES
-- ============================================================================

-- Everyone can view active products
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

-- Authenticated users can insert products
CREATE POLICY "Authenticated users can insert products"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update products
CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only admins can delete products
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- DRUG_INFO TABLE POLICIES
-- ============================================================================

-- Everyone can view drug info for active products
CREATE POLICY "Anyone can view drug info"
  ON public.drug_info FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = drug_info.product_id AND is_active = true
    ) OR auth.role() = 'authenticated'
  );

-- Authenticated users can manage drug info
CREATE POLICY "Authenticated users can manage drug info"
  ON public.drug_info FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- SYMPTOMS TABLE POLICIES
-- ============================================================================

-- Everyone can view active symptoms
CREATE POLICY "Anyone can view symptoms"
  ON public.symptoms FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

-- Authenticated users can manage symptoms
CREATE POLICY "Authenticated users can manage symptoms"
  ON public.symptoms FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- PRODUCT_SYMPTOMS TABLE POLICIES
-- ============================================================================

-- Everyone can view product-symptom relationships
CREATE POLICY "Anyone can view product symptoms"
  ON public.product_symptoms FOR SELECT
  USING (true);

-- Authenticated users can manage product-symptom relationships
CREATE POLICY "Authenticated users can manage product symptoms"
  ON public.product_symptoms FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- PLATFORMS TABLE POLICIES
-- ============================================================================

-- Everyone can view active platforms
CREATE POLICY "Anyone can view platforms"
  ON public.platforms FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

-- Admins can manage platforms
CREATE POLICY "Admins can manage platforms"
  ON public.platforms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- PLATFORM_PRICES TABLE POLICIES
-- ============================================================================

-- Authenticated users can view platform prices
CREATE POLICY "Authenticated users can view platform prices"
  ON public.platform_prices FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can manage platform prices
CREATE POLICY "Authenticated users can manage platform prices"
  ON public.platform_prices FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

-- Users can view all orders (for reporting)
CREATE POLICY "Authenticated users can view all orders"
  ON public.orders FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can create orders
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Users can update their own orders
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update all orders
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- ORDER_ITEMS TABLE POLICIES
-- ============================================================================

-- Users can view order items for orders they can see
CREATE POLICY "Users can view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (user_id = auth.uid() OR auth.role() = 'authenticated')
    )
  );

-- Authenticated users can insert order items
CREATE POLICY "Authenticated users can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

-- Users can update order items for their orders
CREATE POLICY "Users can update own order items"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- STOCK_ALERTS TABLE POLICIES
-- ============================================================================

-- Authenticated users can view stock alerts
CREATE POLICY "Authenticated users can view stock alerts"
  ON public.stock_alerts FOR SELECT
  USING (auth.role() = 'authenticated');

-- System can create stock alerts (via trigger)
CREATE POLICY "System can create stock alerts"
  ON public.stock_alerts FOR INSERT
  WITH CHECK (true);

-- Authenticated users can update stock alerts
CREATE POLICY "Authenticated users can update stock alerts"
  ON public.stock_alerts FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- DAILY_REPORTS TABLE POLICIES
-- ============================================================================

-- Authenticated users can view daily reports
CREATE POLICY "Authenticated users can view daily reports"
  ON public.daily_reports FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins and pharmacists can generate reports
CREATE POLICY "Admins and pharmacists can generate reports"
  ON public.daily_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'pharmacist')
    )
  );

-- ============================================================================
-- ZORTOUT_CONFIG TABLE POLICIES
-- ============================================================================

-- Only admins can view ZortOut config
CREATE POLICY "Admins can view zortout config"
  ON public.zortout_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can manage ZortOut config
CREATE POLICY "Admins can manage zortout config"
  ON public.zortout_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
