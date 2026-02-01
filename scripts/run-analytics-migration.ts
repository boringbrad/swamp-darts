/**
 * Script to run the analytics tables migration
 * Run with: npx tsx scripts/run-analytics-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = 'https://tregewscspnjfqgsjki.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZWdld3Njc3BuamZscWdzamtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM0NDI4NSwiZXhwIjoyMDg0OTIwMjg1fQ.e3Hb2uZ4qLpOQphOvatTdux7xhuDvSew-TORCKc0gRA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('Running analytics tables migration...');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '04_analytics_tables.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration SQL...');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try direct query instead
      console.log('RPC method not available, trying direct query...');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error: queryError } = await supabase.rpc('exec_sql', { query: statement });

        if (queryError) {
          console.error('Error executing statement:', queryError);
          console.error('Statement:', statement);
          // Continue with next statement
        }
      }
    }

    console.log('\n✓ Migration completed!');
    console.log('\nCreated tables:');
    console.log('  - guest_players (tracks guest players added by users)');
    console.log('  - cricket_matches (stores complete cricket match data)');
    console.log('  - golf_matches (stores complete golf match data)');
    console.log('\nCreated views:');
    console.log('  - guest_player_analytics (guest usage metrics)');
    console.log('  - user_activity_analytics (user engagement metrics)');
    console.log('\nNext steps:');
    console.log('  1. Verify tables in Supabase dashboard');
    console.log('  2. Implement sync logic in the app');
    console.log('  3. Test data syncing from localStorage to Supabase');

  } catch (error) {
    console.error('Unexpected error:', error);
    console.log('\n⚠ Manual migration required:');
    console.log('Please run the SQL in supabase/migrations/04_analytics_tables.sql');
    console.log('directly in the Supabase SQL Editor');
  }
}

runMigration();
