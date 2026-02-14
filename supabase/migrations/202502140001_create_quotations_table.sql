-- Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_company TEXT,
  contact_address TEXT,
  contact_tax_id TEXT,
  contact_phone TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_type TEXT CHECK (tax_type IN ('inclusive', 'exclusive')) DEFAULT 'exclusive',
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  logo_url TEXT,
  stamp_url TEXT,
  show_product_images BOOLEAN DEFAULT false,
  withholding_tax BOOLEAN DEFAULT false,
  withholding_tax_percent NUMERIC(5,2) DEFAULT 0,
  withholding_tax_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quotation number
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON public.quotations(quotation_number);

-- Create index for contact_id
CREATE INDEX IF NOT EXISTS idx_quotations_contact_id ON public.quotations(contact_id);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on quotations" 
ON public.quotations FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotations_updated_at 
BEFORE UPDATE ON public.quotations 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
