-- Make platform_id nullable in orders table
ALTER TABLE orders 
ALTER COLUMN platform_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN orders.platform_id IS 'Platform/channel UUID (optional) - references platforms table';
