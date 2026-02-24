-- Migration: Add new fields to contacts table for enhanced contact form
-- Created: Feb 23, 2026

-- Add new columns to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS person_type VARCHAR(20) CHECK (person_type IN ('individual', 'company')),
ADD COLUMN IF NOT EXISTS sub_types TEXT[],
ADD COLUMN IF NOT EXISTS credit_days INTEGER,
ADD COLUMN IF NOT EXISTS business_location VARCHAR(20) CHECK (business_location IN ('thailand', 'foreign')),
ADD COLUMN IF NOT EXISTS national_id VARCHAR(13),
ADD COLUMN IF NOT EXISTS office_type VARCHAR(20) CHECK (office_type IN ('headquarters', 'branch')),
ADD COLUMN IF NOT EXISTS branch_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(5),
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);

-- Add bank information columns
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_branch_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_branch_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('savings', 'current')),
ADD COLUMN IF NOT EXISTS bank_qr_code_url TEXT;

-- Create storage bucket for contact attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-attachments', 'contact-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policy for contact-attachments bucket
CREATE POLICY "Allow all access to authenticated users" ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'contact-attachments')
    WITH CHECK (bucket_id = 'contact-attachments');

-- Add comments for documentation
COMMENT ON COLUMN contacts.person_type IS 'ประเภทผู้ติดต่อ: individual (บุคคลธรรมดา) หรือ company (นิติบุคคล)';
COMMENT ON COLUMN contacts.sub_types IS 'ประเภทย่อย: buyer (ลูกค้า), fuel_payer (ผู้จ่ายน้ำมัน), ฯลฯ';
COMMENT ON COLUMN contacts.credit_days IS 'จำนวนวันเครดิต';
COMMENT ON COLUMN contacts.business_location IS 'ที่ตั้งธุรกิจ: thailand หรือ foreign';
COMMENT ON COLUMN contacts.national_id IS 'เลขบัตรประชาชน 13 หลัก';
COMMENT ON COLUMN contacts.office_type IS 'สำนักงาน/สาขา: headquarters หรือ branch';
COMMENT ON COLUMN contacts.branch_code IS 'รหัสสาขา (ถ้าเป็นสาขา)';
COMMENT ON COLUMN contacts.postal_code IS 'รหัสไปรษณีย์ 5 หลัก';
COMMENT ON COLUMN contacts.shipping_address IS 'ที่อยู่จัดส่ง (ถ้าแตกต่างจากที่อยู่ปกติ)';
COMMENT ON COLUMN contacts.mobile IS 'เบอร์มือถือ';
COMMENT ON COLUMN contacts.bank_name IS 'ชื่อธนาคาร';
COMMENT ON COLUMN contacts.bank_account_name IS 'ชื่อบัญชีธนาคาร';
COMMENT ON COLUMN contacts.bank_account_number IS 'เลขที่บัญชีธนาคาร';
COMMENT ON COLUMN contacts.bank_branch_code IS 'รหัสสาขาธนาคาร';
COMMENT ON COLUMN contacts.bank_branch_name IS 'ชื่อสาขาธนาคาร';
COMMENT ON COLUMN contacts.bank_account_type IS 'ประเภทบัญชี: savings (ออมทรัพย์) หรือ current (กระแสรายวัน)';
COMMENT ON COLUMN contacts.bank_qr_code_url IS 'URL ของ QR Code สำหรับรับเงิน';
