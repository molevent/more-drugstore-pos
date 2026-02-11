-- Migration: Make product fields nullable for flexible product creation
-- Allow creating products with minimal required fields (name OR sku OR barcode)

-- Make barcode nullable
ALTER TABLE public.products 
ALTER COLUMN barcode DROP NOT NULL;

-- Make sku nullable  
ALTER TABLE public.products 
ALTER COLUMN sku DROP NOT NULL;

-- Make name_th nullable
ALTER TABLE public.products 
ALTER COLUMN name_th DROP NOT NULL;

-- Make name_en nullable
ALTER TABLE public.products 
ALTER COLUMN name_en DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.products.barcode IS 'Optional product barcode - nullable for flexible product creation';
COMMENT ON COLUMN public.products.sku IS 'Optional product SKU - nullable for flexible product creation';
COMMENT ON COLUMN public.products.name_th IS 'Optional Thai product name - at least one identifier required (name_th, sku, or barcode)';
COMMENT ON COLUMN public.products.name_en IS 'Optional English product name';

-- Note: Product uniqueness should be enforced at application level
-- Users should provide at least one of: name_th, sku, or barcode
