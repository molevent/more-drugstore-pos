-- More Drug Store - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'pharmacist', 'cashier')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Only admins can insert/update users (you'll need to set this up based on your needs)
CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
  category TEXT NOT NULL,
  is_drug BOOLEAN DEFAULT FALSE,
  drug_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can read products
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

-- Only authenticated users can modify products
CREATE POLICY "Authenticated users can manage products" ON public.products
  FOR ALL USING (auth.role() = 'authenticated');

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
  tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Users can view all sales
CREATE POLICY "Authenticated users can view sales" ON public.sales
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can create sales
CREATE POLICY "Authenticated users can create sales" ON public.sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Stock alerts table
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL,
  min_stock INTEGER NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view alerts
CREATE POLICY "Authenticated users can view alerts" ON public.stock_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check and create stock alerts
CREATE OR REPLACE FUNCTION check_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= NEW.min_stock THEN
    INSERT INTO public.stock_alerts (product_id, current_stock, min_stock)
    VALUES (NEW.id, NEW.stock, NEW.min_stock)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create stock alerts when stock is low
CREATE TRIGGER stock_alert_trigger
  AFTER INSERT OR UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_alert();

-- Insert sample admin user (you'll need to create this user in Supabase Auth first)
-- Replace 'your-user-id' with the actual UUID from auth.users after creating the user
-- INSERT INTO public.users (id, email, name, role)
-- VALUES ('your-user-id', 'admin@moredrug.com', 'Admin User', 'admin');

-- Sample products data
INSERT INTO public.products (barcode, name, name_en, description, price, cost, stock, min_stock, category, is_drug, drug_info)
VALUES 
  ('8850123456789', 'พาราเซตามอล 500mg', 'Paracetamol 500mg', 'ยาแก้ปวด ลดไข้', 5.00, 3.00, 500, 100, 'ยาแก้ปวด', true, 
   '{"generic_name": "Paracetamol", "dosage": "500mg", "usage": "รับประทานครั้งละ 1-2 เม็ด ทุก 4-6 ชั่วโมง", "side_effects": "คลื่นไส้ อาเจียน", "warnings": "ห้ามใช้เกิน 4000mg ต่อวัน", "symptoms": ["ปวดหัว", "ไข้", "ปวดฟัน"]}'::jsonb),
  
  ('8850123456790', 'วิตามินซี 1000mg', 'Vitamin C 1000mg', 'วิตามินซีชนิดเม็ดฟู่', 150.00, 100.00, 200, 50, 'วิตามิน', false, null),
  
  ('8850123456791', 'ยาแก้แพ้', 'Antihistamine', 'ยาแก้อาการแพ้', 25.00, 15.00, 300, 80, 'ยาแก้แพ้', true,
   '{"generic_name": "Chlorpheniramine", "dosage": "4mg", "usage": "รับประทานครั้งละ 1 เม็ด วันละ 3-4 ครั้ง", "side_effects": "ง่วงนอน", "warnings": "ไม่ควรขับขี่ยานพาหนะ", "symptoms": ["คัน", "ผื่น", "น้ำมูกไหล"]}'::jsonb),
  
  ('8850123456792', 'ยาบรรเทาอาการท้องเสีย', 'Anti-Diarrheal', 'ยาแก้ท้องเสีย', 35.00, 20.00, 150, 50, 'ยาระบบทางเดินอาหาร', true,
   '{"generic_name": "Loperamide", "dosage": "2mg", "usage": "รับประทานครั้งละ 2 เม็ด หลังถ่ายเหลว", "side_effects": "ท้องผูก", "warnings": "ไม่ควรใช้เกิน 2 วัน", "symptoms": ["ท้องเสีย", "ถ่ายเหลว"]}'::jsonb),
  
  ('8850123456793', 'หน้ากากอนามัย', 'Surgical Mask', 'หน้ากากอนามัยแบบใช้แล้วทิ้ง', 2.50, 1.50, 1000, 200, 'อุปกรณ์การแพทย์', false, null),
  
  ('8850123456794', 'แอลกอฮอล์เจล', 'Alcohol Gel', 'เจลล้างมือแอลกอฮอล์ 70%', 45.00, 30.00, 250, 60, 'อุปกรณ์การแพทย์', false, null),
  
  ('8850123456795', 'ยาพ่นจมูก', 'Nasal Spray', 'ยาพ่นจมูกแก้คัดจมูก', 120.00, 80.00, 80, 30, 'ยาโรคจมูก', true,
   '{"generic_name": "Oxymetazoline", "dosage": "0.05%", "usage": "พ่นเข้าจมูกข้างละ 1-2 ครั้ง", "side_effects": "แสบจมูก", "warnings": "ไม่ควรใช้เกิน 3 วัน", "symptoms": ["คัดจมูก", "โพรงจมูกอักเสบ"]}'::jsonb),
  
  ('8850123456796', 'ยาแก้ไอ', 'Cough Syrup', 'น้ำยาแก้ไอ', 85.00, 55.00, 120, 40, 'ยาระบบทางเดินหายใจ', true,
   '{"generic_name": "Dextromethorphan", "dosage": "15mg/5ml", "usage": "รับประทานครั้งละ 5-10ml ทุก 4-6 ชั่วโมง", "side_effects": "ง่วงนอน", "warnings": "ห้ามใช้ในเด็กอายุต่ำกว่า 6 ปี", "symptoms": ["ไอ", "ระคายคอ"]}'::jsonb),
  
  ('8850123456797', 'ปลาสเตอร์', 'Adhesive Bandage', 'พลาสเตอร์ปิดแผล', 15.00, 8.00, 400, 100, 'อุปกรณ์การแพทย์', false, null),
  
  ('8850123456798', 'ยาทาแก้ปวดกล้ามเนื้อ', 'Muscle Pain Relief Gel', 'ยาทาแก้ปวดกล้ามเนื้อ', 95.00, 60.00, 100, 30, 'ยาทาภายนอก', false,
   '{"usage": "ทาบริเวณที่ปวด 3-4 ครั้งต่อวัน", "warnings": "หลีกเลี่ยงบริเวณแผลเปิด", "symptoms": ["ปวดกล้ามเนื้อ", "ปวดหลัง", "ปวดไหล่"]}'::jsonb);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON public.stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_is_resolved ON public.stock_alerts(is_resolved);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
