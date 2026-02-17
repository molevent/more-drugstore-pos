-- Add code column to expense_categories table
ALTER TABLE public.expense_categories
ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- Add unique constraint on code
ALTER TABLE public.expense_categories
ADD CONSTRAINT expense_categories_code_unique UNIQUE (code);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_categories_code 
ON public.expense_categories(code);
