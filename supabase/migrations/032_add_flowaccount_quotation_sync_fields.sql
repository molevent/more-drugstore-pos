-- Migration: Add FlowAccount sync tracking fields to quotations table
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS flowaccount_id INTEGER,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN quotations.flowaccount_id IS 'FlowAccount quotation ID (from API response)';
COMMENT ON COLUMN quotations.flowaccount_synced_at IS 'Last synced to FlowAccount timestamp';
