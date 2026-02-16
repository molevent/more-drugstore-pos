-- Update fund balance for December 2568 to 542.59
UPDATE petty_cash_funds 
SET 
  initial_amount = 542.59,
  current_balance = 542.59,
  updated_at = NOW()
WHERE id = (SELECT id FROM petty_cash_funds ORDER BY created_at DESC LIMIT 1);
