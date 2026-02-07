-- ============================================================================
-- หมวดหมู่สินค้าใหม่ MORE DRUGSTORE POS
-- Category Structure Update Script
-- ============================================================================

-- Clear existing categories first (cascade to products category_id will be nullified)
-- Or we can keep existing categories and just add new ones
-- Let's use a safer approach: delete all and re-insert

DELETE FROM categories;

-- ============================================================================
-- 1. ยา (Pharmacy) - Main Category
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยา', 'Pharmacy', NULL, 1);

-- 1.1 ยาควบคุม (Prescription Drugs) - Main Subcategory
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('1.1 ยาควบคุม', '1.1 Prescription Drugs', 
  (SELECT id FROM categories WHERE name_th = 'ยา'), 1);

-- 1.2 ยาสามัญ / ยาไม่ควบคุม (OTC) - Main Subcategory
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('1.2 ยาสามัญ / ยาไม่ควบคุม', '1.2 OTC (Over-the-Counter)', 
  (SELECT id FROM categories WHERE name_th = 'ยา'), 2);

-- กลุ่มอาการ - ยาแก้ปวด ลดไข้ (อยู่ใน 1.1 และ 1.2)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ปวด - ลดไข้ (RX)', 'Pain Relief - Antipyretics (RX)', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 1);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ปวด - ลดไข้ (OTC)', 'Pain Relief - Antipyretics (OTC)', 
  (SELECT id FROM categories WHERE name_th = '1.2 ยาสามัญ / ยาไม่ควบคุม'), 1);

-- กลุ่มอาการ - ยาแก้แพ้ (อยู่ใน 1.1 และ 1.2)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้แพ้ (RX)', 'Anti-Allergic (RX)', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 2);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้แพ้ (OTC)', 'Anti-Allergic (OTC)', 
  (SELECT id FROM categories WHERE name_th = '1.2 ยาสามัญ / ยาไม่ควบคุม'), 2);

-- กลุ่มอาการ - ยาระบบทางเดินหายใจ (อยู่ใน 1.1 และ 1.2)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินหายใจ (RX)', 'Respiratory Medicine (RX)', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 3);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินหายใจ (OTC)', 'Respiratory Medicine (OTC)', 
  (SELECT id FROM categories WHERE name_th = '1.2 ยาสามัญ / ยาไม่ควบคุม'), 3);

-- กลุ่มอาการ - ยาแก้ไอ ขับเสมหะ (อยู่ใน 1.1 และ 1.2)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ไอ - ขับเสมหะ (RX)', 'Cough Medicine - Expectorants (RX)', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 4);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาแก้ไอ - ขับเสมหะ (OTC)', 'Cough Medicine - Expectorants (OTC)', 
  (SELECT id FROM categories WHERE name_th = '1.2 ยาสามัญ / ยาไม่ควบคุม'), 4);

-- กลุ่มอาการ - ยาระบบทางเดินอาหาร (อยู่ใน 1.1 และ 1.2)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินอาหาร (RX)', 'Gastrointestinal Medicine (RX)', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 5);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาระบบทางเดินอาหาร (OTC)', 'Gastrointestinal Medicine (OTC)', 
  (SELECT id FROM categories WHERE name_th = '1.2 ยาสามัญ / ยาไม่ควบคุม'), 5);

-- กลุ่มอาการ - ยาทาแก้ปวด (อยู่ใน 1.1 และ 1.2)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาแก้ปวด (RX)', 'External Analgesic (RX)', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 6);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาแก้ปวด (OTC)', 'External Analgesic (OTC)', 
  (SELECT id FROM categories WHERE name_th = '1.2 ยาสามัญ / ยาไม่ควบคุม'), 6);

-- กลุ่มอาการ - ยาทาภายนอกอื่นๆ (อยู่ใน 1.1 และ 1.2)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาภายนอกอื่นๆ (RX)', 'Skin / Topical Medicines (RX)', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 7);

INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาทาภายนอกอื่นๆ (OTC)', 'Skin / Topical Medicines (OTC)', 
  (SELECT id FROM categories WHERE name_th = '1.2 ยาสามัญ / ยาไม่ควบคุม'), 7);

-- กลุ่มอาการ - ยาคุม (อยู่ใน 1.1 เท่านั้น - ยาคุมเป็นยาควบคุม)
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ยาคุม', 'Contraceptives', 
  (SELECT id FROM categories WHERE name_th = '1.1 ยาควบคุม'), 8);

-- ============================================================================
-- 2. อุปกรณ์ทางการแพทย์ (Medical Supplies)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อุปกรณ์ทางการแพทย์', 'Medical Supplies', NULL, 3);

-- อุปกรณ์ตรวจวัด
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อุปกรณ์ตรวจวัด', 'Diagnostic Equipment', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์'), 1);

-- เวชภัณฑ์ทำแผล
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เวชภัณฑ์ทำแผล', 'Wound Care Supplies', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์'), 2);

-- อุปกรณ์พยุงร่างกาย / กายภาพ
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อุปกรณ์พยุงร่างกาย / กายภาพ', 'Support & Physical Therapy', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์'), 3);

-- หน้ากากและถุงมือ
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('หน้ากากและถุงมือ', 'Masks & Gloves', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์'), 4);

-- ATK Test Kit
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ATK Test Kit', 'ATK Test Kit', 
  (SELECT id FROM categories WHERE name_th = 'อุปกรณ์ทางการแพทย์'), 5);

-- ============================================================================
-- 3. วิตามินและอาหารเสริม (Vitamins & Supplements)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('วิตามินและอาหารเสริม', 'Vitamins & Supplements', NULL, 4);

-- ============================================================================
-- 4. สุขภาพและความงาม (Health & Beauty)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สุขภาพและความงาม', 'Health & Beauty', NULL, 5);

-- 4.1 เวชสำอาง
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('4.1 เวชสำอาง', '4.1 Drugstore Cosmetics', 
  (SELECT id FROM categories WHERE name_th = 'สุขภาพและความงาม'), 1);

-- 4.2 เคาน์เตอร์แบรนด์
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('4.2 เคาน์เตอร์แบรนด์', '4.2 Counter Brand', 
  (SELECT id FROM categories WHERE name_th = 'สุขภาพและความงาม'), 2);

-- 4.3 ของใช้ส่วนตัว
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('4.3 ของใช้ส่วนตัว', '4.3 Personal Care', 
  (SELECT id FROM categories WHERE name_th = 'สุขภาพและความงาม'), 3);

-- ============================================================================
-- 5. ผลิตภัณฑ์เพื่อชีวิตคู่ (Sexual Health)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ผลิตภัณฑ์เพื่อชีวิตคู่', 'Sexual Health', NULL, 6);

-- ถุงยางอนามัย
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ถุงยางอนามัย', 'Condoms', 
  (SELECT id FROM categories WHERE name_th = 'ผลิตภัณฑ์เพื่อชีวิตคู่'), 1);

-- เจลหล่อลื่น
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เจลหล่อลื่น', 'Lubricants', 
  (SELECT id FROM categories WHERE name_th = 'ผลิตภัณฑ์เพื่อชีวิตคู่'), 2);

-- ชุดตรวจครรภ์
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ชุดตรวจครรภ์', 'Pregnancy Test Kits', 
  (SELECT id FROM categories WHERE name_th = 'ผลิตภัณฑ์เพื่อชีวิตคู่'), 3);

-- ============================================================================
-- 6. อาหารและเครื่องดื่มเพื่อสุขภาพ (Food & Beverage)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('อาหารและเครื่องดื่มเพื่อสุขภาพ', 'Food & Beverage', NULL, 7);

-- เครื่องดื่ม
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('เครื่องดื่ม', 'Beverages', 
  (SELECT id FROM categories WHERE name_th = 'อาหารและเครื่องดื่มเพื่อสุขภาพ'), 1);

-- ขนม
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('ขนม', 'Snacks', 
  (SELECT id FROM categories WHERE name_th = 'อาหารและเครื่องดื่มเพื่อสุขภาพ'), 2);

-- นมทางการแพทย์
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('นมทางการแพทย์', 'Medical Nutrition', 
  (SELECT id FROM categories WHERE name_th = 'อาหารและเครื่องดื่มเพื่อสุขภาพ'), 3);

-- ============================================================================
-- 7. สินค้าของฝาก / ของที่ระลึก (Souvenirs)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สินค้าของฝาก / ของที่ระลึก', 'Souvenirs', NULL, 8);

-- ============================================================================
-- 8. สินค้าเบ็ดเตล็ด (ETC / Miscellaneous)
-- ============================================================================
INSERT INTO categories (name_th, name_en, parent_id, sort_order) VALUES
('สินค้าเบ็ดเตล็ด', 'ETC / Miscellaneous', NULL, 9);

-- ============================================================================
-- แสดงผลลัพธ์
-- ============================================================================
SELECT 
  c.name_th,
  c.name_en,
  p.name_th as parent_category,
  c.sort_order
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id
ORDER BY c.sort_order, p.sort_order;
