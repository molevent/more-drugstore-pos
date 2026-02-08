-- Add customer_id column to orders table (without FK constraint since contacts table may not exist)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Add comment
COMMENT ON COLUMN orders.customer_id IS 'Reference to the customer who made the order (UUID from contacts or external)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
