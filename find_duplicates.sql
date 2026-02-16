-- หารายการซ้ำในมกราคม 2026
SELECT 
  expense_date, 
  description, 
  amount, 
  category,
  COUNT(*) as duplicate_count
FROM petty_cash_expenses 
WHERE expense_date >= '2026-01-01' AND expense_date <= '2026-01-31'
GROUP BY expense_date, description, amount, category
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, expense_date;

-- ดูทุกรายการเรียงตามวันและคำอธิบาย
-- SELECT id, expense_date, description, amount, category
-- FROM petty_cash_expenses 
-- WHERE expense_date >= '2026-01-01' AND expense_date <= '2026-01-31'
-- ORDER BY expense_date, description, id;
