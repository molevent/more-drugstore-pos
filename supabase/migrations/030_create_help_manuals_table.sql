-- ============================================================================
-- คู่มือการใช้งาน (Help Manuals System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.help_manuals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_route VARCHAR(255) NOT NULL UNIQUE, -- เช่น /products, /stock-management
  page_name_th VARCHAR(255) NOT NULL, -- ชื่อหน้าเป็นภาษาไทย
  page_name_en VARCHAR(255), -- ชื่อหน้าเป็นภาษาอังกฤษ
  content TEXT, -- เนื้อหาคู่มือ (รองรับ Markdown)
  short_description TEXT, -- คำอธิบายสั้นๆ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id)
);

-- Index สำหรับค้นหา
CREATE INDEX idx_help_manuals_route ON public.help_manuals(page_route);

-- RLS Policies
ALTER TABLE public.help_manuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view help manuals"
  ON public.help_manuals FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage help manuals"
  ON public.help_manuals FOR ALL
  USING (auth.role() = 'authenticated');

-- ข้อมูลเริ่มต้นสำหรับหน้าที่มีอยู่แล้ว
INSERT INTO public.help_manuals (page_route, page_name_th, page_name_en, content, short_description) VALUES
('/products', 'สินค้า', 'Products', 'หน้าจัดการสินค้า ใช้สำหรับเพิ่ม แก้ไข และดูข้อมูลสินค้าในระบบ', 'จัดการสินค้าและสต็อกสินค้า'),
('/stock-management', 'จัดการสต็อก', 'Stock Management', 'หน้าจัดการสต็อก ใช้สำหรับปรับยอดสต็อก จัดการ Batch และติดตามการเคลื่อนไหวสินค้า', 'ปรับยอดสต็อก จัดการ Batch และติดตามการเคลื่อนไหว'),
('/quotations', 'รายการใบเสนอราคา', 'Quotations', 'หน้าจัดการใบเสนอราคา ใช้สำหรับสร้างและจัดการใบเสนอราคาสำหรับลูกค้า', 'จัดการใบเสนอราคาทั้งหมด'),
('/contacts', 'ผู้ติดต่อ', 'Contacts', 'หน้าจัดการผู้ติดต่อ ใช้สำหรับจัดเก็บข้อมูลลูกค้าและซัพพลายเออร์', 'จัดการข้อมูลลูกค้าและซัพพลายเออร์'),
('/pos', 'ขายหน้าร้าน', 'POS', 'หน้าขายสินค้าหน้าร้าน ใช้สำหรับสร้างออเดอร์และรับเงิน', 'ระบบขายสินค้าหน้าร้าน'),
('/settings', 'ตั้งค่า', 'Settings', 'หน้าตั้งค่าระบบ ใช้สำหรับจัดการการตั้งค่าต่างๆ ของร้านค้า', 'ตั้งค่าระบบและการเชื่อมต่อ')
ON CONFLICT (page_route) DO NOTHING;
