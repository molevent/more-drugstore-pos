-- More Drug Store - Seed Data
-- Migration: 003_seed_data
-- Created: 2026-01-22

-- ============================================================================
-- PLATFORMS
-- ============================================================================

INSERT INTO public.platforms (name, code, is_active) VALUES
  ('Walk-in (ร้าน)', 'WALKIN', true),
  ('Shopee', 'SHOPEE', true),
  ('Lazada', 'LAZADA', true),
  ('LINE Shopping', 'LINE', true),
  ('Facebook', 'FACEBOOK', true),
  ('TikTok Shop', 'TIKTOK', true);

-- ============================================================================
-- CATEGORIES
-- ============================================================================

INSERT INTO public.categories (name_th, name_en, parent_id, sort_order) VALUES
  ('ยาแก้ปวด ลดไข้', 'Pain Relief & Fever', NULL, 1),
  ('ยาแก้แพ้', 'Antihistamines', NULL, 2),
  ('ยาระบบทางเดินอาหาร', 'Digestive System', NULL, 3),
  ('ยาระบบทางเดินหายใจ', 'Respiratory System', NULL, 4),
  ('วิตามินและอาหารเสริม', 'Vitamins & Supplements', NULL, 5),
  ('ยาทาภายนอก', 'Topical Medications', NULL, 6),
  ('อุปกรณ์การแพทย์', 'Medical Supplies', NULL, 7),
  ('ผลิตภัณฑ์เพื่อสุขภาพ', 'Health Products', NULL, 8);

-- ============================================================================
-- SYMPTOMS
-- ============================================================================

INSERT INTO public.symptoms (name_th, name_en, description, is_active) VALUES
  ('ปวดหัว', 'Headache', 'อาการปวดศีรษะ', true),
  ('ไข้', 'Fever', 'อุณหภูมิร่างกายสูง', true),
  ('ปวดฟัน', 'Toothache', 'อาการปวดฟัน', true),
  ('ปวดประจำเดือน', 'Menstrual Pain', 'อาการปวดท้องประจำเดือน', true),
  ('คัน', 'Itching', 'อาการคันตามผิวหนัง', true),
  ('ผื่น', 'Rash', 'ผื่นขึ้นตามผิวหนัง', true),
  ('น้ำมูกไหล', 'Runny Nose', 'มีน้ำมูกไหล', true),
  ('จาม', 'Sneezing', 'อาการจาม', true),
  ('ท้องเสีย', 'Diarrhea', 'ถ่ายเหลว', true),
  ('ท้องผูก', 'Constipation', 'ขับถ่ายยาก', true),
  ('แน่นท้อง', 'Bloating', 'ท้องอืด แน่นท้อง', true),
  ('ไอ', 'Cough', 'อาการไอ', true),
  ('เจ็บคอ', 'Sore Throat', 'คออักเสบ เจ็บคอ', true),
  ('คัดจมูก', 'Nasal Congestion', 'จมูกอุดตัน', true),
  ('ปวดกล้ามเนื้อ', 'Muscle Pain', 'อาการปวดกล้ามเนื้อ', true),
  ('ปวดหลัง', 'Back Pain', 'อาการปวดหลัง', true),
  ('ปวดข้อ', 'Joint Pain', 'อาการปวดข้อ', true);

-- ============================================================================
-- PRODUCTS
-- ============================================================================

-- Get category IDs
DO $$
DECLARE
  cat_pain_relief UUID;
  cat_antihistamine UUID;
  cat_digestive UUID;
  cat_respiratory UUID;
  cat_vitamins UUID;
  cat_topical UUID;
  cat_medical_supplies UUID;
  
  platform_walkin UUID;
  
  product_paracetamol UUID;
  product_vitamin_c UUID;
  product_antihistamine UUID;
  product_antidiarrheal UUID;
  product_mask UUID;
  product_alcohol_gel UUID;
  product_nasal_spray UUID;
  product_cough_syrup UUID;
  product_bandage UUID;
  product_muscle_gel UUID;
  product_ibuprofen UUID;
  product_omeprazole UUID;
  product_vitamin_b UUID;
  product_vitamin_d UUID;
  product_thermometer UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_pain_relief FROM public.categories WHERE name_en = 'Pain Relief & Fever';
  SELECT id INTO cat_antihistamine FROM public.categories WHERE name_en = 'Antihistamines';
  SELECT id INTO cat_digestive FROM public.categories WHERE name_en = 'Digestive System';
  SELECT id INTO cat_respiratory FROM public.categories WHERE name_en = 'Respiratory System';
  SELECT id INTO cat_vitamins FROM public.categories WHERE name_en = 'Vitamins & Supplements';
  SELECT id INTO cat_topical FROM public.categories WHERE name_en = 'Topical Medications';
  SELECT id INTO cat_medical_supplies FROM public.categories WHERE name_en = 'Medical Supplies';
  
  SELECT id INTO platform_walkin FROM public.platforms WHERE code = 'WALKIN';

  -- Insert Products
  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456789', 'MED-001', 'พาราเซตามอล 500mg', 'Paracetamol 500mg', 'ยาแก้ปวด ลดไข้', 'Pain relief and fever reducer', cat_pain_relief, 5.00, 3.00, 500, 100, 'เม็ด', true)
    RETURNING id INTO product_paracetamol;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456790', 'VIT-001', 'วิตามินซี 1000mg', 'Vitamin C 1000mg', 'วิตามินซีชนิดเม็ดฟู่', 'Effervescent vitamin C tablets', cat_vitamins, 150.00, 100.00, 200, 50, 'กล่อง', true)
    RETURNING id INTO product_vitamin_c;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456791', 'MED-002', 'คลอร์เฟนิรามีน 4mg', 'Chlorpheniramine 4mg', 'ยาแก้อาการแพ้', 'Antihistamine for allergies', cat_antihistamine, 25.00, 15.00, 300, 80, 'เม็ด', true)
    RETURNING id INTO product_antihistamine;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456792', 'MED-003', 'โลเปอราไมด์ 2mg', 'Loperamide 2mg', 'ยาบรรเทาอาการท้องเสีย', 'Anti-diarrheal medication', cat_digestive, 35.00, 20.00, 150, 50, 'เม็ด', true)
    RETURNING id INTO product_antidiarrheal;

  INSERT INTO public.products (barcode, sku, name_th, name_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456793', 'SUP-001', 'หน้ากากอนามัย', 'Surgical Mask', cat_medical_supplies, 2.50, 1.50, 1000, 200, 'ชิ้น', true)
    RETURNING id INTO product_mask;

  INSERT INTO public.products (barcode, sku, name_th, name_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456794', 'SUP-002', 'แอลกอฮอล์เจล 70%', 'Alcohol Gel 70%', cat_medical_supplies, 45.00, 30.00, 250, 60, 'ขวด', true)
    RETURNING id INTO product_alcohol_gel;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456795', 'MED-004', 'ออกซีเมทาโซลีน 0.05%', 'Oxymetazoline 0.05%', 'ยาพ่นจมูกแก้คัดจมูก', 'Nasal decongestant spray', cat_respiratory, 120.00, 80.00, 80, 30, 'ขวด', true)
    RETURNING id INTO product_nasal_spray;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456796', 'MED-005', 'เด็กซ์โทรเมทอร์แฟน', 'Dextromethorphan Syrup', 'น้ำยาแก้ไอ', 'Cough suppressant syrup', cat_respiratory, 85.00, 55.00, 120, 40, 'ขวด', true)
    RETURNING id INTO product_cough_syrup;

  INSERT INTO public.products (barcode, sku, name_th, name_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456797', 'SUP-003', 'พลาสเตอร์ปิดแผล', 'Adhesive Bandage', cat_medical_supplies, 15.00, 8.00, 400, 100, 'กล่อง', true)
    RETURNING id INTO product_bandage;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456798', 'TOP-001', 'ยาทาแก้ปวดกล้ามเนื้อ', 'Muscle Pain Relief Gel', 'ยาทาบรรเทาอาการปวดกล้ามเนื้อ', cat_topical, 95.00, 60.00, 100, 30, 'หลอด', true)
    RETURNING id INTO product_muscle_gel;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456799', 'MED-006', 'ไอบูโพรเฟน 400mg', 'Ibuprofen 400mg', 'ยาแก้ปวด ลดการอักเสบ', 'Anti-inflammatory pain reliever', cat_pain_relief, 8.00, 5.00, 400, 100, 'เม็ด', true)
    RETURNING id INTO product_ibuprofen;

  INSERT INTO public.products (barcode, sku, name_th, name_en, description_th, description_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456800', 'MED-007', 'โอเมพราโซล 20mg', 'Omeprazole 20mg', 'ยาลดกรดในกระเพาะอาหาร', 'Proton pump inhibitor', cat_digestive, 12.00, 7.00, 200, 60, 'เม็ด', true)
    RETURNING id INTO product_omeprazole;

  INSERT INTO public.products (barcode, sku, name_th, name_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456801', 'VIT-002', 'วิตามินบีรวม', 'Vitamin B Complex', cat_vitamins, 120.00, 80.00, 150, 50, 'กล่อง', true)
    RETURNING id INTO product_vitamin_b;

  INSERT INTO public.products (barcode, sku, name_th, name_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456802', 'VIT-003', 'วิตามินดี 1000 IU', 'Vitamin D3 1000 IU', cat_vitamins, 180.00, 120.00, 100, 40, 'กล่อง', true)
    RETURNING id INTO product_vitamin_d;

  INSERT INTO public.products (barcode, sku, name_th, name_en, category_id, base_price, cost_price, stock_quantity, min_stock_level, unit, is_active)
  VALUES
    ('8850123456803', 'SUP-004', 'เครื่องวัดไข้ดิจิตอล', 'Digital Thermometer', cat_medical_supplies, 250.00, 180.00, 50, 20, 'ชิ้น', true)
    RETURNING id INTO product_thermometer;

  -- Insert Drug Info
  INSERT INTO public.drug_info (product_id, active_ingredients, dosage, side_effects, contraindications, usage_instructions_th, usage_instructions_en, warnings, storage_info)
  VALUES
    (product_paracetamol, 'Paracetamol 500mg', '500mg per tablet', 'คลื่นไส้ อาเจียน', 'โรคตับ แพ้พาราเซตามอล', 'รับประทานครั้งละ 1-2 เม็ด ทุก 4-6 ชั่วโมง หลังอาหาร', 'Take 1-2 tablets every 4-6 hours after meals', 'ห้ามใช้เกิน 4000mg ต่อวัน', 'เก็บในที่แห้ง อุณหภูมิไม่เกิน 30°C'),
    
    (product_antihistamine, 'Chlorpheniramine Maleate 4mg', '4mg per tablet', 'ง่วงนอน ปากแห้ง', 'โรคต้อหิน โรคต่อมลูกหมากโต', 'รับประทานครั้งละ 1 เม็ด วันละ 3-4 ครั้ง', 'Take 1 tablet 3-4 times daily', 'ไม่ควรขับขี่ยานพาหนะหรือทำงานที่ต้องใช้สมาธิสูง', 'เก็บในที่แห้ง ห่างจากแสงแดด'),
    
    (product_antidiarrheal, 'Loperamide HCl 2mg', '2mg per capsule', 'ท้องผูก วิงเวียน', 'ท้องเสียจากเชื้อแบคทีเรีย ลำไส้อักเสบ', 'รับประทานครั้งละ 2 เม็ด หลังถ่ายเหลวแต่ละครั้ง ไม่เกินวันละ 8 เม็ด', 'Take 2 capsules after each loose stool, max 8 capsules per day', 'ไม่ควรใช้เกิน 2 วัน หากอาการไม่ดีขึ้นควรพบแพทย์', 'เก็บในอุณหภูมิห้อง'),
    
    (product_nasal_spray, 'Oxymetazoline HCl 0.05%', '0.05% solution', 'แสบจมูก จามบ่อย', 'ความดันโลหิตสูง โรคหัวใจ', 'พ่นเข้าจมูกข้างละ 1-2 ครั้ง ทุก 10-12 ชั่วโมง', 'Spray 1-2 times in each nostril every 10-12 hours', 'ไม่ควรใช้ติดต่อกันเกิน 3 วัน อาจทำให้คัดจมูกเรื้อรัง', 'เก็บในที่แห้ง อุณหภูมิห้อง'),
    
    (product_cough_syrup, 'Dextromethorphan HBr 15mg/5ml', '15mg per 5ml', 'ง่วงนอน คลื่นไส้', 'โรคหอบหืด ไอมีเสมหะมาก', 'รับประทานครั้งละ 5-10ml ทุก 4-6 ชั่วโมง', 'Take 5-10ml every 4-6 hours', 'ห้ามใช้ในเด็กอายุต่ำกว่า 6 ปี', 'เก็บในที่แห้ง อุณหภูมิไม่เกิน 30°C'),
    
    (product_ibuprofen, 'Ibuprofen 400mg', '400mg per tablet', 'ปวดท้อง คลื่นไส้ วิงเวียน', 'แผลในกระเพาะ โรคไต แพ้ NSAIDs', 'รับประทานครั้งละ 1 เม็ด ทุก 6-8 ชั่วโมง หลังอาหาร', 'Take 1 tablet every 6-8 hours after meals', 'ไม่ควรใช้ติดต่อกันเกิน 10 วัน', 'เก็บในที่แห้ง อุณหภูมิห้อง'),
    
    (product_omeprazole, 'Omeprazole 20mg', '20mg per capsule', 'ปวดศีรษะ ท้องเสีย', 'แพ้ยากลุ่ม PPI', 'รับประทานครั้งละ 1 เม็ด ก่อนอาหารเช้า 30 นาที', 'Take 1 capsule 30 minutes before breakfast', 'ใช้ต่อเนื่องตามแพทย์สั่ง', 'เก็บในที่แห้ง ห่างจากความชื้น');

  -- Insert Product-Symptom relationships
  -- Paracetamol
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_paracetamol, id, 95 FROM public.symptoms WHERE name_en = 'Headache'
  UNION ALL
  SELECT product_paracetamol, id, 95 FROM public.symptoms WHERE name_en = 'Fever'
  UNION ALL
  SELECT product_paracetamol, id, 85 FROM public.symptoms WHERE name_en = 'Toothache'
  UNION ALL
  SELECT product_paracetamol, id, 90 FROM public.symptoms WHERE name_en = 'Menstrual Pain';

  -- Antihistamine
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_antihistamine, id, 95 FROM public.symptoms WHERE name_en = 'Itching'
  UNION ALL
  SELECT product_antihistamine, id, 90 FROM public.symptoms WHERE name_en = 'Rash'
  UNION ALL
  SELECT product_antihistamine, id, 85 FROM public.symptoms WHERE name_en = 'Runny Nose'
  UNION ALL
  SELECT product_antihistamine, id, 80 FROM public.symptoms WHERE name_en = 'Sneezing';

  -- Antidiarrheal
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_antidiarrheal, id, 95 FROM public.symptoms WHERE name_en = 'Diarrhea';

  -- Nasal Spray
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_nasal_spray, id, 95 FROM public.symptoms WHERE name_en = 'Nasal Congestion'
  UNION ALL
  SELECT product_nasal_spray, id, 70 FROM public.symptoms WHERE name_en = 'Runny Nose';

  -- Cough Syrup
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_cough_syrup, id, 95 FROM public.symptoms WHERE name_en = 'Cough'
  UNION ALL
  SELECT product_cough_syrup, id, 70 FROM public.symptoms WHERE name_en = 'Sore Throat';

  -- Muscle Gel
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_muscle_gel, id, 95 FROM public.symptoms WHERE name_en = 'Muscle Pain'
  UNION ALL
  SELECT product_muscle_gel, id, 90 FROM public.symptoms WHERE name_en = 'Back Pain'
  UNION ALL
  SELECT product_muscle_gel, id, 85 FROM public.symptoms WHERE name_en = 'Joint Pain';

  -- Ibuprofen
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_ibuprofen, id, 90 FROM public.symptoms WHERE name_en = 'Headache'
  UNION ALL
  SELECT product_ibuprofen, id, 85 FROM public.symptoms WHERE name_en = 'Fever'
  UNION ALL
  SELECT product_ibuprofen, id, 95 FROM public.symptoms WHERE name_en = 'Muscle Pain'
  UNION ALL
  SELECT product_ibuprofen, id, 95 FROM public.symptoms WHERE name_en = 'Joint Pain'
  UNION ALL
  SELECT product_ibuprofen, id, 90 FROM public.symptoms WHERE name_en = 'Menstrual Pain';

  -- Omeprazole
  INSERT INTO public.product_symptoms (product_id, symptom_id, relevance_score)
  SELECT product_omeprazole, id, 85 FROM public.symptoms WHERE name_en = 'Bloating';

  -- Insert Platform Prices (Walk-in prices same as base price)
  INSERT INTO public.platform_prices (product_id, platform_id, price)
  SELECT id, platform_walkin, base_price
  FROM public.products;

END $$;
