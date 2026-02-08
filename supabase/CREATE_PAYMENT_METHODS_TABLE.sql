-- Create payment_methods table for POS payment options
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE payment_methods IS 'Payment methods available for POS checkout';

-- Create index
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_sort ON payment_methods(sort_order);

-- Insert default payment methods
INSERT INTO payment_methods (name, description, sort_order, is_active) VALUES
('เงินสด', 'ชำระด้วยเงินสด', 1, true),
('QR - ถุงเงิน', 'ชำระด้วย QR Code ถุงเงิน', 2, true),
('โอนเงินกรุงไทย', 'โอนเงินเข้าบัญชีกรุงไทย', 3, true),
('บัตรเครดิต-mPOS', 'รูดบัตรเครดิตผ่าน mPOS', 4, true),
('QR - K SHOP', 'ชำระด้วย QR Code K SHOP', 5, true),
('โอนเงินกสิกรไทย', 'โอนเงินเข้าบัญชีกสิกรไทย', 6, true)
ON CONFLICT DO NOTHING;
