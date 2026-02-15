-- Create product_catalogs table
CREATE TABLE IF NOT EXISTS product_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  price_type TEXT NOT NULL DEFAULT 'retail' CHECK (price_type IN ('retail', 'wholesale')),
  show_stock_quantity BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create catalog_items table
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES product_catalogs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_catalog_items_catalog_id ON catalog_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_product_id ON catalog_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_catalogs_customer_id ON product_catalogs(customer_id);

-- Add RLS policies
ALTER TABLE product_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all" ON product_catalogs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all" ON catalog_items
  FOR ALL USING (true) WITH CHECK (true);
