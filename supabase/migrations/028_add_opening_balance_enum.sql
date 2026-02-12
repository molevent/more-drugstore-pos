-- Migration: Add opening_balance to stock_movement_type enum
-- Created: 2026-02-12

-- Add opening_balance to the stock_movement_type enum
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'opening_balance';
