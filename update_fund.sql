-- Update the initial fund amount to 492.59 (carried over from Dec 2568)
UPDATE petty_cash_funds 
SET 
  initial_amount = 492.59,
  current_balance = 492.59,
  updated_at = NOW()
WHERE id = (SELECT id FROM petty_cash_funds ORDER BY created_at DESC LIMIT 1);

-- Add income record for the carried over amount
INSERT INTO petty_cash_expenses (
  fund_id,
  expense_date,
  amount,
  category,
  description,
  status
) 
SELECT 
  id,
  '2025-01-01',
  -492.59,
  'income',
  'ยอดเงินยกมาจากเดือนธันวาคม 2568',
  'approved'
FROM petty_cash_funds 
ORDER BY created_at DESC 
LIMIT 1;
