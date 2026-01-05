'use client';

import { useState, useEffect } from 'react';
import { STOCK_AVATARS } from '../lib/avatars';
import { UserProfile } from '../types/context';

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

  // Initialize state when modal opens or profile changes
  useEffect(() => {
    if (isOpen && currentProfile) {
      setDisplayName(currentProfile.displayName);
      setSelectedAvatar(currentProfile.avatar || 'avatar-1');
    }
  }, [isOpen, currentProfile]);

  const handleSave = () => {
    if (!displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    onSave({
      displayName: displayName.trim(),
      avatar: selectedAvatar,
    });

    onClose();
  };

  const handleCancel = () => {
    // Reset to current profile values
    if (currentProfile) {
      setDisplayName(currentProfile.displayName);
      setSelectedAvatar(currentProfile.avatar || 'avatar-1');
    }
    onClose();
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

        {/* Avatar Selection */}
        <div className="mb-8">
          <label className="block text-white text-lg font-bold mb-3">
            SELECT AVATAR
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
            className="flex-1 px-6 py-3 bg-[#6b1a8b] text-white text-xl font-bold rounded hover:opacity-90 transition-opacity"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
