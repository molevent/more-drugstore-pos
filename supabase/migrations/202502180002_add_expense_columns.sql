-- Migration: Add withholding tax and payment voucher columns to expenses table
-- Created: 2025-02-18

-- Add withholding_mode column
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS withholding_mode TEXT;

COMMENT ON COLUMN expenses.withholding_mode IS 'Withholding tax mode: หัก ณ ที่จ่าย, ออกให้ตลอดไป, ไม่มี';

-- Add withholding_percent column  
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS withholding_percent TEXT;

COMMENT ON COLUMN expenses.withholding_percent IS 'Withholding tax percentage';

-- Add payment_voucher_id column (foreign key to payment_vouchers)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS payment_voucher_id UUID REFERENCES payment_vouchers(id);

COMMENT ON COLUMN expenses.payment_voucher_id IS 'Reference to associated payment voucher';
