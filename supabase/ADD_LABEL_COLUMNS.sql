-- Add label columns to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products
ADD COLUMN IF NOT EXISTS label_dosage_instructions_th TEXT,
ADD COLUMN IF NOT EXISTS label_special_instructions_th TEXT,
ADD COLUMN IF NOT EXISTS label_dosage_instructions_en TEXT,
ADD COLUMN IF NOT EXISTS label_special_instructions_en TEXT,
ADD COLUMN IF NOT EXISTS label_custom_line1 TEXT,
ADD COLUMN IF NOT EXISTS label_custom_line2 TEXT,
ADD COLUMN IF NOT EXISTS label_custom_line3 TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.label_dosage_instructions_th IS 'Dosage instructions in Thai for label printing';
COMMENT ON COLUMN products.label_special_instructions_th IS 'Special instructions/warnings in Thai for label printing';
COMMENT ON COLUMN products.label_dosage_instructions_en IS 'Dosage instructions in English for label printing';
COMMENT ON COLUMN products.label_special_instructions_en IS 'Special instructions/warnings in English for label printing';
COMMENT ON COLUMN products.label_custom_line1 IS 'Custom label line 1';
COMMENT ON COLUMN products.label_custom_line2 IS 'Custom label line 2';
COMMENT ON COLUMN products.label_custom_line3 IS 'Custom label line 3';
