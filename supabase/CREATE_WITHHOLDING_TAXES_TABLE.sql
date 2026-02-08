-- Create withholding_taxes table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS withholding_taxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_date DATE NOT NULL,
  document_number TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_tax_id TEXT,
  payee_name TEXT NOT NULL,
  payee_tax_id TEXT,
  income_type TEXT NOT NULL,
  income_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on document_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_withholding_taxes_number ON withholding_taxes(document_number);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_withholding_taxes_date ON withholding_taxes(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_withholding_taxes_payer ON withholding_taxes(payer_name);
CREATE INDEX IF NOT EXISTS idx_withholding_taxes_payee ON withholding_taxes(payee_name);

-- Enable RLS
ALTER TABLE withholding_taxes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to manage withholding taxes
CREATE POLICY "Enable all access for authenticated users" 
  ON withholding_taxes FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withholding_taxes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_withholding_taxes_updated_at ON withholding_taxes;

CREATE TRIGGER update_withholding_taxes_updated_at 
  BEFORE UPDATE ON withholding_taxes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_withholding_taxes_updated_at();

COMMENT ON TABLE withholding_taxes IS 'Stores withholding tax records (หัก ณ ที่จ่าย) - 50 ทวิ';
COMMENT ON COLUMN withholding_taxes.document_number IS 'Document number (e.g., WT-001)';
COMMENT ON COLUMN withholding_taxes.payer_name IS 'Name of the payer (ผู้จ่ายเงิน)';
COMMENT ON COLUMN withholding_taxes.payer_tax_id IS 'Tax ID of the payer (13 digits)';
COMMENT ON COLUMN withholding_taxes.payee_name IS 'Name of the payee (ผู้รับเงิน)';
COMMENT ON COLUMN withholding_taxes.payee_tax_id IS 'Tax ID of the payee (13 digits)';
COMMENT ON COLUMN withholding_taxes.income_type IS 'Type of income (e.g., ค่าจ้าง, ค่าบริการ, ค่าเช่า)';
COMMENT ON COLUMN withholding_taxes.income_amount IS 'Gross income amount before tax';
COMMENT ON COLUMN withholding_taxes.tax_rate IS 'Withholding tax rate in percent';
COMMENT ON COLUMN withholding_taxes.tax_amount IS 'Calculated tax amount';
COMMENT ON COLUMN withholding_taxes.payment_date IS 'Date when the payment was made';
