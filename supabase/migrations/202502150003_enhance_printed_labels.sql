-- Migration: Enhance printed_labels table with batch tracking and pharmacist fields
-- Created: 2025-02-15

-- Add new columns to printed_labels table
ALTER TABLE public.printed_labels
ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS pharmacist_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS pharmacist_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS label_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_reprint BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_label_id UUID REFERENCES public.printed_labels(id);

-- Create index for faster sorting by created_at
CREATE INDEX IF NOT EXISTS idx_printed_labels_created_at ON public.printed_labels(created_at DESC);

-- Create index for batch number searches
CREATE INDEX IF NOT EXISTS idx_printed_labels_batch_no ON public.printed_labels(batch_no);

-- Create index for pharmacist lookups
CREATE INDEX IF NOT EXISTS idx_printed_labels_pharmacist ON public.printed_labels(pharmacist_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_printed_labels_updated_at
    BEFORE UPDATE ON public.printed_labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.printed_labels IS 'ประวัติการพิมพ์ฉลากยา พร้อมติดตาม batch และผู้พิมพ์';
COMMENT ON COLUMN public.printed_labels.batch_no IS 'หมายเลข batch/ Lot ของยา';
COMMENT ON COLUMN public.printed_labels.pharmacist_name IS 'ชื่อเภสัชกร/ผู้พิมพ์';
COMMENT ON COLUMN public.printed_labels.qr_code_data IS 'ข้อมูล QR code สำหรับตรวจสอบ';
COMMENT ON COLUMN public.printed_labels.created_at IS 'วันที่สร้างรายการ';
COMMENT ON COLUMN public.printed_labels.updated_at IS 'วันที่แก้ไขล่าสุด';
COMMENT ON COLUMN public.printed_labels.updated_by IS 'ผู้แก้ไขรายการ';
