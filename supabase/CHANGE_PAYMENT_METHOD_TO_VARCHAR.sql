-- Change payment_method column from enum to varchar to accept any payment method name
ALTER TABLE orders 
ALTER COLUMN payment_method TYPE VARCHAR(100);

-- Add comment
COMMENT ON COLUMN orders.payment_method IS 'Payment method name (e.g., เงินสด, บัตรเครดิต, QR Code)';
