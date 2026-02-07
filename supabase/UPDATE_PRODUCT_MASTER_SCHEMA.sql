-- ============================================================================
-- อัพเดตโครงสร้างฐานข้อมูลสินค้า (Product Master Data)
-- สร้างฟิลด์ใหม่ตามความต้องการทั้งหมด
-- ============================================================================

-- เพิ่มฟิลด์ใหม่ทั้งหมดในตาราง products
-- 1. ข้อมูลการระบุตัวตน (Identification)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'finished_goods',
  ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- 2. หมวดหมู่และการจัดกลุ่ม (Categorization)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS indications TEXT,
  ADD COLUMN IF NOT EXISTS usage_instructions TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 3. การตั้งราคาและบัญชี (Financials)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS purchase_price_excl_vat DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price_excl_vat DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price_incl_vat DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10,2) DEFAULT 0;

-- 4. การจัดการสต็อก (Inventory & Tracking)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS opening_stock_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS packaging_size VARCHAR(100);

-- 5. โลจิสติกส์และรูปภาพ (Logistics & Media)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS weight_grams DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS width_cm DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS length_cm DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- 6. ช่องทางการขาย (Sales Channels)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS sell_on_pos BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sell_on_grab BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_lineman BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_lazada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_shopee BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_line_shopping BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_on_tiktok BOOLEAN DEFAULT false;

-- 6.1 ราคาขายแยกตามช่องทาง (Channel-specific Prices)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS price_pos DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_grab DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_lineman DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_lazada DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_shopee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_line_shopping DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_tiktok DECIMAL(10,2) DEFAULT 0;

-- ย้าย image_url เดิมไป image_urls[1] ถ้ามี
-- UPDATE products SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_urls IS NULL;

-- สร้างตารางสำหรับเก็บรูปภาพหลายรูป (ถ้าต้องการ normalize)
-- หรือใช้ JSONB/Array ตามที่กำหนดไว้ข้างต้น

-- สร้าง index สำหรับค้นหา
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- สร้าง Comments อธิบายฟิลด์ต่างๆ (สำหรับ pgAdmin/documentation)
COMMENT ON COLUMN products.product_type IS 'ประเภทสินค้า เช่น finished_goods, service';
COMMENT ON COLUMN products.brand IS 'ยี่ห้อสินค้า เช่น GSK, Eucerin, Mega We Care';
COMMENT ON COLUMN products.tags IS 'คำค้นหาเพิ่มเติม เช่น #ยาแก้ปวด, #สินค้าแนะนำ';
COMMENT ON COLUMN products.indications IS 'สรรพคุณ / ข้อบ่งใช้ของสินค้า';
COMMENT ON COLUMN products.usage_instructions IS 'คำแนะนำเพิ่มเติม ข้อควรระวัง วิธีเก็บรักษา';
COMMENT ON COLUMN products.internal_notes IS 'หมายเหตุภายใน (พนักงานดูได้อย่างเดียว)';
COMMENT ON COLUMN products.purchase_price_excl_vat IS 'ราคาทุนซื้อล่าสุด (ไม่รวม VAT)';
COMMENT ON COLUMN products.cost_per_unit IS 'ต้นทุนเฉลี่ยต่อหน่วย';
COMMENT ON COLUMN products.selling_price_excl_vat IS 'ราคาขายก่อนภาษี';
COMMENT ON COLUMN products.selling_price_incl_vat IS 'ราคาขายหน้าร้าน (รวมภาษีแล้ว)';
COMMENT ON COLUMN products.original_price IS 'ราคาเต็มก่อนทำส่วนลด';
COMMENT ON COLUMN products.wholesale_price IS 'ราคาพิเศษกรณีขายจำนวนมาก';
COMMENT ON COLUMN products.opening_stock_date IS 'วันที่ตั้งต้นยอดยกมา (ค.ศ.)';
COMMENT ON COLUMN products.expiry_date IS 'วันหมดอายุของสินค้า Lot ปัจจุบัน';
COMMENT ON COLUMN products.lot_number IS 'เลขที่ผลิตของสินค้า';
COMMENT ON COLUMN products.packaging_size IS 'ขนาดบรรจุ เช่น 10 เม็ด, 500 มล.';
COMMENT ON COLUMN products.weight_grams IS 'น้ำหนักสินค้า (กรัม) สำหรับคำนวณค่าขนส่ง';
COMMENT ON COLUMN products.width_cm IS 'ความกว้าง (ซม.)';
COMMENT ON COLUMN products.length_cm IS 'ความยาว (ซม.)';
COMMENT ON COLUMN products.height_cm IS 'ความสูง (ซม.)';
COMMENT ON COLUMN products.image_urls IS 'รูปภาพสินค้า (เก็บได้สูงสุด 9 รูป)';
COMMENT ON COLUMN products.sell_on_pos IS 'เปิดขายที่หน้าร้าน (POS)';
COMMENT ON COLUMN products.sell_on_grab IS 'เปิดขายบน GRAB';
COMMENT ON COLUMN products.sell_on_lineman IS 'เปิดขายบน LINEMAN';
COMMENT ON COLUMN products.sell_on_lazada IS 'เปิดขายบน LAZADA';
COMMENT ON COLUMN products.sell_on_shopee IS 'เปิดขายบน SHOPEE';
COMMENT ON COLUMN products.sell_on_line_shopping IS 'เปิดขายบน LINE SHOPPING';
COMMENT ON COLUMN products.sell_on_tiktok IS 'เปิดขายบน TIKTOK';

-- Comments for channel-specific prices
COMMENT ON COLUMN products.price_pos IS 'ราคาขายที่หน้าร้าน (POS)';
COMMENT ON COLUMN products.price_grab IS 'ราคาขายบน GRAB';
COMMENT ON COLUMN products.price_lineman IS 'ราคาขายบน LINEMAN';
COMMENT ON COLUMN products.price_lazada IS 'ราคาขายบน LAZADA';
COMMENT ON COLUMN products.price_shopee IS 'ราคาขายบน SHOPEE';
COMMENT ON COLUMN products.price_line_shopping IS 'ราคาขายบน LINE SHOPPING';
COMMENT ON COLUMN products.price_tiktok IS 'ราคาขายบน TIKTOK';

-- ============================================================================
-- แสดงผลลัพธ์การอัพเดต
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
