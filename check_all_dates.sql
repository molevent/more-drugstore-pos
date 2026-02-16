-- เช็ครายการทั้งหมดที่อาจกระทบยอดยกมา
SELECT expense_date, description, amount, category 
FROM petty_cash_expenses 
WHERE (expense_date >= '2024-12-01' AND expense_date <= '2025-01-31')
   OR (expense_date >= '2025-01-01' AND expense_date <= '2025-01-01')
ORDER BY expense_date, category;

-- หรือดูสรุปตามเดือน
-- SELECT 
--   DATE_TRUNC('month', expense_date::date) as month,
--   category,
--   SUM(CASE WHEN category = 'income' THEN ABS(amount) ELSE amount END) as total
-- FROM petty_cash_expenses 
-- GROUP BY DATE_TRUNC('month', expense_date::date), category
-- ORDER BY month, category;
