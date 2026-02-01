'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function SetupStoragePage() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const setupStorage = async () => {
    setIsLoading(true);
    setStatus('Starting setup...\n');

    try {
      const supabase = createClient();

      // Step 1: Check if bucket exists
      setStatus(prev => prev + 'Checking for avatars bucket...\n');
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        setStatus(prev => prev + `Error listing buckets: ${listError.message}\n`);
        return;
      }

      const avatarBucket = buckets.find(b => b.id === 'avatars');

      if (!avatarBucket) {
        setStatus(prev => prev + 'Creating avatars bucket...\n');
        const { data, error } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        });

        if (error) {
          setStatus(prev => prev + `Error creating bucket: ${error.message}\n`);
          return;
        }

        setStatus(prev => prev + '✓ Avatars bucket created successfully!\n');
      } else {
        setStatus(prev => prev + '✓ Avatars bucket already exists\n');
      }

      setStatus(prev => prev + '\n✅ Setup complete!\n\n');
      setStatus(prev => prev + 'IMPORTANT: You still need to set up Storage Policies manually:\n\n');
      setStatus(prev => prev + '1. Go to: https://supabase.com/dashboard\n');
      setStatus(prev => prev + '2. Select your project\n');
      setStatus(prev => prev + '3. Go to Storage > Policies\n');
      setStatus(prev => prev + '4. Click on the "avatars" bucket\n');
      setStatus(prev => prev + '5. Add these 4 policies:\n\n');

      setStatus(prev => prev + 'Policy 1 - Upload (INSERT):\n');
      setStatus(prev => prev + 'Target: authenticated\n');
      setStatus(prev => prev + 'WITH CHECK: bucket_id = \'avatars\' AND (storage.foldername(name))[1] = \'profile-photos\'\n\n');

      setStatus(prev => prev + 'Policy 2 - View (SELECT):\n');
      setStatus(prev => prev + 'Target: public\n');
      setStatus(prev => prev + 'USING: bucket_id = \'avatars\'\n\n');

      setStatus(prev => prev + 'Policy 3 - Update (UPDATE):\n');
      setStatus(prev => prev + 'Target: authenticated\n');
      setStatus(prev => prev + 'USING: bucket_id = \'avatars\' AND (storage.foldername(name))[1] = \'profile-photos\'\n\n');

      setStatus(prev => prev + 'Policy 4 - Delete (DELETE):\n');
      setStatus(prev => prev + 'Target: authenticated\n');
      setStatus(prev => prev + 'USING: bucket_id = \'avatars\' AND (storage.foldername(name))[1] = \'profile-photos\'\n');

    } catch (error: any) {
      setStatus(prev => prev + `Unexpected error: ${error.message}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          Storage Setup
        </h1>

        <div className="bg-[#2a2a2a] rounded-lg p-6 mb-6">
          <p className="text-white mb-4">
            This page will help you set up the Supabase Storage bucket for profile photos.
          </p>
          <p className="text-gray-400 mb-6">
            Click the button below to create the storage bucket. After that, you'll need to manually
            add the storage policies in the Supabase dashboard (instructions will appear below).
          </p>

          <button
            onClick={setupStorage}
            disabled={isLoading}
            className={`px-6 py-3 rounded font-bold transition-colors ${
              isLoading
                ? 'bg-[#444444] text-gray-400 cursor-not-allowed'
                : 'bg-[#6b1a8b] text-white hover:opacity-90'
            }`}
          >
            {isLoading ? 'Setting up...' : 'Setup Storage Bucket'}
          </button>
        </div>

        {status && (
          <div className="bg-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Setup Log:</h2>
            <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
              {status}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
