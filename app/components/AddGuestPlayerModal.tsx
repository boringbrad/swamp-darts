'use client';

import { useState, useEffect, useRef } from 'react';
import { STOCK_AVATARS } from '../lib/avatars';
import PhotoEditor from './PhotoEditor';
import { compressImage, uploadPhotoToSupabase } from '../lib/photoUpload';

interface AddGuestPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, avatar: string, photoUrl?: string) => void;
  initialName?: string;
  initialAvatar?: string;
  initialPhotoUrl?: string;
  title?: string;
}

export default function AddGuestPlayerModal({
  isOpen,
  onClose,
  onAdd,
  initialName = '',
  initialAvatar = 'avatar-1',
  initialPhotoUrl,
  title = 'ADD GUEST PLAYER',
}: AddGuestPlayerModalProps) {
  const [playerName, setPlayerName] = useState(initialName);
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update state when initial values change (for edit mode)
  useEffect(() => {
    if (isOpen) {
      setPlayerName(initialName);
      setSelectedAvatar(initialAvatar);
      setPhotoUrl(initialPhotoUrl);
    }
  }, [isOpen, initialName, initialAvatar, initialPhotoUrl]);

  // Cleanup camera stream and abort photo processing when modal closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      // Abort any ongoing photo compression
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cameraStream]);

  const handleAdd = () => {
    if (!playerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    onAdd(playerName.trim(), selectedAvatar, photoUrl);

    // Reset form
    setPlayerName('');
    setSelectedAvatar('avatar-1');
    setPhotoUrl(undefined);
    onClose();
  };

  const handleCancel = () => {
    // Abort any ongoing photo processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Stop camera if running
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);

    // Reset form
    setPlayerName('');
    setSelectedAvatar('avatar-1');
    setPhotoUrl(undefined);
    setUploadError(null);
    onClose();
  };

  // Handle photo upload from file
  const handlePhotoUpload = async (file: File) => {
    // Create new abort controller for this compression
    abortControllerRef.current = new AbortController();

    setIsProcessingPhoto(true);
    setUploadError(null);

    try {
      // Compress with abort support (smaller size for faster processing)
      const compressed = await compressImage(
        file,
        400, // maxWidth
        400, // maxHeight
        0.7, // quality
        abortControllerRef.current.signal
      );

      // Open photo editor instead of directly setting photo
      setPhotoToEdit(compressed);
      setShowPhotoEditor(true);
    } catch (error: any) {
      console.error('Error processing photo:', error);
      if (error.name !== 'AbortError') {
        setUploadError('Failed to process photo. Please try a different image.');
      }
    } finally {
      setIsProcessingPhoto(false);
      abortControllerRef.current = null;
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
      alert('Could not access camera. Please check permissions.');
    }
  };

  const handleTakePhoto = () => {
    if (!cameraStream) return;

    const video = document.getElementById('modal-camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);
      // Open photo editor instead of directly setting photo
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

  const handleRemovePhoto = () => {
    setPhotoUrl(undefined);
  };

  const handlePhotoEditorSave = async (editedImageUrl: string) => {
    setShowPhotoEditor(false);
    setPhotoToEdit('');
    setIsUploadingPhoto(true);
    setUploadError(null);

    try {
      // Generate a unique ID for this guest (will be replaced when actually saved)
      const tempId = `guest-${Date.now()}`;

      // Upload to Supabase Storage
      const result = await uploadPhotoToSupabase(editedImageUrl, tempId, 'guest-photos');

      if (result.success && result.url) {
        setPhotoUrl(result.url);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      setUploadError(error.message || 'Failed to upload photo');
      // Fallback to data URL if upload fails (temporary)
      setPhotoUrl(editedImageUrl);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoEditorCancel = () => {
    setShowPhotoEditor(false);
    setPhotoToEdit('');
  };

  const handleEditPhoto = () => {
    if (photoUrl) {
      setPhotoToEdit(photoUrl);
      setShowPhotoEditor(true);
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
      <div className="relative bg-[#2a2a2a] rounded-lg p-8 w-full max-w-2xl mx-4 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          {title}
        </h2>

        {/* Player Name Input */}
        <div className="mb-6">
          <label className="block text-white text-lg font-bold mb-2">
            PLAYER NAME
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-xl rounded border-2 border-[#444444] focus:border-[#6b1a8b] focus:outline-none"
            placeholder="Enter player name"
            maxLength={20}
          />
        </div>

        {/* Photo Upload Section */}
        <div className="mb-6">
          <label className="block text-white text-lg font-bold mb-3">
            PROFILE PICTURE (OPTIONAL)
          </label>

          {/* Error message */}
          {uploadError && (
            <div className="mb-3 p-3 bg-[#FF6B6B]/20 border border-[#FF6B6B] rounded">
              <p className="text-[#FF6B6B] text-sm">{uploadError}</p>
            </div>
          )}

          {isProcessingPhoto ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#6b1a8b] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-white text-sm">Compressing photo...</p>
            </div>
          ) : isUploadingPhoto ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#4CAF50] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-white text-sm">Uploading photo to cloud...</p>
            </div>
          ) : photoUrl ? (
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20">
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
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
            <div className="flex gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
                className="hidden"
                id="photo-upload-modal"
              />
              <label
                htmlFor="photo-upload-modal"
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
        </div>

        {/* Avatar Selection */}
        <div className="mb-8">
          <label className="block text-white text-lg font-bold mb-3">
            OR SELECT AVATAR {photoUrl && '(will be used if photo is removed)'}
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
            onClick={handleAdd}
            className="flex-1 px-6 py-3 bg-[#6b1a8b] text-white text-xl font-bold rounded hover:opacity-90 transition-opacity"
          >
            {title.includes('EDIT') ? 'SAVE' : 'ADD'}
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
                id="modal-camera-video"
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
