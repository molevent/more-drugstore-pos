-- Add receipt and tax invoice tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS receipt_requested BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS receipt_printed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_invoice_requested BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_invoice_printed BOOLEAN NOT NULL DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.receipt_requested IS 'ลูกค้าขอใบเสร็จรับเงิน';
COMMENT ON COLUMN public.orders.receipt_printed IS 'พิมพ์ใบเสร็จแล้ว';
COMMENT ON COLUMN public.orders.tax_invoice_requested IS 'ลูกค้าขอใบกำกับภาษีเต็มรูป';
COMMENT ON COLUMN public.orders.tax_invoice_printed IS 'พิมพ์ใบกำกับภาษีแล้ว';
