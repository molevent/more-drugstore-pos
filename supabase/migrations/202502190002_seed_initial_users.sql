-- Seed Initial Users for More Drug Store
-- Migration: 202502190002_seed_initial_users
-- Created: 2026-02-19
-- 
-- This migration creates the initial users with the following structure:
-- 1. Owner (เจ้าของร้าน) - Som
-- 2. Managers (ผู้จัดการร้าน) - Kai, Now
-- 3. Pharmacists (เภสัชกร) - Ing, Beam, Pharmacy
-- 4. Part-time staff (พนักงานไพรท์ไทม์) - Bonus, PartTime
-- 5. Accountant (นักบัญชี) - Accounting
--
-- Default password for all users: 888888

-- ============================================================================
-- IMPORTANT NOTE:
-- This script should be run AFTER the auth users are created via Supabase Auth
-- The public.users records will be linked to auth.users via the id field
-- ============================================================================

-- Insert initial users into public.users table
-- These will be linked to auth.users when they sign up

INSERT INTO public.users (id, email, username, full_name, role, is_active, created_at, updated_at)
VALUES 
  -- เจ้าของร้าน (Owner) - Full access
  (gen_random_uuid(), 'som@moredrug.com', 'Som', 'Som (เจ้าของร้าน)', 'owner', true, NOW(), NOW()),
  
  -- ผู้จัดการร้าน (Managers) - All except Settings
  (gen_random_uuid(), 'kai@moredrug.com', 'Kai', 'Kai (ผู้จัดการ)', 'manager', true, NOW(), NOW()),
  (gen_random_uuid(), 'now@moredrug.com', 'Now', 'Now (ผู้จัดการ)', 'manager', true, NOW(), NOW()),
  
  -- เภสัชกร (Pharmacists) - POS, Sales, Products, Website
  (gen_random_uuid(), 'ing@moredrug.com', 'Ing', 'Ing (เภสัชกร)', 'pharmacist', true, NOW(), NOW()),
  (gen_random_uuid(), 'beam@moredrug.com', 'Beam', 'Beam (เภสัชกร)', 'pharmacist', true, NOW(), NOW()),
  (gen_random_uuid(), 'pharmacy@moredrug.com', 'Pharmacy', 'Pharmacy (เภสัชกร)', 'pharmacist', true, NOW(), NOW()),
  
  -- พนักงานไพรท์ไทม์ (Part-time) - POS, Sales, Products, Website
  (gen_random_uuid(), 'bonus@moredrug.com', 'Bonus', 'Bonus (พนักงาน)', 'part_time', true, NOW(), NOW()),
  (gen_random_uuid(), 'parttime@moredrug.com', 'PartTime', 'PartTime (พนักงาน)', 'part_time', true, NOW(), NOW()),
  
  -- นักบัญชี (Accountant) - Documents only
  (gen_random_uuid(), 'accounting@moredrug.com', 'Accounting', 'Accounting (นักบัญชี)', 'accountant', true, NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- INSTRUCTIONS FOR CREATING AUTH USERS:
-- ============================================================================
-- Since we cannot directly insert into auth.users, the users need to be created
-- either:
-- 1. Via the UserManagementPage by the owner
-- 2. Via Supabase Dashboard
-- 3. Via a separate script using the Supabase Admin API
--
-- The passwords should be set to: 888888
--
-- After creating auth users, run this migration to create the public.users records
-- ============================================================================

-- Add comment to document this
COMMENT ON TABLE public.users IS 'User accounts with role-based access control. Initial users: Som(owner), Kai/Now(managers), Ing/Beam/Pharmacy(pharmacists), Bonus/PartTime(part-time), Accounting(accountant). Default password: 888888';
