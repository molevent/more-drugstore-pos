-- Add is_newly_imported column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_newly_imported BOOLEAN DEFAULT FALSE;

-- Add status column if not exists (for pending approval workflow)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- Add import tracking columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS import_source TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_expenses_is_newly_imported ON expenses(is_newly_imported);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_import_batch_id ON expenses(import_batch_id);
