-- ============================================================================
-- แก้ไข RLS Policies สำหรับระบบจัดการสต็อก
-- ============================================================================

-- ลบ policies เก่าถ้ามี
DROP POLICY IF EXISTS "Authenticated users can view stock batches" ON public.stock_batches;
DROP POLICY IF EXISTS "Authenticated users can manage stock batches" ON public.stock_batches;
DROP POLICY IF EXISTS "Authenticated users can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can create stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can view medicine details" ON public.medicine_details;
DROP POLICY IF EXISTS "Authenticated users can manage medicine details" ON public.medicine_details;
DROP POLICY IF EXISTS "Authenticated users can view stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Authenticated users can manage stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Authenticated users can view label templates" ON public.label_templates;
DROP POLICY IF EXISTS "Authenticated users can manage label templates" ON public.label_templates;
DROP POLICY IF EXISTS "Authenticated users can view printed labels" ON public.printed_labels;
DROP POLICY IF EXISTS "Authenticated users can create printed labels" ON public.printed_labels;

-- ============================================================================
-- สร้าง RLS POLICIES ใหม่
-- ============================================================================

-- Stock Batches policies
CREATE POLICY "Authenticated users can view stock batches"
  ON public.stock_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock batches"
  ON public.stock_batches FOR ALL
  USING (auth.role() = 'authenticated');

-- Stock Movements policies
CREATE POLICY "Authenticated users can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Medicine Details policies
CREATE POLICY "Authenticated users can view medicine details"
  ON public.medicine_details FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage medicine details"
  ON public.medicine_details FOR ALL
  USING (auth.role() = 'authenticated');

-- Stock Alerts policies
CREATE POLICY "Authenticated users can view stock alerts"
  ON public.stock_alerts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock alerts"
  ON public.stock_alerts FOR ALL
  USING (auth.role() = 'authenticated');

-- Label Templates policies
CREATE POLICY "Authenticated users can view label templates"
  ON public.label_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage label templates"
  ON public.label_templates FOR ALL
  USING (auth.role() = 'authenticated');

-- Printed Labels policies
CREATE POLICY "Authenticated users can view printed labels"
  ON public.printed_labels FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create printed labels"
  ON public.printed_labels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
