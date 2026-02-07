-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    address TEXT,
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_stock table for tracking stock by warehouse
CREATE TABLE IF NOT EXISTS product_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- Create stock_transfers table for tracking transfers between warehouses
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    quantity INTEGER NOT NULL,
    transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default warehouses
INSERT INTO warehouses (name, code, is_main, is_active) VALUES
  ('คลังสินค้าหลัก', 'MAIN', true, true),
  ('คลังสินค้าสาขา 2', 'BRANCH2', false, true),
  ('คลังสินค้า Fulfillment', 'FULFILLMENT', false, true),
  ('คลังสินค้าเก่า/ชำรุด', 'DAMAGED', false, true)
ON CONFLICT (code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_stock_product_id ON product_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_warehouse_id ON product_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_product_id ON stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_warehouse ON stock_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_warehouse ON stock_transfers(to_warehouse_id);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on warehouses" ON warehouses
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on product_stock" ON product_stock
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on stock_transfers" ON stock_transfers
    FOR ALL USING (true) WITH CHECK (true);

-- Migrate existing product stock to main warehouse
-- Note: Run this after the main warehouse is created
-- INSERT INTO product_stock (product_id, warehouse_id, quantity, min_stock_level)
-- SELECT p.id, w.id, p.stock_quantity, p.min_stock_level
-- FROM products p
-- CROSS JOIN (SELECT id FROM warehouses WHERE is_main = true LIMIT 1) w
-- ON CONFLICT (product_id, warehouse_id) DO NOTHING;
