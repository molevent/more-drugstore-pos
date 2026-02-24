-- Migration: Add FlowAccount sync tracking fields to contacts table
-- Created: Feb 24, 2026

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS flowaccount_id INTEGER,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN contacts.flowaccount_id IS 'FlowAccount contact ID (from API response)';
COMMENT ON COLUMN contacts.flowaccount_synced_at IS 'Last synced to FlowAccount timestamp';
