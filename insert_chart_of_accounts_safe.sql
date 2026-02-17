-- Insert expense categories from Chart of Accounts (ผังบัญชี)
-- Starting from รายจ่ายซื้อสินค้าเพื่อขาย onwards
-- Skip if name or code already exists

-- 51xxxxx รายจ่ายซื้อสินค้าเพื่อขาย (Cost of Goods Sold)
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ซื้อสินค้า', 'ซื้อสินค้าเพื่อขาย', 'ซื้อสินค้า,สินค้า,stock,COGS', '#EF4444', '51000', true, 'BUY_PRODUCTS'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ซื้อสินค้า' OR code = 'BUY_PRODUCTS');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าขนส่งสินค้า', 'ค่าขนส่งสินค้า', 'ขนส่ง,สินค้า,logistics', '#EF4444', '51100', true, 'SHIPPING_PRODUCTS'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าขนส่งสินค้า' OR code = 'SHIPPING_PRODUCTS');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าภาษีซื้อไม่สามารถหักได้', 'ค่าภาษีซื้อที่ไม่สามารถหักได้', 'ภาษีซื้อ,VAT,ไม่หักได้', '#EF4444', '51200', true, 'NON_DEDUCTIBLE_VAT'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าภาษีซื้อไม่สามารถหักได้' OR code = 'NON_DEDUCTIBLE_VAT');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าบริการจากตัวแทน/ลูกค้า', 'ค่าบริการจากตัวแทนหรือลูกค้า', 'ตัวแทน,ลูกค้า,agent,commission', '#EF4444', '51300', true, 'AGENT_SERVICE_FEE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าบริการจากตัวแทน/ลูกค้า' OR code = 'AGENT_SERVICE_FEE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าใช้จ่ายอื่น', 'ค่าใช้จ่ายอื่นๆ ที่เกี่ยวข้องกับการซื้อสินค้า', 'ค่าใช้จ่ายอื่น,other,expense', '#EF4444', '51400', true, 'OTHER_COGS'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าใช้จ่ายอื่น' OR code = 'OTHER_COGS');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ส่วนลดรับ', 'ส่วนลดที่ได้รับจากการซื้อสินค้า', 'ส่วนลด,discount,รับ', '#10B981', '51500', true, 'PURCHASE_DISCOUNT'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ส่วนลดรับ' OR code = 'PURCHASE_DISCOUNT');

-- 52xxxxx ค่าใช้จ่ายในการขาย (Selling Expenses)
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าโฆษณาและประชาสัมพันธ์', 'ค่าโฆษณาและการประชาสัมพันธ์', 'โฆษณา,ประชาสัมพันธ์,ads,marketing', '#F97316', '52001', true, 'ADVERTISING'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าโฆษณาและประชาสัมพันธ์' OR code = 'ADVERTISING');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าคอมมิชชั่น', 'ค่าคอมมิชชั่นตัวแทนขาย', 'คอมมิชชั่น,commission,ตัวแทน', '#F97316', '52002', true, 'COMMISSION'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าคอมมิชชั่น' OR code = 'COMMISSION');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าบรรจุภัณฑ์', 'ค่าบรรจุภัณฑ์และวัสดุแพ็คกิ้ง', 'บรรจุภัณฑ์,แพ็คกิ้ง,packaging', '#F97316', '52003', true, 'PACKAGING'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าบรรจุภัณฑ์' OR code = 'PACKAGING');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าขนส่งสินค้า', 'ค่าขนส่งสินค้าให้ลูกค้า', 'ขนส่ง,ลูกค้า,shipping,delivery', '#F97316', '52004', true, 'CUSTOMER_SHIPPING'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าขนส่งสินค้า' OR code = 'CUSTOMER_SHIPPING');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าจัดส่ง', 'ค่าจัดส่งสินค้า', 'จัดส่ง,delivery,ส่งสินค้า', '#F97316', '52005', true, 'DELIVERY_FEE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าจัดส่ง' OR code = 'DELIVERY_FEE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียม Shopee', 'ค่าธรรมเนียมแพลตฟอร์ม Shopee', 'shopee,ธรรมเนียม,platform', '#F97316', '52006', true, 'SHOPEE_FEE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียม Shopee' OR code = 'SHOPEE_FEE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียม Lazada', 'ค่าธรรมเนียมแพลตฟอร์ม Lazada', 'lazada,ธรรมเนียม,platform', '#F97316', '52007', true, 'LAZADA_FEE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียม Lazada' OR code = 'LAZADA_FEE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียม TikTok Shop', 'ค่าธรรมเนียมแพลตฟอร์ม TikTok Shop', 'tiktok,ธรรมเนียม,platform', '#F97316', '52008', true, 'TIKTOK_FEE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียม TikTok Shop' OR code = 'TIKTOK_FEE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียม Grab', 'ค่าธรรมเนียมแพลตฟอร์ม Grab', 'grab,ธรรมเนียม,platform,grab wallet', '#F97316', '52009', true, 'GRAB_FEE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียม Grab' OR code = 'GRAB_FEE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียม LINE SHOPPING', 'ค่าธรรมเนียมแพลตฟอร์ม LINE', 'line,ธรรมเนียม,platform', '#F97316', '52010', true, 'LINE_FEE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียม LINE SHOPPING' OR code = 'LINE_FEE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าใช้จ่ายอื่นในการขาย', 'ค่าใช้จ่ายอื่นๆ ในการขาย', 'ค่าใช้จ่ายอื่น,other,selling', '#F97316', '52100', true, 'OTHER_SELL_EXP'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าใช้จ่ายอื่นในการขาย' OR code = 'OTHER_SELL_EXP');

-- 53xxxxx ค่าใช้จ่ายในการบริหาร (Administrative Expenses)
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าเช่าสำนักงาน', 'ค่าเช่าพื้นที่สำนักงานและร้านค้า', 'เช่า,rent,สำนักงาน,office', '#3B82F6', '53001', true, 'OFFICE_RENT'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าเช่าสำนักงาน' OR code = 'OFFICE_RENT');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าไฟฟ้า', 'ค่าไฟฟ้าสำนักงานและร้านค้า', 'ไฟฟ้า,electricity,utilities', '#3B82F6', '53002', true, 'ELECTRICITY'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าไฟฟ้า' OR code = 'ELECTRICITY');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าน้ำ', 'ค่าน้ำประปาสำนักงานและร้านค้า', 'น้ำ,water,ประปา,utilities', '#3B82F6', '53003', true, 'WATER'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าน้ำ' OR code = 'WATER');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าโทรศัพท์', 'ค่าโทรศัพท์และอินเทอร์เน็ต', 'โทรศัพท์,phone,internet', '#3B82F6', '53004', true, 'PHONE_NET'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าโทรศัพท์' OR code = 'PHONE_NET');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าวัสดุสำนักงาน', 'ค่าวัสดุสำนักงานและเครื่องเขียน', 'วัสดุ,office,supplies,เครื่องเขียน', '#3B82F6', '53005', true, 'OFFICE_SUPP'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าวัสดุสำนักงาน' OR code = 'OFFICE_SUPP');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าซ่อมแซมและบำรุงรักษา', 'ค่าซ่อมแซมและบำรุงรักษาอุปกรณ์', 'ซ่อมแซม,บำรุงรักษา,maintenance,repair', '#3B82F6', '53006', true, 'MAINTENANCE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าซ่อมแซมและบำรุงรักษา' OR code = 'MAINTENANCE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าเบี้ยประกัน', 'ค่าเบี้ยประกันภัยต่างๆ', 'ประกัน,insurance,เบี้ยประกัน', '#3B82F6', '53007', true, 'INSURANCE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าเบี้ยประกัน' OR code = 'INSURANCE');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าทำความสะอาด', 'ค่าทำความสะอาดและแม่บ้าน', 'ทำความสะอาด,cleaning,แม่บ้าน', '#3B82F6', '53008', true, 'CLEANING'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าทำความสะอาด' OR code = 'CLEANING');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าความปลอดภัย', 'ค่ารักษาความปลอดภัยและรปภ.', 'รปภ.,security,ความปลอดภัย,guard', '#3B82F6', '53009', true, 'SECURITY'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าความปลอดภัย' OR code = 'SECURITY');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่านิติกรและกฎหมาย', 'ค่าบริการทนายความและที่ปรึกษากฎหมาย', 'กฎหมาย,lawyer,legal,ทนาย', '#3B82F6', '53010', true, 'LEGAL'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่านิติกรและกฎหมาย' OR code = 'LEGAL');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าบัญชี', 'ค่าบริการสำนักงานบัญชี', 'บัญชี,accounting,accountant', '#3B82F6', '53011', true, 'ACCOUNTING'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าบัญชี' OR code = 'ACCOUNTING');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าปรึกษา', 'ค่าบริการที่ปรึกษา', 'ที่ปรึกษา,consultant,consulting', '#3B82F6', '53012', true, 'CONSULTING'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าปรึกษา' OR code = 'CONSULTING');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าอบรมและสัมนา', 'ค่าอบรมพนักงานและสัมนา', 'อบรม,training,สัมนา,seminar', '#3B82F6', '53013', true, 'TRAINING'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าอบรมและสัมนา' OR code = 'TRAINING');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าใช้จ่ายอื่นในการบริหาร', 'ค่าใช้จ่ายอื่นๆ ในการบริหาร', 'ค่าใช้จ่ายอื่น,other,administrative', '#3B82F6', '53100', true, 'OTHER_ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าใช้จ่ายอื่นในการบริหาร' OR code = 'OTHER_ADMIN');

-- 54xxxxx รายจ่ายอื่น (Other Expenses)
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าใช้จ่ายอื่น', 'รายจ่ายอื่นๆ ที่ไม่เข้ากลุ่ม', 'ค่าใช้จ่ายอื่น,other,miscellaneous', '#8B5CF6', '54000', true, 'OTHER_EXP'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าใช้จ่ายอื่น' OR code = 'OTHER_EXP');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าปรับและเสียหาย', 'ค่าปรับและค่าเสียหายต่างๆ', 'ปรับ,penalty,เสียหาย,damage', '#8B5CF6', '54100', true, 'PENALTIES'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าปรับและเสียหาย' OR code = 'PENALTIES');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าใช้จ่ายเงินสดย่อย', 'ค่าใช้จ่ายจากเงินสดย่อย', 'เงินสดย่อย,petty cash,เบิกจ่าย', '#8B5CF6', '54200', true, 'PETTY_CASH'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าใช้จ่ายเงินสดย่อย' OR code = 'PETTY_CASH');

-- 55xxxxx ค่าใช้จ่ายทางการเงิน (Finance Expenses)
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียมธนาคาร', 'ค่าธรรมเนียมการทำธุรกรรมธนาคาร', 'ธรรมเนียม,bank,ธนาคาร,kbank,scb,ktb', '#06B6D4', '55001', true, 'BANK_FEES'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียมธนาคาร' OR code = 'BANK_FEES');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าดอกเบี้ยจ่าย', 'ค่าดอกเบี้ยจากการกู้ยืม', 'ดอกเบี้ย,interest,กู้,loan', '#06B6D4', '55002', true, 'INTEREST'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าดอกเบี้ยจ่าย' OR code = 'INTEREST');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียมบัตรเครดิต', 'ค่าธรรมเนียมรูดบัตรเครดิต', 'บัตรเครดิต,credit card,ธรรมเนียม', '#06B6D4', '55003', true, 'CREDIT_CARD'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียมบัตรเครดิต' OR code = 'CREDIT_CARD');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าธรรมเนียมโอนเงิน', 'ค่าธรรมเนียมโอนเงิน', 'โอนเงิน,transfer,ธรรมเนียม', '#06B6D4', '55004', true, 'TRANSFER'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าธรรมเนียมโอนเงิน' OR code = 'TRANSFER');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าใช้จ่ายทางการเงินอื่น', 'ค่าใช้จ่ายทางการเงินอื่นๆ', 'ค่าใช้จ่ายอื่น,other,finance', '#06B6D4', '55100', true, 'OTHER_FINANCE'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าใช้จ่ายทางการเงินอื่น' OR code = 'OTHER_FINANCE');

-- 56xxxxx ค่าใช้จ่ายบุคลากร (Personnel Expenses)
INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'เงินเดือน', 'เงินเดือนพนักงาน', 'เงินเดือน,salary,พนักงาน,payroll', '#EC4899', '56001', true, 'SALARY'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'เงินเดือน' OR code = 'SALARY');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าล่วงเวลา', 'ค่าล่วงเวลาและค่าทำงานนอกเวลา', 'OT,overtime,ล่วงเวลา', '#EC4899', '56002', true, 'OVERTIME'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าล่วงเวลา' OR code = 'OVERTIME');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าคอมมิชชั่นพนักงาน', 'ค่าคอมมิชชั่นพนักงานขาย', 'คอมมิชชั่น,commission,พนักงาน', '#EC4899', '56003', true, 'STAFF_COMM'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าคอมมิชชั่นพนักงาน' OR code = 'STAFF_COMM');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าโบนัส', 'ค่าโบนัสและรางวัลพนักงาน', 'โบนัส,bonus,รางวัล', '#EC4899', '56004', true, 'BONUS'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าโบนัส' OR code = 'BONUS');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าสวัสดิการ', 'ค่าสวัสดิการพนักงาน', 'สวัสดิการ,benefits', '#EC4899', '56005', true, 'BENEFITS'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าสวัสดิการ' OR code = 'BENEFITS');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าประกันสังคม', 'ค่าประกันสังคมนายจ้าง', 'ประกันสังคม,social security', '#EC4899', '56006', true, 'SSO'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าประกันสังคม' OR code = 'SSO');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'เงินสมทบกองทุนสำรองเลี้ยงชีพ', 'เงินสมทบกองทุนสำรองเลี้ยงชีพ', 'กองทุน,provident fund', '#EC4899', '56007', true, 'PVF'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'เงินสมทบกองทุนสำรองเลี้ยงชีพ' OR code = 'PVF');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าอบรมพนักงาน', 'ค่าอบรมและพัฒนาพนักงาน', 'อบรม,training', '#EC4899', '56008', true, 'HR_TRAIN'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าอบรมพนักงาน' OR code = 'HR_TRAIN');

INSERT INTO public.expense_categories (name, description, keywords, color, chart_of_accounts_code, is_active, code)
SELECT 'ค่าใช้จ่ายบุคลากรอื่น', 'ค่าใช้จ่ายบุคลากรอื่นๆ', 'ค่าใช้จ่ายอื่น,other,personnel', '#EC4899', '56100', true, 'OTHER_HR'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'ค่าใช้จ่ายบุคลากรอื่น' OR code = 'OTHER_HR');
