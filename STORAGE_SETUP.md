# Storage Setup Instructions

To enable profile photo uploads, you need to create a storage bucket in Supabase.

## Step 1: Create the Storage Bucket

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/tregewscspnjfqgsjki
2. Navigate to **Storage** in the left sidebar
3. Click **Create bucket**
4. Enter the following details:
   - **Name**: `avatars`
   - **Public**: ✓ (checked)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/gif, image/webp`
5. Click **Create bucket**

## Step 2: Set Up Storage Policies

1. In the Storage section, click on the **Policies** tab
2. For the `avatars` bucket, add the following policies:

### Policy 1: Allow authenticated users to upload
- **Policy name**: Authenticated users can upload avatars
- **Operation**: INSERT
- **Target roles**: authenticated
- **USING expression**: (leave empty)
- **WITH CHECK expression**:
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'profile-photos'
```

### Policy 2: Allow public to view
- **Policy name**: Public can view avatars
- **Operation**: SELECT
- **Target roles**: public
- **USING expression**:
```sql
bucket_id = 'avatars'
```

### Policy 3: Allow users to update own photos
- **Policy name**: Users can update own avatars
- **Operation**: UPDATE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'profile-photos'
```

### Policy 4: Allow users to delete own photos
- **Policy name**: Users can delete own avatars
- **Operation**: DELETE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'profile-photos'
```

## Step 3: Test the Upload

1. Open your app and navigate to the Stats page
2. Click on the profile section to edit your profile
3. Switch to the "CUSTOM PHOTO" tab
4. Click "UPLOAD PHOTO" and select an image
5. The photo should upload successfully and display in the preview
6. Click "SAVE" to save your profile with the new photo

## Troubleshooting

If you encounter upload errors:
1. Check that the bucket exists and is public
2. Verify all 4 policies are created correctly
3. Check the browser console for specific error messages
4. Ensure the image is under 5MB and is a supported format
