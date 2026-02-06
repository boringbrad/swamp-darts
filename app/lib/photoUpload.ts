/**
 * Photo Upload Utilities
 * Handles compressing and uploading photos to Supabase Storage
 */

import { createClient } from './supabase/client';

/**
 * Convert data URL to Blob for uploading
 */
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Compress image using canvas (with abort support)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new DOMException('Compression aborted', 'AbortError'));
      return;
    }

    const reader = new FileReader();

    // Handle abort during file read
    const handleAbort = () => {
      reader.abort();
      reject(new DOMException('Compression aborted', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', handleAbort);
    }

    reader.onload = (e) => {
      // Check if aborted before processing
      if (signal?.aborted) {
        reject(new DOMException('Compression aborted', 'AbortError'));
        return;
      }

      const img = new Image();

      img.onload = () => {
        try {
          // Check if aborted before canvas processing
          if (signal?.aborted) {
            reject(new DOMException('Compression aborted', 'AbortError'));
            return;
          }

          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to data URL (this is the slow part on Android)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Cleanup
          signal?.removeEventListener('abort', handleAbort);

          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        signal?.removeEventListener('abort', handleAbort);
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      signal?.removeEventListener('abort', handleAbort);
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload photo to Supabase Storage
 */
export async function uploadPhotoToSupabase(
  photoDataUrl: string,
  userId: string,
  folder: string = 'profile-photos'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient();

    // Convert data URL to blob
    const blob = dataURLtoBlob(photoDataUrl);

    // Generate unique filename
    const fileName = `${userId}-${Date.now()}.jpg`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return { success: false, error: error.message || 'Failed to upload photo' };
  }
}

/**
 * Delete photo from Supabase Storage
 */
export async function deletePhotoFromSupabase(photoUrl: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // Extract file path from URL
    // URL format: https://.../avatars/profile-photos/filename.jpg
    const urlParts = photoUrl.split('/avatars/');
    if (urlParts.length < 2) {
      console.error('Invalid photo URL format');
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting photo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePhotoFromSupabase:', error);
    return false;
  }
}
