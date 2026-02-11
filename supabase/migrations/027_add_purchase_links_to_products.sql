-- Migration: Add purchase links to products table
-- Created: 2026-02-12

-- Add purchase link columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS purchase_link_1 VARCHAR(500),
ADD COLUMN IF NOT EXISTS purchase_link_2 VARCHAR(500),
ADD COLUMN IF NOT EXISTS purchase_link_3 VARCHAR(500),
ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_hidden_from_purchase_report BOOLEAN NOT NULL DEFAULT false;

-- Add comments
COMMENT ON COLUMN public.products.purchase_link_1 IS 'Primary supplier purchase link';
COMMENT ON COLUMN public.products.purchase_link_2 IS 'Secondary supplier purchase link';
COMMENT ON COLUMN public.products.purchase_link_3 IS 'Tertiary supplier purchase link';
COMMENT ON COLUMN public.products.last_restocked_at IS 'Last date when product was restocked';
COMMENT ON COLUMN public.products.is_hidden_from_purchase_report IS 'Flag to hide product from purchase preparation report';
