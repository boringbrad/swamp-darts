'use client';

import { useState, useEffect } from 'react';
import { STOCK_AVATARS } from '../lib/avatars';
import { UserProfile } from '../types/context';
import { createClient } from '../lib/supabase/client';
import PhotoEditor from './PhotoEditor';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  onSave: (updates: Partial<UserProfile>) => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  currentProfile,
  onSave,
}: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Initialize state when modal opens or profile changes
  useEffect(() => {
    if (isOpen && currentProfile) {
      setDisplayName(currentProfile.displayName);
      setSelectedAvatar(currentProfile.avatar || 'avatar-1');
      setUploadedPhotoUrl((currentProfile as any).photoUrl || null);
      setUploadError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setPasswordSuccess(null);
    }
  }, [isOpen, currentProfile]);

  // Cleanup camera stream when modal closes or camera closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Convert data URL to Blob for uploading
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Upload edited photo to Supabase Storage
  const uploadPhotoToSupabase = async (photoDataUrl: string) => {
    console.log('uploadPhotoToSupabase: Starting upload', {
      profileId: currentProfile?.id,
      dataUrlLength: photoDataUrl.length
    });

    setIsUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();

      // Convert data URL to blob
      const blob = dataURLtoBlob(photoDataUrl);
      console.log('uploadPhotoToSupabase: Blob created', { size: blob.size, type: blob.type });

      // Generate unique filename
      const fileName = `${currentProfile?.id}-${Date.now()}.jpg`;
      const filePath = `profile-photos/${fileName}`;
      console.log('uploadPhotoToSupabase: Uploading to', filePath);

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      console.log('uploadPhotoToSupabase: Upload response', { error: uploadError, data });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('uploadPhotoToSupabase: Success! Public URL:', publicUrl);
      setUploadedPhotoUrl(publicUrl);
    } catch (error: any) {
      console.error('uploadPhotoToSupabase: Error uploading photo:', error);
      setUploadError(error.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
      console.log('uploadPhotoToSupabase: Upload complete');
    }
  };

  // Compress and resize image to keep file size reasonable
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressedDataUrl);
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle photo upload from file
  const handlePhotoUpload = async (file: File) => {
    try {
      const compressed = await compressImage(file);
      // Open photo editor
      setPhotoToEdit(compressed);
      setShowPhotoEditor(true);
    } catch (error) {
      console.error('Error processing photo:', error);
      setUploadError('Failed to process photo. Please try a different image.');
    }
  };

  // Handle camera photo capture
  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setUploadError('Could not access camera. Please check permissions.');
    }
  };

  const handleTakePhoto = () => {
    if (!cameraStream) return;

    const video = document.getElementById('profile-camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);
      // Open photo editor
      setPhotoToEdit(capturedPhoto);
      setShowPhotoEditor(true);
    }

    // Stop camera
    cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setShowCamera(false);
  };

  const handleCancelCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setShowCamera(false);
  };

  const handleSave = () => {
    if (!displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    const updates: any = {
      displayName: displayName.trim(),
    };

    if (uploadedPhotoUrl) {
      updates.photoUrl = uploadedPhotoUrl;
      updates.avatar = selectedAvatar; // Keep avatar as fallback
    } else {
      updates.avatar = selectedAvatar;
      updates.photoUrl = null;
    }

    onSave(updates);
    onClose();
  };

  const handlePhotoEditorSave = async (editedImageUrl: string) => {
    console.log('handlePhotoEditorSave: Closing editor and starting upload');
    setShowPhotoEditor(false);
    setPhotoToEdit('');

    // uploadPhotoToSupabase handles its own state management
    await uploadPhotoToSupabase(editedImageUrl);
  };

  const handlePhotoEditorCancel = () => {
    setShowPhotoEditor(false);
    setPhotoToEdit('');
  };

  const handleEditPhoto = () => {
    if (uploadedPhotoUrl) {
      setPhotoToEdit(uploadedPhotoUrl);
      setShowPhotoEditor(true);
    }
  };

  const handleCancel = () => {
    // Stop camera if running
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);

    // Reset to current profile values
    if (currentProfile) {
      setDisplayName(currentProfile.displayName);
      setSelectedAvatar(currentProfile.avatar || 'avatar-1');
      setUploadedPhotoUrl((currentProfile as any).photoUrl || null);
    }
    setUploadError(null);

    // Reset password fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);

    onClose();
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl(null);
  };

  const handlePasswordChange = async () => {
    console.log('=== PASSWORD CHANGE STARTED ===');
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!currentPassword && !newPassword && !confirmPassword) {
      return; // No password change requested
    }

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      const supabase = createClient();
      console.log('Supabase client created');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Got user:', user?.email);

      if (!user?.email) {
        throw new Error('No user found. Please log in again.');
      }

      // Verify current password
      console.log('Verifying current password...');
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        console.error('Password verification FAILED:', verifyError);
        setPasswordError('Current password is incorrect');
        return;
      }

      console.log('Current password VERIFIED ✓');
      console.log('Updating to new password...');

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update FAILED:', updateError);
        throw updateError;
      }

      console.log('=== PASSWORD UPDATE SUCCESS ✓ ===');

      // Clear fields FIRST
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Show success message in UI
      setPasswordSuccess('Password updated successfully!');
      console.log('Success state set');

      // Show browser alert (use setTimeout to ensure it shows)
      setTimeout(() => {
        alert('✓ Password updated successfully!\n\nYour password has been changed.');
        console.log('Alert shown');
      }, 100);

      // Auto-dismiss success message after 8 seconds
      setTimeout(() => {
        setPasswordSuccess(null);
        console.log('Success message cleared');
      }, 8000);

    } catch (error: any) {
      console.error('=== PASSWORD CHANGE ERROR ===', error);
      setPasswordError(error.message || 'Failed to update password. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-[#2a2a2a] rounded-lg p-8 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          EDIT PROFILE
        </h2>

        {/* Display Name Input */}
        <div className="mb-6">
          <label className="block text-white text-lg font-bold mb-2">
            DISPLAY NAME
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-xl rounded border-2 border-[#444444] focus:border-[#6b1a8b] focus:outline-none"
            placeholder="Enter your display name"
            maxLength={20}
          />
        </div>

        {/* Password Change Section */}
        <div className="mb-6">
          <label className="block text-white text-lg font-bold mb-3">
            CHANGE PASSWORD (OPTIONAL)
          </label>

          <div className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-lg rounded border-2 border-[#444444] focus:border-[#6b1a8b] focus:outline-none"
              placeholder="Current password"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-lg rounded border-2 border-[#444444] focus:border-[#6b1a8b] focus:outline-none"
              placeholder="New password (min 8 characters)"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-lg rounded border-2 border-[#444444] focus:border-[#6b1a8b] focus:outline-none"
              placeholder="Confirm new password"
            />

            {/* Password Error */}
            {passwordError && (
              <div className="px-4 py-3 bg-red-900/50 border border-red-500 rounded text-red-200">
                {passwordError}
              </div>
            )}

            {/* Password Success */}
            {passwordSuccess && (
              <div className="px-6 py-4 bg-green-600 border-2 border-green-400 rounded-lg text-white text-center font-bold text-xl shadow-lg animate-pulse">
                ✓ {passwordSuccess}
              </div>
            )}

            {/* Update Password Button */}
            {(currentPassword || newPassword || confirmPassword) && (
              <button
                onClick={handlePasswordChange}
                className="w-full px-6 py-3 bg-[#2196F3] text-white text-lg font-bold rounded hover:bg-[#1976D2] transition-colors"
              >
                UPDATE PASSWORD
              </button>
            )}
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="mb-6">
          <label className="block text-white text-lg font-bold mb-3">
            PROFILE PICTURE (OPTIONAL)
          </label>

          {isUploading ? (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 border-4 border-[#6b1a8b] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-white text-sm">Uploading photo...</p>
            </div>
          ) : uploadedPhotoUrl ? (
            <div className="flex items-center gap-4 mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20">
                <img src={uploadedPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-white text-sm">Custom photo uploaded</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleEditPhoto}
                    className="px-4 py-2 bg-[#2196F3] text-white text-sm font-bold rounded hover:opacity-90 transition-opacity"
                  >
                    EDIT PHOTO
                  </button>
                  <button
                    onClick={handleRemovePhoto}
                    className="px-4 py-2 bg-[#FF6B6B] text-white text-sm font-bold rounded hover:opacity-90 transition-opacity"
                  >
                    REMOVE PHOTO
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
                className="hidden"
                id="photo-upload-profile"
              />
              <label
                htmlFor="photo-upload-profile"
                className="px-6 py-3 bg-[#4CAF50] text-white text-lg font-bold rounded hover:bg-[#45a049] transition-colors cursor-pointer"
              >
                📁 UPLOAD PHOTO
              </label>
              <button
                onClick={handleOpenCamera}
                className="px-6 py-3 bg-[#2196F3] text-white text-lg font-bold rounded hover:bg-[#1976D2] transition-colors"
              >
                📷 TAKE PHOTO
              </button>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="px-4 py-3 bg-red-900/50 border border-red-500 rounded text-red-200 mb-4">
              {uploadError}
            </div>
          )}
        </div>

        {/* Avatar Selection */}
        <div className="mb-8">
          <label className="block text-white text-lg font-bold mb-3">
            {uploadedPhotoUrl ? 'AVATAR (fallback if photo is removed)' : 'SELECT AVATAR'}
          </label>
          <div className="grid grid-cols-6 gap-3">
            {STOCK_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`w-full aspect-square rounded-full flex items-center justify-center text-4xl transition-all ${
                  selectedAvatar === avatar.id
                    ? 'ring-4 ring-[#6b1a8b] scale-110'
                    : 'ring-2 ring-[#444444] hover:ring-[#6b1a8b] hover:scale-105'
                }`}
                style={{ backgroundColor: avatar.color }}
                title={avatar.label}
              >
                {avatar.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 bg-[#444444] text-white text-xl font-bold rounded hover:bg-[#555555] transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isUploading}
            className={`flex-1 px-6 py-3 text-white text-xl font-bold rounded transition-opacity ${
              isUploading
                ? 'bg-[#444444] cursor-not-allowed'
                : 'bg-[#6b1a8b] hover:opacity-90'
            }`}
          >
            SAVE
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && cameraStream && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]">
          <div className="bg-[#333333] rounded-lg p-8 max-w-2xl w-full mx-4">
            <h2 className="text-white text-2xl font-bold mb-6 text-center">TAKE PHOTO</h2>

            {/* Camera Preview */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-black">
              <video
                id="profile-camera-video"
                autoPlay
                playsInline
                ref={(video) => {
                  if (video && cameraStream) {
                    video.srcObject = cameraStream;
                  }
                }}
                className="w-full h-auto"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleCancelCamera}
                className="px-6 py-3 bg-[#666666] text-white text-xl font-bold rounded hover:bg-[#777777] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleTakePhoto}
                className="px-6 py-3 bg-[#4CAF50] text-white text-xl font-bold rounded hover:bg-[#45a049] transition-colors"
              >
                CAPTURE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Editor */}
      <PhotoEditor
        isOpen={showPhotoEditor}
        imageUrl={photoToEdit}
        onSave={handlePhotoEditorSave}
        onCancel={handlePhotoEditorCancel}
      />
    </div>
  );
}
