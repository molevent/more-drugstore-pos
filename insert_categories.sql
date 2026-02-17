-- Insert default expense categories
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active) VALUES
  ('ค่าเดินทาง', 'ค่าแท็กซี่ ค่ารถ ค่าน้ำมัน', 'แท็กซี่,grab,taxi,น้ำมัน,รถ,เดินทาง,ขนส่ง', '#EF4444', NULL, true),
  ('ค่าอินเทอร์เน็ต', 'ค่า internet wifi', 'internet,wifi,เน็ต,อินเทอร์เน็ต, ais,true,dtac', '#3B82F6', NULL, true),
  ('ค่าโฆษณา', 'ค่า ads facebook google', 'ads,โฆษณา,facebook,google,marketing,สติกเกอร์', '#10B981', NULL, true),
  ('ค่าของใช้', 'อุปกรณ์สำนักงาน เครื่องใช้', 'อุปกรณ์,สำนักงาน,ของใช้,เครื่องเขียน,หมึก', '#F59E0B', NULL, true),
  ('ค่าอาหาร', 'ค่าอาหาร เครื่องดื่ม', 'อาหาร,เครื่องดื่ม,น้ำ,ขนม,กาแฟ', '#8B5CF6', NULL, true),
  ('ค่าบริการ', 'ค่าบริการต่างๆ', 'service,บริการ,ค่าบริการ', '#EC4899', NULL, true),
  ('ค่าซ่อมแซม', 'ค่าซ่อม ค่าบำรุงรักษา', 'ซ่อม,บำรุง,maintenance,repair', '#6366F1', NULL, true),
  ('ค่าอื่นๆ', 'ค่าใช้จ่ายอื่นๆ', 'อื่นๆ,other', '#6B7280', NULL, true)
ON CONFLICT (name) DO NOTHING;
