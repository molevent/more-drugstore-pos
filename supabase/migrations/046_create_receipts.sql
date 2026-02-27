-- Create receipts table for ใบเสร็จรับเงิน
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_type VARCHAR(30) NOT NULL DEFAULT 'other' CHECK (receipt_type IN ('from_tax_invoice', 'other')),
  customer_name VARCHAR(255),
  customer_tax_id VARCHAR(50),
  customer_address TEXT,
  description TEXT,
  subtotal NUMERIC(12,2) DEFAULT 0,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  payment_method VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipt items: links to tax_invoices or manual line items
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  tax_invoice_id UUID REFERENCES tax_invoices(id),
  description TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON receipts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON receipt_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id);

NOTIFY pgrst, 'reload schema';
