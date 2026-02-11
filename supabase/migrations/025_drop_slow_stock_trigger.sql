-- Migration: Drop stock alert trigger temporarily to fix slow save
-- The trigger checks stock alerts after every insert/update which causes slowness

-- Drop the trigger that's causing slow saves
DROP TRIGGER IF EXISTS stock_alert_trigger ON public.products;

-- Note: We can re-add this later with optimized logic or run it as a background job
-- For now, stock alerts can be checked periodically via a scheduled function instead
