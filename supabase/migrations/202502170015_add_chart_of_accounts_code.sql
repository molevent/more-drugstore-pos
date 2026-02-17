-- Add chart_of_accounts_code column to expense_categories
ALTER TABLE public.expense_categories 
ADD COLUMN IF NOT EXISTS chart_of_accounts_code VARCHAR(20);
