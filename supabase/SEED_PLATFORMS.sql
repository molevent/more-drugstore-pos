-- Insert platforms data for sales channels
INSERT INTO platforms (id, name, slug) VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'หน้าร้าน', 'walk-in'),
  ('a2222222-2222-2222-2222-222222222222', 'GRAB', 'grab'),
  ('a3333333-3333-3333-3333-333333333333', 'SHOPEE', 'shopee'),
  ('a4444444-4444-4444-4444-444444444444', 'LINEMAN', 'lineman'),
  ('a5555555-5555-5555-5555-555555555555', 'LAZADA', 'lazada'),
  ('a6666666-6666-6666-6666-666666666666', 'LINE Shopping', 'line_shopping'),
  ('a7777777-7777-7777-7777-777777777777', 'TikTok', 'tiktok'),
  ('a8888888-8888-8888-8888-888888888888', 'เว็บไซต์', 'website')
ON CONFLICT (id) DO NOTHING;
