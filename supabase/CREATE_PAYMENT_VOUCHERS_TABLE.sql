-- Create payment_vouchers table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS payment_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_date DATE NOT NULL,
  voucher_number TEXT NOT NULL,
  payee_name TEXT NOT NULL,
  payee_tax_id TEXT,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_in_words TEXT,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'เงินสด',
  bank_name TEXT,
  bank_account TEXT,
  check_number TEXT,
  approved_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on voucher_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_vouchers_number ON payment_vouchers(voucher_number);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_date ON payment_vouchers(voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_payee ON payment_vouchers(payee_name);

-- Enable RLS
ALTER TABLE payment_vouchers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to manage payment vouchers
CREATE POLICY "Enable all access for authenticated users" 
  ON payment_vouchers FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_payment_vouchers_updated_at ON payment_vouchers;

CREATE TRIGGER update_payment_vouchers_updated_at 
  BEFORE UPDATE ON payment_vouchers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_payment_vouchers_updated_at();

COMMENT ON TABLE payment_vouchers IS 'Stores payment vouchers (ใบสำคัญจ่าย)';
COMMENT ON COLUMN payment_vouchers.voucher_number IS 'Voucher number (e.g., PV-001)';
COMMENT ON COLUMN payment_vouchers.payee_name IS 'Name of the payee';
COMMENT ON COLUMN payment_vouchers.payee_tax_id IS 'Tax ID of the payee (13 digits)';
COMMENT ON COLUMN payment_vouchers.amount_in_words IS 'Amount written in Thai words';
COMMENT ON COLUMN payment_vouchers.approved_by IS 'Name of the person who approved the payment';
