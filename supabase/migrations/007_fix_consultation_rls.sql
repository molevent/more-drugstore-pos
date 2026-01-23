-- ============================================================================
-- Fix RLS policies for consultation_history and common_symptoms tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.consultation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_symptoms ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONSULTATION_HISTORY TABLE POLICIES
-- ============================================================================

-- Authenticated users can view all consultations
CREATE POLICY "Authenticated users can view consultations"
  ON public.consultation_history FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can create consultations
CREATE POLICY "Authenticated users can create consultations"
  ON public.consultation_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update consultations they created
CREATE POLICY "Users can update own consultations"
  ON public.consultation_history FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Admins can update all consultations
CREATE POLICY "Admins can update all consultations"
  ON public.consultation_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- COMMON_SYMPTOMS TABLE POLICIES
-- ============================================================================

-- Everyone can view active common symptoms (for the wizard)
CREATE POLICY "Anyone can view common symptoms"
  ON public.common_symptoms FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

-- Authenticated users can manage common symptoms
CREATE POLICY "Authenticated users can manage common symptoms"
  ON public.common_symptoms FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.consultation_history TO authenticated;
GRANT INSERT ON public.consultation_history TO authenticated;
GRANT UPDATE ON public.consultation_history TO authenticated;

GRANT SELECT ON public.common_symptoms TO authenticated, anon;
GRANT ALL ON public.common_symptoms TO authenticated;
