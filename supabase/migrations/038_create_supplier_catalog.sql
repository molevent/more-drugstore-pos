-- Supplier Catalog: maps supplier bill product names to barcodes/products
-- When OCR scans a bill, it can look up the bill product name in this catalog
-- to instantly find the matching product by barcode, without fuzzy matching.
-- This builds up automatically as users match products during OCR scanning.

CREATE TABLE IF NOT EXISTS supplier_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name text NOT NULL,                    -- e.g. 'Pharmacare Plus', 'BUYMED SIAM CO., LTD.'
  bill_product_name text NOT NULL,                -- Name as it appears on the bill (e.g. 'sol.NIZORAL SHAMPOO 200 ML')
  product_name_full text,                         -- Full product name for reference
  barcode text,                                   -- Product barcode (e.g. '5036631005140')
  sku text,                                       -- Product SKU if different from barcode
  unit text,                                      -- Unit from bill (e.g. 'ขวด', 'กล่อง')
  unit_price numeric,                             -- Last known unit price from bill
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,  -- Link to product in system
  match_count integer DEFAULT 1,                  -- How many times this mapping has been used
  last_matched_at timestamptz DEFAULT now(),       -- When this mapping was last used
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_name, bill_product_name)
);

-- Enable RLS
ALTER TABLE supplier_catalog ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access to supplier_catalog"
  ON supplier_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast lookups by supplier name
CREATE INDEX idx_supplier_catalog_supplier 
  ON supplier_catalog(supplier_name);

-- Index for fast lookups by barcode
CREATE INDEX idx_supplier_catalog_barcode 
  ON supplier_catalog(barcode);

-- Index for product_id lookups
CREATE INDEX idx_supplier_catalog_product 
  ON supplier_catalog(product_id);

-- Full text search on bill product name for fuzzy matching
CREATE INDEX idx_supplier_catalog_bill_name 
  ON supplier_catalog USING gin(to_tsvector('simple', bill_product_name));
