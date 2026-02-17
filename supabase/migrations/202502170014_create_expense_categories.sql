-- Create expense_categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  keywords TEXT, -- comma-separated keywords for auto-matching
  color VARCHAR(7) DEFAULT '#6B7280', -- hex color code
  chart_of_accounts_code VARCHAR(20), -- รหัสบัญชีแยกประเภท
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on expense_categories"
  ON public.expense_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default categories
INSERT INTO public.expense_categories (name, description, keywords, color) VALUES
  ('ค่าเดินทาง', 'ค่าแท็กซี่ ค่ารถ ค่าน้ำมัน', 'แท็กซี่,grab,taxi,น้ำมัน,รถ,เดินทาง,ขนส่ง', '#EF4444'),
  ('ค่าอินเทอร์เน็ต', 'ค่า internet wifi', 'internet,wifi,เน็ต,อินเทอร์เน็ต, ais,true,dtac', '#3B82F6'),
  ('ค่าโฆษณา', 'ค่า ads facebook google', 'ads,โฆษณา,facebook,google,marketing,สติกเกอร์', '#10B981'),
  ('ค่าของใช้', 'อุปกรณ์สำนักงาน เครื่องใช้', 'อุปกรณ์,สำนักงาน,ของใช้,เครื่องเขียน,หมึก', '#F59E0B'),
  ('ค่าอาหาร', 'ค่าอาหาร เครื่องดื่ม', 'อาหาร,เครื่องดื่ม,น้ำ,ขนม,กาแฟ', '#8B5CF6'),
  ('ค่าบริการ', 'ค่าบริการต่างๆ', 'service,บริการ,ค่าบริการ', '#EC4899'),
  ('ค่าซ่อมแซม', 'ค่าซ่อม ค่าบำรุงรักษา', 'ซ่อม,บำรุง,maintenance,repair', '#6366F1'),
  ('ค่าอื่นๆ', 'ค่าใช้จ่ายอื่นๆ', 'อื่นๆ,other', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_expense_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_categories_updated_at();
