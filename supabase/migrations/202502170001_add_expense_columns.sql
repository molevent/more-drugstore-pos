-- Migration: Add missing columns to expenses table for Google Sheets import support
-- Created: 2025-02-17

-- Add columns that may be missing from the expenses table to support full Google Sheets import

-- Google Sheets extended fields
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS sheet_id TEXT,
ADD COLUMN IF NOT EXISTS tax_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS amount_before_tax DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS withholding_tax DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS seller_tax_id TEXT,
ADD COLUMN IF NOT EXISTS requester TEXT,
ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- Approval workflow fields
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add comments for new columns
COMMENT ON COLUMN expenses.sheet_id IS 'ID from Google Sheets';
COMMENT ON COLUMN expenses.tax_invoice_number IS 'Tax invoice number (เลขที่ใบกำกับภาษี)';
COMMENT ON COLUMN expenses.document_type IS 'Document type (ประเภทเอกสาร)';
COMMENT ON COLUMN expenses.quantity IS 'Quantity (จำนวน)';
COMMENT ON COLUMN expenses.unit_price IS 'Unit price (ราคาต่อหน่วย)';
COMMENT ON COLUMN expenses.amount_before_tax IS 'Amount before tax (ยอดรวมก่อนภาษี)';
COMMENT ON COLUMN expenses.vat_amount IS 'VAT amount (ภาษีมูลค่าเพิ่ม)';
COMMENT ON COLUMN expenses.withholding_tax IS 'Withholding tax (ภาษีหัก ณ ที่จ่าย)';
COMMENT ON COLUMN expenses.payment_amount IS 'Payment amount (ยอดชำระ)';
COMMENT ON COLUMN expenses.product_type IS 'Product type (ประเภทสินค้า)';
COMMENT ON COLUMN expenses.subcategory IS 'Subcategory (หมวดหมู่ย่อย)';
COMMENT ON COLUMN expenses.seller_tax_id IS 'Seller tax ID (เลขประจำตัวผู้เสียภาษีของร้านค้า)';
COMMENT ON COLUMN expenses.requester IS 'Requester (ผู้ขออนุญาตเบิกจ่าย)';
COMMENT ON COLUMN expenses.evidence_url IS 'Evidence URL (หลักฐาน)';
COMMENT ON COLUMN expenses.status IS 'Approval status: approved, pending, rejected';
COMMENT ON COLUMN expenses.source IS 'Source: manual, google_sheets';
