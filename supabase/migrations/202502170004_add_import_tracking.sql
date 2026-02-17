-- Migration: Add import tracking columns to expenses table
-- Created: 2025-02-17

-- Add import tracking columns to prevent duplicate imports

-- Source tracking
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS import_batch_id TEXT,
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'manual';

-- Add comment for import tracking
COMMENT ON COLUMN expenses.import_batch_id IS 'Unique identifier for this import batch';
COMMENT ON COLUMN expenses.imported_at IS 'Timestamp when this record was imported';
COMMENT ON COLUMN expenses.import_source IS 'Source of import: manual, google_sheets, csv, etc.';

-- Create index for faster duplicate checking by sheet_id
CREATE INDEX IF NOT EXISTS idx_expenses_sheet_id ON expenses(sheet_id) 
WHERE sheet_id IS NOT NULL;

-- Create index for import batch queries
CREATE INDEX IF NOT EXISTS idx_expenses_import_batch ON expenses(import_batch_id) 
WHERE import_batch_id IS NOT NULL;
