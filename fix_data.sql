-- ลบข้อมูลเก่าที่ไม่ใช่ธันวาคม 2568 หรือ มกราคม 2569
DELETE FROM petty_cash_expenses 
WHERE expense_date < '2024-12-01';

-- หรือถ้าต้องการตรวจสอบข้อมูลก่อน
-- SELECT * FROM petty_cash_expenses WHERE expense_date < '2024-12-01' ORDER BY expense_date;
