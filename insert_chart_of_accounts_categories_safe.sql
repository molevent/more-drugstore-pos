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
