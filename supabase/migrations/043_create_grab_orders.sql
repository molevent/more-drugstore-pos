-- ============================================================================
-- Grab Orders System
-- ถ่ายรูปออเดอร์ Grab → OCR อ่านข้อมูล → บันทึก → เช็คของ → ถ่ายรูปยืนยัน
-- ============================================================================

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grab Orders table
CREATE TABLE IF NOT EXISTS public.grab_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL,               -- GM-624
  booking_code TEXT,                        -- A-9XFLMX8WXCV9AV
  tracking_number TEXT,                     -- 001350417647-C73BCATDJF5CKE
  platform TEXT NOT NULL DEFAULT 'grab',    -- grab, lineman, robinhood, etc.
  
  -- Customer info
  customer_name TEXT,
  customer_phone TEXT,
  customer_notes TEXT,                      -- หมายเหตุจากลูกค้า
  
  -- Driver info
  driver_name TEXT,
  driver_phone TEXT,
  
  -- Order amounts
  subtotal DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  vat DECIMAL(10, 2) DEFAULT 0,
  grand_total DECIMAL(10, 2) DEFAULT 0,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'scanned',   -- scanned, picking, verified, completed, cancelled
  
  -- Images
  order_image_url TEXT,                     -- รูปออเดอร์ที่ถ่ายเข้ามา
  pick_image_url TEXT,                      -- รูปของที่หยิบเพื่อเช็ค
  
  -- Verification
  picked_by TEXT,                           -- ชื่อพนักงานที่หยิบของ
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  
  -- OCR raw data
  ocr_raw_json JSONB,
  
  -- Timestamps
  order_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.grab_orders IS 'ออเดอร์จากแพลตฟอร์มเดลิเวอรี่ (Grab, LINE MAN, etc.)';

-- Grab Order Items table
CREATE TABLE IF NOT EXISTS public.grab_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grab_order_id UUID NOT NULL REFERENCES public.grab_orders(id) ON DELETE CASCADE,
  
  -- Item info from OCR
  item_name TEXT NOT NULL,                  -- ชื่อสินค้าจาก OCR
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  total_price DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,                               -- หมายเหตุรายการ
  
  -- Product matching
  matched_product_id UUID,                  -- FK to products table (matched)
  matched_product_name TEXT,                -- ชื่อสินค้าในระบบที่ match
  match_confidence DECIMAL(5, 2) DEFAULT 0, -- ความมั่นใจในการ match (0-100)
  
  -- Pick verification
  is_picked BOOLEAN DEFAULT FALSE,          -- หยิบแล้วหรือยัง
  pick_quantity INTEGER,                    -- จำนวนที่หยิบจริง
  pick_notes TEXT,                          -- หมายเหตุการหยิบ (เช่น ของหมด)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.grab_order_items IS 'รายการสินค้าในออเดอร์เดลิเวอรี่';

-- Indexes
CREATE INDEX idx_grab_orders_date ON public.grab_orders(order_date);
CREATE INDEX idx_grab_orders_status ON public.grab_orders(status);
CREATE INDEX idx_grab_orders_platform ON public.grab_orders(platform);
CREATE INDEX idx_grab_orders_number ON public.grab_orders(order_number);
CREATE INDEX idx_grab_order_items_order ON public.grab_order_items(grab_order_id);
CREATE INDEX idx_grab_order_items_product ON public.grab_order_items(matched_product_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_grab_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grab_orders_updated_at
  BEFORE UPDATE ON public.grab_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_grab_orders_updated_at();

-- RLS
ALTER TABLE public.grab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grab_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for grab_orders
CREATE POLICY "Allow authenticated read grab_orders"
  ON public.grab_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert grab_orders"
  ON public.grab_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update grab_orders"
  ON public.grab_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete grab_orders"
  ON public.grab_orders FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow service_role full access grab_orders"
  ON public.grab_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies for grab_order_items
CREATE POLICY "Allow authenticated read grab_order_items"
  ON public.grab_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert grab_order_items"
  ON public.grab_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update grab_order_items"
  ON public.grab_order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete grab_order_items"
  ON public.grab_order_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow service_role full access grab_order_items"
  ON public.grab_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Storage bucket for order images
INSERT INTO storage.buckets (id, name, public)
VALUES ('grab-orders', 'grab-orders', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated upload grab-orders"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'grab-orders');
CREATE POLICY "Allow public read grab-orders"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'grab-orders');
CREATE POLICY "Allow authenticated delete grab-orders"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'grab-orders');
