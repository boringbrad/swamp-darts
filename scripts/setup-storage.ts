/**
 * Script to set up Supabase Storage bucket for profile photos
 * Run with: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tregewscspnjfqgsjki.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorage() {
  try {
    console.log('Setting up storage bucket...');

    // Create the avatars bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const avatarBucket = buckets.find(b => b.id === 'avatars');

    if (!avatarBucket) {
      console.log('Creating avatars bucket...');
      const { data, error } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      });

      if (error) {
        console.error('Error creating bucket:', error);
        return;
      }

      console.log('✓ Avatars bucket created successfully');
    } else {
      console.log('✓ Avatars bucket already exists');
    }

    console.log('\n✓ Storage setup complete!');
    console.log('\nNow you need to manually set up the following storage policies in the Supabase dashboard:');
    console.log('1. Go to Storage > Policies');
    console.log('2. Add the following policies for the avatars bucket:');
    console.log('\nPolicy 1: Allow authenticated users to upload');
    console.log('  Operation: INSERT');
    console.log('  Target: authenticated');
    console.log('  Policy: bucket_id = \'avatars\' AND (storage.foldername(name))[1] = \'profile-photos\'');
    console.log('\nPolicy 2: Allow public to view');
    console.log('  Operation: SELECT');
    console.log('  Target: public');
    console.log('  Policy: bucket_id = \'avatars\'');
    console.log('\nPolicy 3: Allow users to update own photos');
    console.log('  Operation: UPDATE');
    console.log('  Target: authenticated');
    console.log('  Policy: bucket_id = \'avatars\' AND (storage.foldername(name))[1] = \'profile-photos\'');
    console.log('\nPolicy 4: Allow users to delete own photos');
    console.log('  Operation: DELETE');
    console.log('  Target: authenticated');
    console.log('  Policy: bucket_id = \'avatars\' AND (storage.foldername(name))[1] = \'profile-photos\'');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupStorage();
