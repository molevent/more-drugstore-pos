-- ============================================================================
-- MIGRATION: Add discount column to web_order_items
-- ============================================================================

-- Add discount column (nullable initially, default 0)
ALTER TABLE public.web_order_items
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;

-- Update existing rows to have discount = 0
UPDATE public.web_order_items
SET discount = 0
WHERE discount IS NULL;

-- ============================================================================
-- NOTIFY
-- ============================================================================
NOTIFY pgrst, 'reload schema';
