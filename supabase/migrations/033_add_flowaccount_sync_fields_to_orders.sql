-- Migration: Add FlowAccount sync tracking fields to orders table
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS flowaccount_id INTEGER,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.flowaccount_id IS 'FlowAccount cash invoice ID (from API response)';
COMMENT ON COLUMN orders.flowaccount_synced_at IS 'Last synced to FlowAccount timestamp';
