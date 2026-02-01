/**
 * Script to apply analytics migration to Supabase
 * Run with: node scripts/apply-migration.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tregewscspnjfqgsjki.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('📦 Loading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '04_analytics_tables.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🔌 Connecting to Supabase...');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Created tables:');
    console.log('   • guest_players');
    console.log('   • cricket_matches');
    console.log('   • golf_matches');
    console.log('\n📈 Created views:');
    console.log('   • guest_player_analytics');
    console.log('   • user_activity_analytics');
    console.log('\n✨ Next: Implement sync logic in the app');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log('\n📝 Manual steps required:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy the contents of: supabase/migrations/04_analytics_tables.sql');
    console.log('3. Paste and run the SQL in the editor');
  }
}

applyMigration();
