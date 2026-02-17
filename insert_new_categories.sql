-- Insert new expense categories
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code) VALUES
  ('ค่าธรรมเนียม Kbank', 'ค่าธรรมเนียมธนาคารกสิกรไทย', 'kbank,ธนาคาร,ค่าธรรมเนียม', '#22C55E', NULL, true, 'KBANK_FEE'),
  ('ค่าแช่ง Shopee', 'ค่าแช่งสินค้าใน Shopee', 'shopee,แช่ง,ค่าแช่ง', '#F97316', NULL, true, 'SHOPEE_FEE'),
  ('ค่าธรรมเนียม shopee', 'ค่าธรรมเนียมการขายใน Shopee', 'shopee,ธรรมเนียม,ค่าธรรมเนียม', '#F97316', NULL, true, 'SHOPEE_COMMISSION'),
  ('ค่า Service Fee Grab', 'ค่าบริการ Grab', 'grab,service,fee,บริการ', '#15803D', NULL, true, 'GRAB_FEE'),
  ('ค่าส่ง ปช. [EMS]', 'ค่าส่งพัสดุ EMS', 'ems,ค่าส่ง,ไปรษณีย์', '#FB7185', NULL, true, 'EMS_SHIPPING'),
  ('วัสดุ', 'วัสดุสำหรับร้านค้า', 'วัสดุ,material', '#FB7185', NULL, true, 'MATERIAL'),
  ('ซื้อสินค้า', 'ค่าซื้อสินค้าเพื่อขาย', 'ซื้อสินค้า,สินค้า,stock', '#FB7185', NULL, true, 'BUY_PRODUCT'),
  ('ค่าแสงเอฟแชน [Kerry,Flash]', 'ค่าส่งพัสดุ Kerry/Flash', 'kerry,flash,ค่าส่ง,ขนส่ง', '#FB7185', NULL, true, 'KERRY_FLASH_SHIPPING'),
  ('อุปกรณ์สำนักงาน', 'อุปกรณ์สำนักงาน', 'อุปกรณ์,สำนักงาน,equipment,office', '#FB7185', NULL, true, 'OFFICE_EQUIPMENT'),
  ('วัสถุสำนักงาน', 'วัสถุสำนักงาน', 'วัสถุ,สำนักงาน,supplies', '#FB7185', NULL, true, 'OFFICE_SUPPLIES')
ON CONFLICT (name) DO NOTHING;
