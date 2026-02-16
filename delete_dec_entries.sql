-- ลบรายการเติมเงินวันที่ 1/12/2568 (2024-12-01)
DELETE FROM petty_cash_expenses 
WHERE expense_date = '2024-12-01' AND category = 'income';

-- ตรวจสอบว่าลบสำเร็จ
-- SELECT * FROM petty_cash_expenses WHERE expense_date = '2024-12-01';
