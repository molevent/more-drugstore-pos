-- Create expenses table for tracking business expenses
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'เงินสด',
  receipt_number TEXT,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Google Sheets extended fields
  sheet_id TEXT,
  tax_invoice_number TEXT,
  document_type TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  amount_before_tax DECIMAL(10, 2),
  vat_amount DECIMAL(10, 2),
  withholding_tax DECIMAL(10, 2),
  payment_amount DECIMAL(10, 2),
  product_type TEXT,
  subcategory TEXT,
  seller_tax_id TEXT,
  requester TEXT,
  evidence_url TEXT
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to manage expenses
-- (You can modify this based on your needs - e.g., only admin roles)
CREATE POLICY "Enable all access for authenticated users" 
  ON expenses FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;

CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE expenses IS 'Stores business expenses like utilities, rent, supplies, etc.';
COMMENT ON COLUMN expenses.expense_date IS 'Date when the expense occurred';
COMMENT ON COLUMN expenses.category IS 'Expense category (e.g., ค่าน้ำ, ค่าไฟ, ค่าเช่า)';
COMMENT ON COLUMN expenses.description IS 'Description of the expense';
COMMENT ON COLUMN expenses.amount IS 'Amount in THB';
COMMENT ON COLUMN expenses.payment_method IS 'Payment method used';
COMMENT ON COLUMN expenses.receipt_number IS 'Receipt or invoice number';
COMMENT ON COLUMN expenses.vendor IS 'Vendor or supplier name';
