-- Add pdf_url column to quotations table
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create index for pdf_url
CREATE INDEX IF NOT EXISTS idx_quotations_pdf_url ON public.quotations(pdf_url);
