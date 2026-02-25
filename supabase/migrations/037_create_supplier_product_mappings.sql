-- Supplier Product Mappings: maps supplier product IDs/SKUs to our internal product IDs
-- This allows automatic matching when importing bills/invoices from suppliers like Buymed

CREATE TABLE IF NOT EXISTS supplier_product_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name text NOT NULL,              -- e.g. 'Buymed', 'Diethelm'
  supplier_product_id text NOT NULL,        -- Supplier's product ID (e.g. Buymed's 50293)
  supplier_product_name text,               -- Supplier's product name for reference
  supplier_sku text,                        -- Supplier's SKU/barcode if different
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_name, supplier_product_id)
);

-- Enable RLS
ALTER TABLE supplier_product_mappings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access to supplier_product_mappings"
  ON supplier_product_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_supplier_mappings_lookup 
  ON supplier_product_mappings(supplier_name, supplier_product_id);

CREATE INDEX idx_supplier_mappings_product 
  ON supplier_product_mappings(product_id);
