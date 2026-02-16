-- เช็คทุกรายการในธันวาคม 2568
SELECT expense_date, description, amount, category 
FROM petty_cash_expenses 
WHERE expense_date >= '2024-12-01' AND expense_date <= '2024-12-31'
ORDER BY expense_date;
