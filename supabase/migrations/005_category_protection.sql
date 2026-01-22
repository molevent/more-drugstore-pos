-- Add category deletion protection
-- Migration: 005_category_protection
-- Created: 2026-01-22

-- Create a function to check if category has products before deletion
CREATE OR REPLACE FUNCTION check_category_has_products()
RETURNS TRIGGER AS $$
DECLARE
  product_count INTEGER;
BEGIN
  -- Count products in this category
  SELECT COUNT(*) INTO product_count
  FROM public.products
  WHERE category_id = OLD.id;
  
  -- If category has products, prevent deletion
  IF product_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete category: % products are using this category', product_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check before category deletion
DROP TRIGGER IF EXISTS prevent_category_deletion_with_products ON public.categories;
CREATE TRIGGER prevent_category_deletion_with_products
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION check_category_has_products();

-- Insert default "Uncategorized" category if it doesn't exist
INSERT INTO public.categories (id, name_th, name_en, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'ไม่มีหมวดหมู่',
  'Uncategorized',
  9999
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON FUNCTION check_category_has_products() IS 'Prevents deletion of categories that have products';
