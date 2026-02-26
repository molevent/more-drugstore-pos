-- Add is_starred column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_contacts_is_starred ON contacts(is_starred);
