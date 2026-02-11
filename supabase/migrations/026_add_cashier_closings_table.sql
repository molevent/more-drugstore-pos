-- Cashier Closing Table
-- Migration: 026_add_cashier_closings_table
-- Created: 2026-02-12

-- ============================================================================
-- TABLE: cashier_closings
-- ============================================================================

CREATE TABLE public.cashier_closings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closing_date DATE NOT NULL,
  reserve_amount DECIMAL(10,2) NOT NULL DEFAULT 2500.00,
  daily_cash_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  expected_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  difference DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_to_remove DECIMAL(10,2) NOT NULL DEFAULT 0,
  denominations JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.cashier_closings IS 'Cashier closing records for end-of-day cash count';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_cashier_closings_date ON public.cashier_closings(closing_date DESC);
CREATE INDEX idx_cashier_closings_user ON public.cashier_closings(user_id);
CREATE UNIQUE INDEX idx_cashier_closings_user_date ON public.cashier_closings(user_id, closing_date);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.cashier_closings ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own closing records
CREATE POLICY "Users can view their own cashier closings"
  ON public.cashier_closings
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to insert their own closing records
CREATE POLICY "Users can insert their own cashier closings"
  ON public.cashier_closings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own closing records (within same day)
CREATE POLICY "Users can update their own cashier closings same day"
  ON public.cashier_closings
  FOR UPDATE
  USING (user_id = auth.uid() AND closing_date = CURRENT_DATE)
  WITH CHECK (user_id = auth.uid());

-- Allow admin to view all closing records
CREATE POLICY "Admin can view all cashier closings"
  ON public.cashier_closings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
