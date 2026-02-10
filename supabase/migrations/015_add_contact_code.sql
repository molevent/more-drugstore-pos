-- Add code field to contacts table for ZortOut customercode
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Add index for code lookups
CREATE INDEX IF NOT EXISTS idx_contacts_code ON contacts(code);

-- Add comment
COMMENT ON COLUMN contacts.code IS 'Customer/Supplier code for ZortOut integration';
