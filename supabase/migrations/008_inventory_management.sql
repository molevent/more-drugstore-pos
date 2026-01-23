-- ============================================================================
-- ระบบจัดการคลังสินค้า (Inventory Management System)
-- ============================================================================

-- ============================================================================
-- ตาราง STOCK BATCHES - ติดตาม Lot/Batch ของสินค้า
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10, 2),
  supplier VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT unique_batch_product UNIQUE(product_id, batch_number)
);

-- ============================================================================
-- ตาราง STOCK MOVEMENTS - บันทึกการเคลื่อนไหวสต็อก
-- ============================================================================
CREATE TYPE stock_movement_type AS ENUM (
  'purchase',      -- รับเข้าจากซัพพลายเออร์
  'sale',          -- ขายออก
  'adjustment',    -- ปรับยอดด้วยมือ
  'return',        -- รับคืนจากลูกค้า
  'supplier_return', -- คืนให้ซัพพลายเออร์
  'expired',       -- ตัดสต็อกหมดอายุ
  'damaged',       -- ตัดสต็อกเสียหาย
  'transfer'       -- โอนย้ายระหว่างคลัง
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.stock_batches(id),
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL, -- บวกสำหรับรับเข้า, ลบสำหรับจ่ายออก
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  reference_type VARCHAR(50), -- 'sale', 'purchase_order', 'adjustment', etc.
  reference_id UUID, -- ID ของรายการที่เกี่ยวข้อง
  reason TEXT,
  notes TEXT,
  movement_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(movement_date);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);

-- ============================================================================
-- ตาราง MEDICINE DETAILS - ข้อมูลเพิ่มเติมสำหรับยา
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medicine_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- ข้อมูลขนาดยา
  dosage_form VARCHAR(100), -- เม็ด, แคปซูล, น้ำเชื่อม, ฉีด, etc.
  strength VARCHAR(100), -- เช่น "500mg", "5ml/100ml"
  dosage_instructions TEXT,
  
  -- คำแนะนำการใช้ (สำหรับพิมพ์ฉลาก)
  usage_before_meal BOOLEAN DEFAULT false,
  usage_after_meal BOOLEAN DEFAULT false,
  usage_morning BOOLEAN DEFAULT false,
  usage_noon BOOLEAN DEFAULT false,
  usage_evening BOOLEAN DEFAULT false,
  usage_bedtime BOOLEAN DEFAULT false,
  usage_as_needed BOOLEAN DEFAULT false,
  
  -- คำแนะนำเพิ่มเติม
  special_instructions TEXT,
  warnings TEXT,
  storage_conditions VARCHAR(255),
  
  -- ข้อมูลทะเบียนยา
  registration_number VARCHAR(100),
  manufacturer VARCHAR(255),
  active_ingredients TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_product_medicine_details UNIQUE(product_id)
);

-- ============================================================================
-- ตาราง STOCK ALERTS - การแจ้งเตือนสต็อก
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'expiring_soon', 'expired'
  alert_level VARCHAR(20), -- 'warning', 'critical'
  message TEXT,
  threshold_value INTEGER, -- เช่น จำนวนสต็อกขั้นต่ำ
  current_value INTEGER,
  batch_id UUID REFERENCES public.stock_batches(id),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_alerts_unresolved ON public.stock_alerts(is_resolved, alert_type);

-- ============================================================================
-- ตาราง LABEL TEMPLATES - เทมเพลตฉลากยา
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.label_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'medicine', 'price', 'barcode'
  width_mm INTEGER NOT NULL DEFAULT 50,
  height_mm INTEGER NOT NULL DEFAULT 30,
  template_html TEXT,
  template_css TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ตาราง PRINTED LABELS - ประวัติการพิมพ์ฉลาก
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.printed_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.label_templates(id),
  patient_name VARCHAR(255),
  prescription_number VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  dosage_instructions TEXT,
  printed_data JSONB,
  printed_at TIMESTAMPTZ DEFAULT NOW(),
  printed_by UUID REFERENCES public.users(id)
);

-- ============================================================================
-- เพิ่มคอลัมน์ใหม่ในตาราง products
-- ============================================================================
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_stock_level INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'ชิ้น',
ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS location VARCHAR(100), -- ตำแหน่งชั้นวางในร้าน
ADD COLUMN IF NOT EXISTS is_prescription_required BOOLEAN DEFAULT false;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ฟังก์ชันอัพเดตจำนวนสต็อกหลังการเคลื่อนไหว
CREATE OR REPLACE FUNCTION update_product_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- อัพเดตจำนวนสต็อกหลัก
  UPDATE products 
  SET stock_quantity = NEW.quantity_after,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  -- ตรวจสอบการแจ้งเตือนสต็อกต่ำ
  PERFORM check_low_stock_alert(NEW.product_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ฟังก์ชันตรวจสอบสต็อกต่ำและสร้างการแจ้งเตือน
CREATE OR REPLACE FUNCTION check_low_stock_alert(p_product_id UUID)
RETURNS VOID AS $$
DECLARE
  v_product RECORD;
  v_existing_alert UUID;
BEGIN
  -- ดึงข้อมูลสินค้า
  SELECT id, name_th, stock_quantity, min_stock_level, reorder_point
  INTO v_product
  FROM products
  WHERE id = p_product_id;
  
  -- ตรวจสอบว่ามีการแจ้งเตือนที่ยังไม่ได้แก้ไขหรือไม่
  SELECT id INTO v_existing_alert
  FROM stock_alerts
  WHERE product_id = p_product_id
    AND alert_type = 'low_stock'
    AND is_resolved = false
  LIMIT 1;
  
  IF v_product.stock_quantity <= v_product.min_stock_level THEN
    -- สร้างการแจ้งเตือนระดับวิกฤต
    IF v_existing_alert IS NULL THEN
      INSERT INTO stock_alerts (
        product_id, alert_type, alert_level, 
        message, threshold_value, current_value
      ) VALUES (
        p_product_id, 'low_stock', 'critical',
        format('สินค้า %s เหลือน้อยมาก (%s/%s)', 
          v_product.name_th, v_product.stock_quantity, v_product.min_stock_level),
        v_product.min_stock_level, v_product.stock_quantity
      );
    END IF;
  ELSIF v_product.stock_quantity <= v_product.reorder_point THEN
    -- สร้างการแจ้งเตือนระดับเตือน
    IF v_existing_alert IS NULL THEN
      INSERT INTO stock_alerts (
        product_id, alert_type, alert_level,
        message, threshold_value, current_value
      ) VALUES (
        p_product_id, 'low_stock', 'warning',
        format('สินค้า %s ใกล้หมด ควรสั่งซื้อเพิ่ม (%s/%s)', 
          v_product.name_th, v_product.stock_quantity, v_product.reorder_point),
        v_product.reorder_point, v_product.stock_quantity
      );
    END IF;
  ELSIF v_existing_alert IS NOT NULL THEN
    -- ปิดการแจ้งเตือนถ้าสต็อกเพียงพอแล้ว
    UPDATE stock_alerts
    SET is_resolved = true,
        resolved_at = NOW()
    WHERE id = v_existing_alert;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ฟังก์ชันตรวจสอบยาใกล้หมดอายุ
CREATE OR REPLACE FUNCTION check_expiring_batches()
RETURNS TABLE(
  batch_id UUID,
  product_id UUID,
  product_name VARCHAR,
  batch_number VARCHAR,
  expiry_date DATE,
  quantity INTEGER,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sb.id,
    sb.product_id,
    p.name_th,
    sb.batch_number,
    sb.expiry_date,
    sb.quantity,
    (sb.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry
  FROM stock_batches sb
  JOIN products p ON p.id = sb.product_id
  WHERE sb.is_active = true
    AND sb.quantity > 0
    AND sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  ORDER BY sb.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger อัพเดตสต็อกหลังการเคลื่อนไหว
CREATE TRIGGER trigger_update_stock_on_movement
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_movement();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- เปิด RLS สำหรับทุกตารางใหม่
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printed_labels ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- SEED DATA - เทมเพลตฉลากยาเริ่มต้น
-- ============================================================================

INSERT INTO public.label_templates (name, template_type, width_mm, height_mm, template_html, is_default)
VALUES (
  'ฉลากยาพื้นฐาน',
  'medicine',
  60,
  40,
  '<div class="label">
    <div class="pharmacy-name">{{pharmacy_name}}</div>
    <div class="patient-name">ชื่อ: {{patient_name}}</div>
    <div class="medicine-name">{{medicine_name}}</div>
    <div class="dosage">{{dosage_instructions}}</div>
    <div class="quantity">จำนวน: {{quantity}}</div>
    <div class="date">วันที่: {{date}}</div>
    <div class="warnings">{{warnings}}</div>
  </div>',
  true
) ON CONFLICT DO NOTHING;
