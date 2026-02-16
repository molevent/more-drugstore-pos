-- เช็ครายการทั้งหมดในเดือนมกราคม 2026
SELECT expense_date, description, amount, category 
FROM petty_cash_expenses 
WHERE expense_date >= '2026-01-01' AND expense_date <= '2026-01-31'
ORDER BY expense_date, category;

-- หรือสรุปยอด
-- SELECT 
--   category,
--   SUM(CASE WHEN category = 'income' THEN ABS(amount) ELSE amount END) as total
-- FROM petty_cash_expenses 
-- WHERE expense_date >= '2026-01-01' AND expense_date <= '2026-01-31'
-- GROUP BY category;
