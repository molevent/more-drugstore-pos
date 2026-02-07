-- ============================================================================
-- หมวดหมู่สินค้าใหม่ MORE DRUGSTORE POS
-- Category Structure Update Script - Hierarchical Numbering System
-- ============================================================================

-- ขั้นตอนที่ 1: ยกเลิกการเชื่อมโยงหมวดหมู่จากสินค้าทั้งหมดก่อน
UPDATE products SET category_id = NULL;

-- ขั้นตอนที่ 2: ลบหมวดหมู่เก่าทั้งหมด
DELETE FROM categories;

-- ============================================================================
-- 1. ยา (Pharmacy)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยา (Pharmacy)', 'Pharmacy', NULL, 1);

-- 1.1 ยาควบคุม (Prescription Drugs)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาควบคุม (Prescription Drugs)', 'Prescription Drugs', 
  (SELECT id FROM categories WHERE name_th = 'ยา (Pharmacy)'), 1);

-- 1.1.1 - 1.1.8 ยาควบคุม แยกตามกลุ่มอาการ
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ปวด - ลดไข้', 'Pain Relief - Antipyretics', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้แพ้', 'Anti-Allergic', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินหายใจ', 'Respiratory Medicine', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 3);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ไอ - ขับเสมหะ', 'Cough Medicine - Expectorants', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 4);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินอาหาร', 'Gastrointestinal Medicine', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 5);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาแก้ปวด (External Analgesic)', 'External Analgesic', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 6);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาภายนอกอื่นๆ (Skin / Topical)', 'Skin / Topical Medicines', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 7);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาคุม', 'Contraceptives', 
  (SELECT id FROM categories WHERE name_th = 'ยาควบคุม (Prescription Drugs)'), 8);

-- 1.2 ยาสามัญ / ยาไม่ควบคุม (OTC)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาสามัญ / ยาไม่ควบคุม (OTC)', 'OTC (Over-the-Counter)', 
  (SELECT id FROM categories WHERE name_th = 'ยา (Pharmacy)'), 2);

-- 1.2.1 - 1.2.8 ยาสามัญ แยกตามกลุ่มอาการ
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ปวด - ลดไข้', 'Pain Relief - Antipyretics', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้แพ้', 'Anti-Allergic', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินหายใจ', 'Respiratory Medicine', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 3);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ไอ - ขับเสมหะ', 'Cough Medicine - Expectorants', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 4);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินอาหาร', 'Gastrointestinal Medicine', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 5);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาแก้ปวด (External Analgesic)', 'External Analgesic', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 6);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาภายนอกอื่นๆ (Skin / Topical)', 'Skin / Topical Medicines', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 7);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาคุม', 'Contraceptives', 
  (SELECT id FROM categories WHERE name_th = 'ยาสามัญ / ยาไม่ควบคุม (OTC)'), 8);

-- ============================================================================
-- 2. อุปกรณ์ทางการแพทย์ (Medical Supplies)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อุปกรณ์ทางการแพทย์ (Medical Supplies)', 'Medical Supplies', NULL, 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อุปกรณ์ตรวจวัด', 'Diagnostic Equipment', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์ (Medical Supplies)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เวชภัณฑ์ทำแผล', 'Wound Care Supplies', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์ (Medical Supplies)'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อุปกรณ์พยุงร่างกาย / กายภาพ (Support / Cane)', 'Support & Physical Therapy', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์ (Medical Supplies)'), 3);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('หน้ากากและถุงมือ', 'Masks & Gloves', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์ (Medical Supplies)'), 4);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ATK Test Kit', 'ATK Test Kit', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์ (Medical Supplies)'), 5);

-- ============================================================================
-- 3. วิตามินและอาหารเสริม (Vitamins & Supplements)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('วิตามินและอาหารเสริม (Vitamins & Supplements)', 'Vitamins & Supplements', NULL, 3);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('วิตามิน (Vitamins)', 'Vitamins', 
  (SELECT id FROM categories WHERE name_th = 'วิตามินและอาหารเสริม (Vitamins & Supplements)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อาหารเสริม (Supplements)', 'Supplements', 
  (SELECT id FROM categories WHERE name_th = 'วิตามินและอาหารเสริม (Vitamins & Supplements)'), 2);

-- ============================================================================
-- 4. สุขภาพและความงาม (Health & Beauty)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สุขภาพและความงาม (Health & Beauty)', 'Health & Beauty', NULL, 4);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เวชสำอาง (Drugstore Cosmetics)', 'Drugstore Cosmetics', 
  (SELECT id FROM categories WHERE name_th = 'สุขภาพและความงาม (Health & Beauty)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เคาน์เตอร์แบรนด์ (Counter Brand)', 'Counter Brand', 
  (SELECT id FROM categories WHERE name_th = 'สุขภาพและความงาม (Health & Beauty)'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ของใช้ส่วนตัว (Personal Care)', 'Personal Care', 
  (SELECT id FROM categories WHERE name_th = 'สุขภาพและความงาม (Health & Beauty)'), 3);

-- 4.3.x หมวดย่อยของใช้ส่วนตัว
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('แชมพู / ครีมนวด', 'Shampoo / Conditioner', 
  (SELECT id FROM categories WHERE name_th = 'ของใช้ส่วนตัว (Personal Care)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สบู่ / ผลิตภัณฑ์ดูแลผิวกาย', 'Soap / Body Care', 
  (SELECT id FROM categories WHERE name_th = 'ของใช้ส่วนตัว (Personal Care)'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาสีฟัน / ดูแลช่องปาก', 'Toothpaste / Oral Care', 
  (SELECT id FROM categories WHERE name_th = 'ของใช้ส่วนตัว (Personal Care)'), 3);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ผลิตภัณฑ์ดูแลเส้นผม', 'Hair Care Products', 
  (SELECT id FROM categories WHERE name_th = 'ของใช้ส่วนตัว (Personal Care)'), 4);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ผ้าอนามัย', 'Sanitary Products', 
  (SELECT id FROM categories WHERE name_th = 'ของใช้ส่วนตัว (Personal Care)'), 5);

-- ============================================================================
-- 5. ผลิตภัณฑ์เพื่อชีวิตคู่ (Sexual Health)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ผลิตภัณฑ์เพื่อชีวิตคู่ (Sexual Health)', 'Sexual Health', NULL, 5);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ถุงยางอนามัย (Condoms)', 'Condoms', 
  (SELECT id FROM categories WHERE name_th = 'ผลิตภัณฑ์เพื่อชีวิตคู่ (Sexual Health)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เจลหล่อลื่น (Lubricants)', 'Lubricants', 
  (SELECT id FROM categories WHERE name_th = 'ผลิตภัณฑ์เพื่อชีวิตคู่ (Sexual Health)'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ชุดตรวจครรภ์ (Pregnancy Test Kits)', 'Pregnancy Test Kits', 
  (SELECT id FROM categories WHERE name_th = 'ผลิตภัณฑ์เพื่อชีวิตคู่ (Sexual Health)'), 3);

-- ============================================================================
-- 6. อาหารและเครื่องดื่มเพื่อสุขภาพ (Food & Beverage)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อาหารและเครื่องดื่มเพื่อสุขภาพ (Food & Beverage)', 'Food & Beverage', NULL, 6);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เครื่องดื่ม', 'Beverages', 
  (SELECT id FROM categories WHERE name_th = 'อาหารและเครื่องดื่มเพื่อสุขภาพ (Food & Beverage)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ขนม (Snacks)', 'Snacks', 
  (SELECT id FROM categories WHERE name_th = 'อาหารและเครื่องดื่มเพื่อสุขภาพ (Food & Beverage)'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('นมทางการแพทย์ (Medical Nutrition)', 'Medical Nutrition', 
  (SELECT id FROM categories WHERE name_th = 'อาหารและเครื่องดื่มเพื่อสุขภาพ (Food & Beverage)'), 3);

-- ============================================================================
-- 7. สินค้าของฝาก / ของที่ระลึก (Souvenirs)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สินค้าของฝาก / ของที่ระลึก (Souvenirs)', 'Souvenirs', NULL, 7);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สินค้าสมุนไพร/ยาหม่องเซ็ต', 'Herbal Products / Balm Sets', 
  (SELECT id FROM categories WHERE name_th = 'สินค้าของฝาก / ของที่ระลึก (Souvenirs)'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สินค้าของที่ระลึกอื่นๆ', 'Other Souvenir Items', 
  (SELECT id FROM categories WHERE name_th = 'สินค้าของฝาก / ของที่ระลึก (Souvenirs)'), 2);

-- ============================================================================
-- 8. สินค้าเบ็ดเตล็ด (ETC / Miscellaneous)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สินค้าเบ็ดเตล็ด (ETC / Miscellaneous)', 'ETC / Miscellaneous', NULL, 8);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ของใช้จิปาถะอื่นๆ', 'Other Miscellaneous Items', 
  (SELECT id FROM categories WHERE name_th = 'สินค้าเบ็ดเตล็ด (ETC / Miscellaneous)'), 1);

-- ============================================================================
-- แสดงผลลัพธ์การอัพเดต
-- ============================================================================
SELECT 
  c.name_th,
  c.name_en,
  p.name_th as parent_category,
  c.sort_order
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id
ORDER BY c.sort_order, p.sort_order;
