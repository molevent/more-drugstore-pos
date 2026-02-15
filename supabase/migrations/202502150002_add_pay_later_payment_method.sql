-- Add "ชำระภายหลัง" (Pay Later) payment method
INSERT INTO public.payment_methods (name, description, is_active, sort_order)
VALUES ('ชำระภายหลัง', 'ชำระเงินภายหลัง (เครดิต/ผ่อนชำระ)', true, 999)
ON CONFLICT (name) DO NOTHING;

-- Also add English version for consistency
INSERT INTO public.payment_methods (name, description, is_active, sort_order)
VALUES ('Pay Later', 'Pay later / Credit / Installment', true, 1000)
ON CONFLICT (name) DO NOTHING;
