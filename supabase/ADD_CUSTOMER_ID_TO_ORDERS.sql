-- Add customer_id column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN orders.customer_id IS 'Reference to the customer/contact who made the order';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
