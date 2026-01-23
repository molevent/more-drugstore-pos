-- ============================================================================
-- สินค้าตัวอย่างสำหรับทดสอบระบบ AI ช่วยแนะนำยา
-- ============================================================================
-- รันใน Supabase SQL Editor

-- 1. สร้างหมวดหมู่ก่อน (ถ้ายังไม่มี)
INSERT INTO categories (name_th, name_en, description_th, sort_order, is_active)
VALUES 
  ('ยาแก้ปวด-ลดไข้', 'Pain Relief & Fever', 'ยาแก้ปวดและลดไข้', 1, true),
  ('ยาแก้แพ้', 'Antihistamine', 'ยาแก้แพ้และภูมิแพ้', 2, true),
  ('ยาแก้ไอ-ขับเสมหะ', 'Cough & Cold', 'ยาแก้ไอและขับเสมหะ', 3, true),
  ('ยาทาแก้ปวด', 'Topical Pain Relief', 'ยาทาแก้ปวดภายนอก', 4, true),
  ('วิตามิน', 'Vitamins', 'วิตามินและอาหารเสริม', 5, true)
ON CONFLICT (name_th) DO NOTHING;

-- 2. เพิ่มสินค้าตัวอย่าง
INSERT INTO products (
  name_th, 
  name_en, 
  description_th, 
  description_en,
  category_id,
  barcode,
  base_price,
  stock_quantity,
  min_stock_level,
  reorder_point,
  unit_of_measure,
  is_active,
  is_prescription_required
)
SELECT 
  'พาราเซตามอล 500 มก.',
  'Paracetamol 500mg',
  'ยาแก้ปวด ลดไข้ ใช้ได้ทั้งเด็กและผู้ใหญ่',
  'Pain reliever and fever reducer',
  c.id,
  '8850123456789',
  5.00,
  1000,
  50,
  100,
  'เม็ด',
  true,
  false
FROM categories c WHERE c.name_th = 'ยาแก้ปวด-ลดไข้'
ON CONFLICT (barcode) DO NOTHING;

INSERT INTO products (
  name_th, 
  name_en, 
  description_th,
  category_id,
  barcode,
  base_price,
  stock_quantity,
  min_stock_level,
  unit_of_measure,
  is_active,
  is_prescription_required
)
SELECT 
  'ยาแก้แพ้ Cetirizine 10 มก.',
  'Cetirizine 10mg',
  'ยาแก้แพ้ แก้คัน น้ำมูกไหล จาม',
  c.id,
  '8850123456790',
  15.00,
  500,
  30,
  'เม็ด',
  true,
  false
FROM categories c WHERE c.name_th = 'ยาแก้แพ้'
ON CONFLICT (barcode) DO NOTHING;

INSERT INTO products (
  name_th, 
  name_en, 
  description_th,
  category_id,
  barcode,
  base_price,
  stock_quantity,
  min_stock_level,
  unit_of_measure,
  is_active,
  is_prescription_required
)
SELECT 
  'ยาแก้ไอน้ำเชื่อม',
  'Cough Syrup',
  'แก้ไอ ขับเสมหะ บรรเทาอาการคัดจมูก',
  c.id,
  '8850123456791',
  45.00,
  200,
  20,
  'ขวด',
  true,
  false
FROM categories c WHERE c.name_th = 'ยาแก้ไอ-ขับเสมหะ'
ON CONFLICT (barcode) DO NOTHING;

INSERT INTO products (
  name_th, 
  name_en, 
  description_th,
  category_id,
  barcode,
  base_price,
  stock_quantity,
  min_stock_level,
  unit_of_measure,
  is_active,
  is_prescription_required
)
SELECT 
  'ยาทาแก้ปวดกล้ามเนื้อ',
  'Muscle Pain Relief Gel',
  'ทาแก้ปวดกล้ามเนื้อ ลดอาการอักเสบ',
  c.id,
  '8850123456792',
  85.00,
  150,
  15,
  'หลอด',
  true,
  false
FROM categories c WHERE c.name_th = 'ยาทาแก้ปวด'
ON CONFLICT (barcode) DO NOTHING;

INSERT INTO products (
  name_th, 
  name_en, 
  description_th,
  category_id,
  barcode,
  base_price,
  stock_quantity,
  min_stock_level,
  unit_of_measure,
  is_active,
  is_prescription_required
)
SELECT 
  'วิตามินซี 1000 มก.',
  'Vitamin C 1000mg',
  'เสริมภูมิคุ้มกัน ต้านอนุมูลอิสระ',
  c.id,
  '8850123456793',
  120.00,
  300,
  25,
  'เม็ด',
  true,
  false
FROM categories c WHERE c.name_th = 'วิตามิน'
ON CONFLICT (barcode) DO NOTHING;

-- 3. เพิ่มข้อมูลยาเพิ่มเติม (medicine_details)
INSERT INTO medicine_details (
  product_id,
  dosage_form,
  strength,
  dosage_instructions,
  warnings,
  active_ingredients
)
SELECT 
  p.id,
  'เม็ด',
  '500mg',
  'รับประทานครั้งละ 1-2 เม็ด ทุก 4-6 ชั่วโมง ไม่เกินวันละ 8 เม็ด',
  'ห้ามใช้ในผู้ที่แพ้พาราเซตามอล, ผู้ที่มีโรคตับรุนแรง',
  'Paracetamol 500mg'
FROM products p WHERE p.name_th = 'พาราเซตามอล 500 มก.'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO medicine_details (
  product_id,
  dosage_form,
  strength,
  dosage_instructions,
  warnings,
  active_ingredients
)
SELECT 
  p.id,
  'เม็ด',
  '10mg',
  'รับประทานวันละ 1 เม็ด ก่อนนอน',
  'อาจทำให้ง่วงนอน ไม่ควรขับรถหรือทำงานที่ต้องใช้สมาธิสูง',
  'Cetirizine Dihydrochloride 10mg'
FROM products p WHERE p.name_th = 'ยาแก้แพ้ Cetirizine 10 มก.'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO medicine_details (
  product_id,
  dosage_form,
  strength,
  dosage_instructions,
  warnings,
  active_ingredients
)
SELECT 
  p.id,
  'น้ำเชื่อม',
  '5ml',
  'รับประทานครั้งละ 1-2 ช้อนชา ทุก 4-6 ชั่วโมง',
  'ไม่ควรใช้ในเด็กอายุต่ำกว่า 2 ปี โดยไม่ปรึกษาแพทย์',
  'Guaifenesin, Dextromethorphan'
FROM products p WHERE p.name_th = 'ยาแก้ไอน้ำเชื่อม'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO medicine_details (
  product_id,
  dosage_form,
  strength,
  dosage_instructions,
  warnings,
  active_ingredients
)
SELECT 
  p.id,
  'เจล',
  '30g',
  'ทาบริเวณที่ปวดวันละ 3-4 ครั้ง',
  'ห้ามใช้บนแผลเปิด, ห้ามใช้ในเด็กอายุต่ำกว่า 12 ปี',
  'Diclofenac Sodium, Menthol'
FROM products p WHERE p.name_th = 'ยาทาแก้ปวดกล้ามเนื้อ'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO medicine_details (
  product_id,
  dosage_form,
  strength,
  dosage_instructions,
  warnings,
  active_ingredients
)
SELECT 
  p.id,
  'เม็ด',
  '1000mg',
  'รับประทานวันละ 1 เม็ด หลังอาหาร',
  'อาจทำให้ปวดท้องในบางคน ควรรับประทานหลังอาหาร',
  'Ascorbic Acid 1000mg'
FROM products p WHERE p.name_th = 'วิตามินซี 1000 มก.'
ON CONFLICT (product_id) DO NOTHING;

-- 4. ตรวจสอบว่าเพิ่มสำเร็จ
SELECT 
  p.name_th,
  p.stock_quantity,
  c.name_th as category,
  md.strength,
  md.dosage_form
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN medicine_details md ON md.product_id = p.id
WHERE p.is_active = true
ORDER BY p.created_at DESC
LIMIT 10;
