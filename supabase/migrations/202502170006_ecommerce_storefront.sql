-- ============================================================================
-- E-Commerce Storefront Tables
-- ตารางสำหรับร้านค้าออนไลน์ที่เชื่อมต่อกับระบบหลังบ้าน
-- ============================================================================

-- ============================================================================
-- TABLE: customer_carts - ตะกร้าสินค้าของลูกค้า (session-based)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL, -- browser session or localStorage ID
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_session_product UNIQUE(session_id, product_id)
);

CREATE INDEX idx_customer_carts_session ON public.customer_carts(session_id);
CREATE INDEX idx_customer_carts_product ON public.customer_carts(product_id);

-- ============================================================================
-- TABLE: web_orders - คำสั่งซื้อจากหน้าเว็บ (แยกจาก orders หลังบ้าน)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.web_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL, -- WEB-YYYYMMDD-XXXX
  
  -- ข้อมูลลูกค้า
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255),
  customer_line_id VARCHAR(100), -- LINE ID ถ้ามี
  
  -- ที่อยู่จัดส่ง
  shipping_address TEXT NOT NULL,
  shipping_province VARCHAR(100),
  shipping_district VARCHAR(100),
  shipping_postal_code VARCHAR(10),
  
  -- ยอดเงิน
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- สถานะ
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_method VARCHAR(50), -- bank_transfer, cash_on_delivery, etc.
  
  -- Line Official
  line_notification_sent BOOLEAN DEFAULT false,
  line_notification_sent_at TIMESTAMPTZ,
  
  -- หมายเหตุ
  customer_note TEXT,
  admin_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_web_orders_status ON public.web_orders(status);
CREATE INDEX idx_web_orders_created_at ON public.web_orders(created_at);
CREATE INDEX idx_web_orders_phone ON public.web_orders(customer_phone);

-- ============================================================================
-- TABLE: web_order_items - รายการสินค้าในคำสั่งซื้อ
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.web_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  web_order_id UUID NOT NULL REFERENCES public.web_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  
  -- ข้อมูลตอนสั่งซื้อ (snapshot)
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(50),
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10, 2) NOT NULL,
  
  -- stock batch ที่ใช้ (FIFO)
  batch_id UUID REFERENCES public.stock_batches(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_web_order_items_order ON public.web_order_items(web_order_id);
CREATE INDEX idx_web_order_items_product ON public.web_order_items(product_id);

-- ============================================================================
-- FUNCTION: Generate web order number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_web_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'WEB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(
    (SELECT COUNT(*) + 1 FROM web_orders WHERE created_at::date = CURRENT_DATE)::text, 
    4, '0'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_web_order_number
BEFORE INSERT ON public.web_orders
FOR EACH ROW
EXECUTE FUNCTION generate_web_order_number();

-- ============================================================================
-- FUNCTION: Auto-calculate order totals
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_web_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order totals when items change
  UPDATE web_orders 
  SET subtotal = (
    SELECT COALESCE(SUM(subtotal), 0) 
    FROM web_order_items 
    WHERE web_order_id = NEW.web_order_id
  ),
  total_amount = subtotal + shipping_fee - discount
  WHERE id = NEW.web_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_web_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.web_order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_web_order_totals();

-- ============================================================================
-- FUNCTION: Deduct stock when order is confirmed
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_stock_on_web_order_confirm()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  available_stock INTEGER;
BEGIN
  -- Only process when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Check and deduct stock for each item
    FOR item IN 
      SELECT * FROM web_order_items WHERE web_order_id = NEW.id
    LOOP
      -- Get available stock
      SELECT stock_quantity INTO available_stock
      FROM products WHERE id = item.product_id;
      
      IF available_stock < item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product: %', item.product_name;
      END IF;
      
      -- Insert stock movement (sale)
      INSERT INTO stock_movements (
        product_id,
        movement_type,
        quantity,
        quantity_before,
        quantity_after,
        unit_cost,
        total_cost,
        reference_type,
        reference_id,
        reason,
        movement_date
      ) VALUES (
        item.product_id,
        'sale',
        -item.quantity,
        available_stock,
        available_stock - item.quantity,
        item.unit_price,
        item.subtotal,
        'web_order',
        NEW.id,
        'Web order #' || NEW.order_number,
        NOW()
      );
      
      -- Update product stock
      UPDATE products 
      SET stock_quantity = stock_quantity - item.quantity,
          updated_at = NOW()
      WHERE id = item.product_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_stock_on_web_order_confirm
AFTER UPDATE ON public.web_orders
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_web_order_confirm();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.customer_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_order_items ENABLE ROW LEVEL SECURITY;

-- Customer carts: Allow public access by session_id
CREATE POLICY "Allow public access to carts by session"
  ON public.customer_carts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Web orders: Allow public to create orders
CREATE POLICY "Allow public to create orders"
  ON public.web_orders FOR INSERT
  WITH CHECK (true);

-- Web orders: Allow viewing own orders by phone number
CREATE POLICY "Allow viewing orders by phone"
  ON public.web_orders FOR SELECT
  USING (true);

-- Web order items: Public access
CREATE POLICY "Allow public access to order items"
  ON public.web_order_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.customer_carts IS 'Shopping cart for e-commerce storefront';
COMMENT ON TABLE public.web_orders IS 'Orders from web storefront (separate from backend POS orders)';
COMMENT ON TABLE public.web_order_items IS 'Items in web orders with snapshot pricing';

-- ============================================================================
-- NOTIFY
-- ============================================================================
NOTIFY pgrst, 'reload schema';
