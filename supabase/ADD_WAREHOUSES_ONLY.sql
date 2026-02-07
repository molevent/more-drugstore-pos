-- Add warehouses (if not exists)
INSERT INTO warehouses (name, code, is_main, is_active) VALUES
  ('คลังสินค้าหลัก', 'MAIN', true, true),
  ('คลังสินค้าสาขา 2', 'BRANCH2', false, true),
  ('คลังสินค้า Fulfillment', 'FULFILLMENT', false, true),
  ('คลังสินค้าเก่า/ชำรุด', 'DAMAGED', false, true)
ON CONFLICT (code) DO NOTHING;
