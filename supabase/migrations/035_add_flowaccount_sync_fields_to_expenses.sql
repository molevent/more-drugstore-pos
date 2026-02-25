-- Migration: Add FlowAccount sync tracking fields to expenses table
-- Created: Feb 25, 2026

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS flowaccount_id INTEGER,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN expenses.flowaccount_id IS 'FlowAccount expense document ID (from API response)';
COMMENT ON COLUMN expenses.flowaccount_synced_at IS 'Last synced to FlowAccount timestamp';
