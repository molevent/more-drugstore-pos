-- Create online_orders table for tracking purchase orders (ใบสั่งซื้อ)
CREATE TABLE IF NOT EXISTS online_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tax_number VARCHAR(100),
  order_number VARCHAR(100),
  seller_name VARCHAR(255),
  seller_id UUID REFERENCES contacts(id),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'not_booked', 'booked', 'partial')),
  payment_method VARCHAR(100),
  amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE online_orders ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to CRUD
CREATE POLICY "Allow all for authenticated users" ON online_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_online_orders_date ON online_orders(order_date DESC);

NOTIFY pgrst, 'reload schema';
