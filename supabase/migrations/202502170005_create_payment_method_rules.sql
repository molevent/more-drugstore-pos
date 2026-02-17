-- Migration: Create payment method rules table
-- Created: 2025-02-17

-- Table for payment method auto-selection rules based on keywords
CREATE TABLE IF NOT EXISTS payment_method_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for table
COMMENT ON TABLE payment_method_rules IS 'Rules for auto-selecting payment method based on expense description keywords';

-- Add comments for columns
COMMENT ON COLUMN payment_method_rules.keyword IS 'Keyword to search in expense description (case-insensitive)';
COMMENT ON COLUMN payment_method_rules.payment_method IS 'Payment method to auto-select when keyword is found';
COMMENT ON COLUMN payment_method_rules.priority IS 'Rule priority - higher number = checked first';
COMMENT ON COLUMN payment_method_rules.is_active IS 'Whether this rule is active';

-- Create index for faster keyword lookups
CREATE INDEX IF NOT EXISTS idx_payment_method_rules_keyword ON payment_method_rules(keyword);

-- Create index for active rules
CREATE INDEX IF NOT EXISTS idx_payment_method_rules_active ON payment_method_rules(is_active) WHERE is_active = true;

-- Insert default rules
INSERT INTO payment_method_rules (keyword, payment_method, priority, is_active) VALUES
  ('service fee', 'บัตรเครดิต', 10, true),
  ('grab', 'บัตรเครดิต', 10, true),
  ('lazada', 'บัตรเครดิต', 10, true),
  ('shopee', 'บัตรเครดิต', 10, true),
  ('โอน', 'โอนเงิน', 5, true),
  ('transfer', 'โอนเงิน', 5, true),
  ('เงินสด', 'เงินสด', 5, true),
  ('cash', 'เงินสด', 5, true)
ON CONFLICT DO NOTHING;
