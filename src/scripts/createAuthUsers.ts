/**
 * Script to create initial auth users in Supabase
 * Run this script inside the Docker container or with Node.js
 * 
 * Usage:
 * 1. Copy this file to the app directory
 * 2. Run: npx ts-node src/scripts/createAuthUsers.ts
 * 
 * Or run in Docker:
 * docker-compose exec app-dev npx ts-node src/scripts/createAuthUsers.ts
 */

import { createClient } from '@supabase/supabase-js'

// Read from environment variables or .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required')
  console.error('Please set the service role key in your .env file or environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Initial users data
const initialUsers = [
  {
    email: 'som@moredrug.com',
    password: '888888',
    username: 'Som',
    full_name: 'Som (เจ้าของร้าน)',
    role: 'owner'
  },
  {
    email: 'kai@moredrug.com',
    password: '888888',
    username: 'Kai',
    full_name: 'Kai (ผู้จัดการ)',
    role: 'manager'
  },
  {
    email: 'now@moredrug.com',
    password: '888888',
    username: 'Now',
    full_name: 'Now (ผู้จัดการ)',
    role: 'manager'
  },
  {
    email: 'ing@moredrug.com',
    password: '888888',
    username: 'Ing',
    full_name: 'Ing (เภสัชกร)',
    role: 'pharmacist'
  },
  {
    email: 'beam@moredrug.com',
    password: '888888',
    username: 'Beam',
    full_name: 'Beam (เภสัชกร)',
    role: 'pharmacist'
  },
  {
    email: 'pharmacy@moredrug.com',
    password: '888888',
    username: 'Pharmacy',
    full_name: 'Pharmacy (เภสัชกร)',
    role: 'pharmacist'
  },
  {
    email: 'bonus@moredrug.com',
    password: '888888',
    username: 'Bonus',
    full_name: 'Bonus (พนักงาน)',
    role: 'part_time'
  },
  {
    email: 'parttime@moredrug.com',
    password: '888888',
    username: 'PartTime',
    full_name: 'PartTime (พนักงาน)',
    role: 'part_time'
  },
  {
    email: 'accounting@moredrug.com',
    password: '888888',
    username: 'Accounting',
    full_name: 'Accounting (นักบัญชี)',
    role: 'accountant'
  }
]

async function createAuthUsers() {
  console.log('Creating initial auth users...\n')

  for (const user of initialUsers) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', user.email)
        .single()

      if (existingUser) {
        console.log(`✓ User ${user.username} (${user.email}) already exists`)
        continue
      }

      // Create auth user using admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      })

      if (authError) {
        console.error(`✗ Failed to create auth user ${user.username}:`, authError.message)
        continue
      }

      if (authData.user) {
        // Insert or update user profile in public.users
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error(`✗ Failed to create profile for ${user.username}:`, profileError.message)
        } else {
          console.log(`✓ Created user: ${user.username} (${user.email}) - ${user.role}`)
        }
      }
    } catch (err: any) {
      console.error(`✗ Error creating user ${user.username}:`, err.message)
    }
  }

  console.log('\n✓ Done!')
  console.log('\nUsers can now login with:')
  console.log('- Username or Email')
  console.log('- Password: 888888')
}

// Run the script
createAuthUsers().catch(console.error)
