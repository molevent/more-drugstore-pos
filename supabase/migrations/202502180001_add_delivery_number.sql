-- Migration: Add delivery_number column to expenses table
-- Created: 2025-02-18

-- Add delivery_number column for storing delivery/ใบส่งของ number
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS delivery_number TEXT;

-- Add comment for the new column
COMMENT ON COLUMN expenses.delivery_number IS 'Delivery number (เลขที่ใบส่งของ)';
