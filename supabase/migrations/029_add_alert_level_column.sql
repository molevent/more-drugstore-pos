-- Migration: Add missing alert_level column to stock_alerts
-- Created: 2026-02-12

-- Add alert_level column if it doesn't exist
ALTER TABLE public.stock_alerts
ADD COLUMN IF NOT EXISTS alert_level VARCHAR(20);

COMMENT ON COLUMN public.stock_alerts.alert_level IS 'Alert severity level: warning, critical';
