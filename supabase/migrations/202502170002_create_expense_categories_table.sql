-- Migration: Create expense_categories table
-- Created: 2025-02-17

-- Create expense_categories table for managing expense categories with chart of accounts
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  chart_of_accounts_code TEXT,
  description TEXT,
  color TEXT DEFAULT '#7D735F',
  is_active BOOLEAN DEFAULT true,
  keywords TEXT, -- คีย์เวิร์ดสำคัญสำหรับ matching ข้อมูลจาก Google Sheets (คั่นด้วย comma)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_categories_code ON expense_categories(code);

-- Create index on is_active for filtering active categories
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active);

-- Enable row level security
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read expense_categories" 
  ON expense_categories 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create policy to allow all authenticated users to insert
CREATE POLICY "Allow authenticated users to insert expense_categories" 
  ON expense_categories 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create policy to allow all authenticated users to update
CREATE POLICY "Allow authenticated users to update expense_categories" 
  ON expense_categories 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create policy to allow all authenticated users to delete
CREATE POLICY "Allow authenticated users to delete expense_categories" 
  ON expense_categories 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- Add comments for columns
COMMENT ON COLUMN expense_categories.name IS 'ชื่อหมวดหมู่ค่าใช้จ่าย';
COMMENT ON COLUMN expense_categories.code IS 'รหัสหมวดหมู่ (unique)';
COMMENT ON COLUMN expense_categories.chart_of_accounts_code IS 'รหัสแผนผังบัญชี (เช่น 5-1010)';
COMMENT ON COLUMN expense_categories.description IS 'รายละเอียดหมวดหมู่';
COMMENT ON COLUMN expense_categories.color IS 'สีประจำหมวดหมู่';
COMMENT ON COLUMN expense_categories.is_active IS 'สถานะการใช้งาน';
COMMENT ON COLUMN expense_categories.keywords IS 'คีย์เวิร์ดสำหรับ matching กับ Google Sheets (คั่นด้วย comma, เช่น น้ำประปา,ปั้มน้ำ,ประปา)';

-- Insert default expense categories with keywords for auto-matching
INSERT INTO expense_categories (name, code, chart_of_accounts_code, description, color, keywords) VALUES
  ('ค่าน้ำ', 'WATER', '5-1010', 'ค่าน้ำประปาและน้ำดื่ม', '#4A90A4', 'น้ำประปา,ปั้มน้ำ,ประปา,การประปา,ค่าน้ำดื่ม,น้ำดื่ม'),
  ('ค่าไฟ', 'ELECTRIC', '5-1020', 'ค่าไฟฟ้า', '#E8B87D', 'ไฟฟ้า,การไฟฟ้า,ประปาและไฟฟ้า,PEA,MEA,ค่าไฟ'),
  ('ค่าเช่า', 'RENT', '5-1030', 'ค่าเช่าอาคาร/ร้าน', '#A67B5B', 'เช่า,ค่าเช่า,สถานที่,อาคาร,ค่าห้อง'),
  ('ค่าซ่อมบำรุง', 'MAINTENANCE', '5-1040', 'ค่าซ่อมบำรุงอุปกรณ์และอาคาร', '#7D735F', 'ซ่อม,ซ่อมแซม,บำรุง,ซ่อมบำรุง,ปรับปรุง,แซม'),
  ('ค่าอุปกรณ์สำนักงาน', 'OFFICE', '5-1050', 'ค่าอุปกรณ์สำนักงานและเครื่องใช้', '#B8C9B8', 'สำนักงาน,เครื่องเขียน,อุปกรณ์,เครื่องใช้,กระดาษ,ปากกา'),
  ('ค่าโฆษณา', 'ADVERTISING', '5-1060', 'ค่าโฆษณาและการตลาด', '#9B7DD4', 'โฆษณา,การตลาด,PR,สื่อสาร,โปรโมชั่น,Facebook,Line'),
  ('ค่าขนส่ง', 'SHIPPING', '5-1070', 'ค่าขนส่งและจัดส่ง', '#D47D7D', 'ขนส่ง,จัดส่ง,ส่งของ,พัสดุ,ไปรษณีย์,Flash,Kerry,J&T,ThailandPost'),
  ('ค่าทำความสะอาด', 'CLEANING', '5-1080', 'ค่าทำความสะอาดและบริการ', '#7DD4A0', 'ทำความสะอาด,แม่บ้าน,กวาด,ถู,ซัก,ล้าง'),
  ('ค่าอื่นๆ', 'OTHER', '5-1090', 'ค่าใช้จ่ายอื่นๆ', '#D4756A', 'อื่นๆ,อื่น,ไม่ระบุ,ไม่ทราบ,อื่นฯ');
