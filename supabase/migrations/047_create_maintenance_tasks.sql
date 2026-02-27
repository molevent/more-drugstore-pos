-- Migration: Create maintenance_tasks table for store maintenance scheduling
-- This table tracks recurring and one-time maintenance tasks like cleaning, AC service, pest control, etc.

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  -- Scheduling
  frequency TEXT NOT NULL DEFAULT 'once', -- once, daily, weekly, biweekly, monthly, quarterly, yearly
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  -- Recurrence tracking
  last_completed_date DATE,
  next_due_date DATE,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  -- Assignment & cost
  assigned_to TEXT,
  vendor_name TEXT,
  vendor_phone TEXT,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(10,2) DEFAULT 0,
  -- Completion
  completed_date TIMESTAMP WITH TIME ZONE,
  completed_by TEXT,
  completion_notes TEXT,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all access to maintenance_tasks" ON maintenance_tasks
  FOR ALL USING (true) WITH CHECK (true);

-- Index for calendar queries
CREATE INDEX idx_maintenance_tasks_scheduled_date ON maintenance_tasks(scheduled_date);
CREATE INDEX idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX idx_maintenance_tasks_category ON maintenance_tasks(category);
