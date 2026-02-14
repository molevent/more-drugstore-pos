-- Create product_catalogs table
CREATE TABLE IF NOT EXISTS product_catalogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  price_type TEXT DEFAULT 'retail' CHECK (price_type IN ('retail', 'wholesale')),
  show_stock_quantity BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create catalog_items table
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES product_catalogs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(catalog_id, product_id)
);

-- Enable RLS on product_catalogs
ALTER TABLE product_catalogs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on catalog_items
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- Create policy for product_catalogs
CREATE POLICY "Allow all operations on product_catalogs" ON product_catalogs
  FOR ALL USING (true) WITH CHECK (true);

-- Create policy for catalog_items
CREATE POLICY "Allow all operations on catalog_items" ON catalog_items
  FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for product_catalogs
DROP TRIGGER IF EXISTS update_product_catalogs_updated_at ON product_catalogs;
CREATE TRIGGER update_product_catalogs_updated_at
  BEFORE UPDATE ON product_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
