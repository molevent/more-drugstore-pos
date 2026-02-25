-- Add 'cross_channel_stock' to sale_alert_logs alert_type CHECK constraint
-- Run this in Supabase SQL Editor

-- Drop old constraint and add new one with cross_channel_stock
ALTER TABLE sale_alert_logs 
  DROP CONSTRAINT IF EXISTS sale_alert_logs_alert_type_check;

ALTER TABLE sale_alert_logs 
  ADD CONSTRAINT sale_alert_logs_alert_type_check 
  CHECK (alert_type IN ('out_of_stock', 'low_stock', 'expiry', 'expired', 'custom', 'cross_channel_stock'));
