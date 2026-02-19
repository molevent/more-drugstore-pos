-- Create tax_invoices table for storing tax invoice records
CREATE TABLE IF NOT EXISTS tax_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  order_source TEXT NOT NULL DEFAULT 'pos', -- 'pos' or 'web'
  tax_invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_tax_id TEXT,
  customer_address TEXT,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_invoices_order_id ON tax_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_tax_invoice_number ON tax_invoices(tax_invoice_number);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_created_at ON tax_invoices(created_at);

-- Add RLS policies for tax_invoices table
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON tax_invoices;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON tax_invoices;

-- Create policies
CREATE POLICY "Allow all operations for authenticated users" ON tax_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users" ON tax_invoices
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add customer_tax_id and customer_address columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS customer_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS tax_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'receipt'; -- 'receipt' or 'tax_invoice'

-- Add customer_tax_id and customer_address columns to web_orders table
ALTER TABLE web_orders 
  ADD COLUMN IF NOT EXISTS customer_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS tax_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'receipt';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_orders_tax_invoice_number ON orders(tax_invoice_number);
CREATE INDEX IF NOT EXISTS idx_web_orders_tax_invoice_number ON web_orders(tax_invoice_number);
