-- Create contacts table for managing buyers, sellers, and both
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('buyer', 'seller', 'both')),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    company_name VARCHAR(255),
    tax_id VARCHAR(13),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- Add RLS policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to authenticated users" ON contacts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO contacts (name, type, phone, email, address, company_name, tax_id, notes) VALUES
('ร้านขายยาดีเภสัช', 'seller', '02-123-4567', 'contact@deepharmacy.com', '123 ถนนสุขุมวิท กรุงเทพฯ', 'บริษัท ดีเภสัช จำกัด', '1234567890123', 'ผู้จำหน่ายหลัก'),
('คลินิกหมอสมชาย', 'buyer', '02-987-6543', 'clinic@example.com', '456 ถนนราชดำริ กรุงเทพฯ', 'คลินิกสมชาย', '0987654321098', 'ลูกค้าประจำ'),
('ร้านขายยาเพชรบุรี', 'both', '02-555-8888', 'pharmacy@example.com', '789 ถนนเพชรบุรี กรุงเทพฯ', 'ร้านขายยาเพชรบุรี', '5555555555555', 'ซื้อขายร่วมกัน');
