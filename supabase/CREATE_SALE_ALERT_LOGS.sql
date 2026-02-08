-- Create sale_alert_logs table for tracking alerts during sales
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sale_alert_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('out_of_stock', 'low_stock', 'expiry', 'expired', 'custom')),
  alert_title TEXT NOT NULL,
  alert_message TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sale_alert_logs_created_at ON sale_alert_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_alert_logs_acknowledged ON sale_alert_logs(acknowledged);
CREATE INDEX IF NOT EXISTS idx_sale_alert_logs_product_id ON sale_alert_logs(product_id);

-- Enable RLS (Row Level Security)
ALTER TABLE sale_alert_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all authenticated users to read sale_alert_logs"
  ON sale_alert_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert sale_alert_logs"
  ON sale_alert_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update sale_alert_logs"
  ON sale_alert_logs FOR UPDATE
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE sale_alert_logs IS 'เก็บประวัติการแจ้งเตือนที่เกิดขึ้นขณะขายสินค้า (POS)';
