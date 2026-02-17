-- Migration: Add comprehensive employee fields
-- Created: 2025-02-17

-- Add new columns to employees table for comprehensive employee management

-- Basic Info fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_code TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS first_name_en TEXT,
ADD COLUMN IF NOT EXISTS last_name_en TEXT,
ADD COLUMN IF NOT EXISTS nickname_en TEXT,
ADD COLUMN IF NOT EXISTS id_card_number TEXT,
ADD COLUMN IF NOT EXISTS passport_number TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Employment Info fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'พนักงานทั่วไป',
ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'รายวัน',
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Contact Info fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS line_id TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Salary Info fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS daily_wage DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_security BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_condition TEXT DEFAULT 'ไม่หัก';

-- Bank Info fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS bank TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_type TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT;

-- Notes field
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for new columns
COMMENT ON COLUMN employees.employee_code IS 'รหัสพนักงาน';
COMMENT ON COLUMN employees.first_name IS 'ชื่อพนักงาน';
COMMENT ON COLUMN employees.last_name IS 'นามสกุล';
COMMENT ON COLUMN employees.nickname IS 'ชื่อเล่น';
COMMENT ON COLUMN employees.first_name_en IS 'ชื่อภาษาอังกฤษ';
COMMENT ON COLUMN employees.last_name_en IS 'นามสกุลภาษาอังกฤษ';
COMMENT ON COLUMN employees.nickname_en IS 'ชื่อเล่นภาษาอังกฤษ';
COMMENT ON COLUMN employees.id_card_number IS 'เลขบัตรประชาชน';
COMMENT ON COLUMN employees.passport_number IS 'เลขหนังสือเดินทาง';
COMMENT ON COLUMN employees.birth_date IS 'วันเกิด';
COMMENT ON COLUMN employees.department IS 'แผนก';
COMMENT ON COLUMN employees.position IS 'ตำแหน่ง';
COMMENT ON COLUMN employees.employment_type IS 'ประเภทพนักงาน (รายวัน/รายเดือน)';
COMMENT ON COLUMN employees.start_date IS 'วันเริ่มงาน';
COMMENT ON COLUMN employees.line_id IS 'Line ID';
COMMENT ON COLUMN employees.address IS 'ที่อยู่';
COMMENT ON COLUMN employees.emergency_contact_name IS 'ชื่อผู้ติดต่อฉุกเฉิน';
COMMENT ON COLUMN employees.emergency_contact_phone IS 'เบอร์ผู้ติดต่อฉุกเฉิน';
COMMENT ON COLUMN employees.daily_wage IS 'ค่าจ้างรายวัน';
COMMENT ON COLUMN employees.monthly_salary IS 'เงินเดือนรายเดือน';
COMMENT ON COLUMN employees.social_security IS 'สิทธิประกันสังคม';
COMMENT ON COLUMN employees.tax_condition IS 'เงื่อนไขการหักภาษี';
COMMENT ON COLUMN employees.payment_method IS 'ช่องทางการรับชำระ';
COMMENT ON COLUMN employees.bank IS 'ธนาคาร';
COMMENT ON COLUMN employees.bank_account_number IS 'เลขที่บัญชี';
COMMENT ON COLUMN employees.bank_account_type IS 'ประเภทบัญชี';
COMMENT ON COLUMN employees.bank_branch IS 'สาขาธนาคาร';
COMMENT ON COLUMN employees.notes IS 'หมายเหตุ';

-- Create index on employee_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);

-- Create index on department for filtering
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Create index on employment_type for filtering
CREATE INDEX IF NOT EXISTS idx_employees_type ON employees(employment_type);
