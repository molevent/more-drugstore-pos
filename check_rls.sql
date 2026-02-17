-- Check and fix RLS for all order tables
-- First check current policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items', 'web_orders', 'web_order_items') 
ORDER BY tablename, cmd;
