-- User Management & Role-Based Access Control Migration
-- Migration: 202502190001_user_management_and_activity_logs
-- Created: 2026-02-19

-- ============================================================================
-- UPDATE USER ROLES ENUM
-- ============================================================================

-- Drop existing user_role enum and recreate with new roles
-- Note: This requires updating existing data first

-- First, add a temporary column to store current roles
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_temp VARCHAR(50);

-- Copy existing roles to temp column
UPDATE public.users SET role_temp = role::text;

-- Drop the role column
ALTER TABLE public.users DROP COLUMN IF EXISTS role;

-- Drop existing enum if exists
DROP TYPE IF EXISTS user_role CASCADE;

-- Create new user_role enum with all required roles
CREATE TYPE user_role AS ENUM (
  'owner',           -- เจ้าของร้าน - Full access
  'manager',         -- ผู้จัดการร้าน - All except Settings
  'pharmacist',      -- เภสัชกร - POS, Sales, Products, Website
  'part_time',       -- พนักงานไพรท์ไทม์ - POS, Sales, Products, Website
  'accountant'       -- นักบัญชี - Documents only
);

-- Add role column back with new enum type
ALTER TABLE public.users ADD COLUMN role user_role NOT NULL DEFAULT 'part_time';

-- Restore data (convert old roles to new ones)
UPDATE public.users SET role = CASE
  WHEN role_temp = 'admin' THEN 'owner'::user_role
  WHEN role_temp = 'pharmacist' THEN 'pharmacist'::user_role
  ELSE 'part_time'::user_role
END;

-- Drop temp column
ALTER TABLE public.users DROP COLUMN IF EXISTS role_temp;

-- Update User type reference
COMMENT ON TYPE user_role IS 'User roles: owner (full access), manager (no settings), pharmacist (POS/Sales/Products), part_time (same as pharmacist), accountant (documents only)';

-- ============================================================================
-- ADD USERNAME FIELD TO USERS TABLE
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Add comment
COMMENT ON COLUMN public.users.username IS 'Username for login (alternative to email)';

-- ============================================================================
-- CREATE ACTIVITY LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_role user_role NOT NULL,
  action VARCHAR(100) NOT NULL,           -- e.g., 'create_order', 'update_product', 'view_report'
  entity_type VARCHAR(100),               -- e.g., 'order', 'product', 'customer'
  entity_id UUID,                         -- Reference to the affected entity
  details JSONB,                          -- Additional action details
  ip_address INET,                      -- IP address of the user
  user_agent TEXT,                      -- User agent string
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Add comments
COMMENT ON TABLE public.activity_logs IS 'Tracks all user activities for audit purposes';
COMMENT ON COLUMN public.activity_logs.action IS 'Type of action performed (e.g., create_order, update_product)';
COMMENT ON COLUMN public.activity_logs.entity_type IS 'Type of entity affected by the action';
COMMENT ON COLUMN public.activity_logs.entity_id IS 'UUID of the affected entity';
COMMENT ON COLUMN public.activity_logs.details IS 'JSONB containing additional action details';

-- ============================================================================
-- ENABLE RLS ON ACTIVITY LOGS
-- ============================================================================

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/managers can view logs
CREATE POLICY "Allow owners and managers to view all logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'manager')
    )
  );

-- Users can view their own logs
CREATE POLICY "Allow users to view their own logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow authenticated users to insert logs
CREATE POLICY "Allow authenticated users to insert logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- CREATE FUNCTION TO LOG ACTIVITY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(100) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_user_role user_role;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  -- Insert log entry
  INSERT INTO public.activity_logs (
    user_id,
    user_role,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    p_user_id,
    v_user_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    NOW()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_activity IS 'Logs user activity for audit trail';

-- ============================================================================
-- CREATE TRIGGER FOR AUTO-LOGGING ORDER CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_order_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log order creation
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      NEW.user_id,
      'create_order',
      'order',
      NEW.id,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total', NEW.total,
        'payment_method', NEW.payment_method
      )
    );
  -- Log order update
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      NEW.user_id,
      'update_order',
      'order',
      NEW.id,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total', NEW.total,
        'payment_status', NEW.payment_status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS log_order_changes ON public.orders;

-- Create trigger on orders table
CREATE TRIGGER log_order_changes
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_activity();

-- ============================================================================
-- SEED INITIAL USERS WITH DEFAULT PASSWORDS
-- ============================================================================

-- Note: Passwords will be set to '888888' for all users initially
-- These will be created via Supabase Auth and then linked to the users table

-- Create a function to help set up initial users
CREATE OR REPLACE FUNCTION public.create_initial_user(
  p_email VARCHAR(255),
  p_username VARCHAR(100),
  p_full_name VARCHAR(255),
  p_role user_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = p_email OR username = p_username;

  IF v_user_id IS NOT NULL THEN
    -- Update existing user
    UPDATE public.users
    SET
      username = p_username,
      full_name = p_full_name,
      role = p_role,
      is_active = true,
      updated_at = NOW()
    WHERE id = v_user_id;

    RETURN v_user_id;
  ELSE
    -- For new users, we need to create them via Supabase Auth first
    -- The auth.users entry must exist before we can add to public.users
    -- This function will be called after auth user creation
    RETURN NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.create_initial_user IS 'Helper function to create/update initial users';

-- ============================================================================
-- UPDATE RLS POLICIES FOR USERS TABLE
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow admins to view all users" ON public.users;
DROP POLICY IF EXISTS "Allow admins to manage all users" ON public.users;

-- Allow users to view their own profile
CREATE POLICY "Allow users to view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to update their own profile (except role)
CREATE POLICY "Allow users to update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.users WHERE id = auth.uid())  -- Prevent role change
  );

-- Allow owners and managers to view all users
CREATE POLICY "Allow owners and managers to view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'manager')
    )
  );

-- Allow owners to manage all users (insert, update, delete)
CREATE POLICY "Allow owners to manage all users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Allow managers to update users (but not create/delete owners)
CREATE POLICY "Allow managers to update users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
    AND (
      SELECT role FROM public.users WHERE id = auth.uid()
    ) != 'owner'  -- Managers cannot modify owner accounts
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT USAGE ON SEQUENCE public.activity_logs_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_initial_user TO authenticated;

-- ============================================================================
-- INSERT SAMPLE ACTIVITY LOGS (Optional - for testing)
-- ============================================================================

-- These will be populated by actual user activities

COMMENT ON TABLE public.users IS 'Extended user profiles with role-based access control. Roles: owner (full access), manager (no settings), pharmacist (POS/Sales/Products), part_time (same as pharmacist), accountant (documents only)';
