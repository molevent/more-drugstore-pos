-- Migration: 041_create_work_shifts
-- Creates work_shifts table for employee work schedule management
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS public.work_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_name TEXT NOT NULL,
  position TEXT,
  work_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  hourly_wage DECIMAL(10, 2) DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  total_wage DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.work_shifts IS 'ตารางเข้างานพนักงาน (กะงาน/ลา)';

-- Indexes
CREATE INDEX idx_work_shifts_date ON public.work_shifts(work_date);
CREATE INDEX idx_work_shifts_employee ON public.work_shifts(employee_name);
CREATE INDEX idx_work_shifts_employee_date ON public.work_shifts(employee_name, work_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_work_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_shifts_updated_at
  BEFORE UPDATE ON public.work_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_work_shifts_updated_at();

-- RLS
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read work_shifts"
  ON public.work_shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert work_shifts"
  ON public.work_shifts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update work_shifts"
  ON public.work_shifts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete work_shifts"
  ON public.work_shifts FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow service_role full access work_shifts"
  ON public.work_shifts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
