import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration 13: Prevent Duplicate Participants');

  const migrationPath = path.join(__dirname, '../supabase/migrations/13_prevent_duplicate_participants.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and run each statement
  const statements = sql.split(';').filter(s => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      console.log('Executing statement...');
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error('Error:', error);
      } else {
        console.log('Success');
      }
    }
  }

  console.log('Migration complete!');
}

runMigration().catch(console.error);
