-- Add FlowAccount sync fields to tax_invoices table
ALTER TABLE tax_invoices
ADD COLUMN IF NOT EXISTS flowaccount_id INTEGER,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN tax_invoices.flowaccount_id IS 'FlowAccount tax invoice document ID (from API response)';
COMMENT ON COLUMN tax_invoices.flowaccount_synced_at IS 'Last synced to FlowAccount timestamp';
