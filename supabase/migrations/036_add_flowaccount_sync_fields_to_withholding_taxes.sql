-- Add FlowAccount sync fields to withholding_taxes table
ALTER TABLE withholding_taxes
ADD COLUMN IF NOT EXISTS flowaccount_id INTEGER;
ALTER TABLE withholding_taxes
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMPTZ;
