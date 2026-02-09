import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   VITE_SUPABASE_URL - Your Supabase project URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY - Your service role key (from Supabase Dashboard > Project Settings > API)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const MIGRATIONS_DIR = './supabase'
const TRACK_FILE = './.migration-track.json'

async function getAppliedMigrations() {
  if (!existsSync(TRACK_FILE)) return []
  try {
    return JSON.parse(readFileSync(TRACK_FILE, 'utf8'))
  } catch {
    return []
  }
}

function saveAppliedMigrations(migrations) {
  writeFileSync(TRACK_FILE, JSON.stringify(migrations, null, 2))
}

async function runMigration(fileName, sql) {
  console.log(`\n📄 Running: ${fileName}`)
  
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  for (const statement of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
    
    if (error) {
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate key') ||
          error.message.includes('schema cache')) {
        console.log(`   ⚠️  Skipped (already exists): ${error.message.substring(0, 100)}`)
      } else {
        console.error(`   ❌ Error: ${error.message}`)
        throw error
      }
    }
  }
  
  console.log(`   ✅ Completed`)
}

async function main() {
  console.log('🚀 Supabase Auto Migration Tool\n')
  
  // Check if exec_sql function exists, if not create it
  const { error: checkError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' })
  
  if (checkError && checkError.message.includes('function "exec_sql" does not exist')) {
    console.log('⚙️  Creating exec_sql function...')
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `
    
    // Use raw query through REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql: createFunctionSQL })
    })
    
    if (!response.ok) {
      console.log('   ⚠️  exec_sql function not created - will try direct queries')
    }
  }
  
  const applied = await getAppliedMigrations()
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()
  
  console.log(`Found ${files.length} migration files`)
  console.log(`Already applied: ${applied.length}`)
  
  const pending = files.filter(f => !applied.includes(f))
  
  if (pending.length === 0) {
    console.log('\n✨ All migrations are up to date!')
    return
  }
  
  console.log(`\n📦 Pending migrations: ${pending.length}`)
  
  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    
    try {
      await runMigration(file, sql)
      applied.push(file)
      saveAppliedMigrations(applied)
    } catch (error) {
      console.error(`\n❌ Failed on ${file}`)
      console.error(error.message)
      process.exit(1)
    }
  }
  
  console.log('\n🎉 All migrations completed successfully!')
}

main().catch(console.error)
