-- Add FlowAccount sync fields to payment_vouchers table
ALTER TABLE payment_vouchers
ADD COLUMN IF NOT EXISTS flowaccount_id INTEGER,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN payment_vouchers.flowaccount_id IS 'FlowAccount expense document ID (synced as expense)';
COMMENT ON COLUMN payment_vouchers.flowaccount_synced_at IS 'Last synced to FlowAccount timestamp';
