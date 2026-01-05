'use client';

import { useState, useEffect } from 'react';
import { STOCK_AVATARS } from '../lib/avatars';

interface AddGuestPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, avatar: string) => void;
  initialName?: string;
  initialAvatar?: string;
  title?: string;
}

export default function AddGuestPlayerModal({
  isOpen,
  onClose,
  onAdd,
  initialName = '',
  initialAvatar = 'avatar-1',
  title = 'ADD GUEST PLAYER',
}: AddGuestPlayerModalProps) {
  const [playerName, setPlayerName] = useState(initialName);
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar);

  // Update state when initial values change (for edit mode)
  useEffect(() => {
    if (isOpen) {
      setPlayerName(initialName);
      setSelectedAvatar(initialAvatar);
    }
  }, [isOpen, initialName, initialAvatar]);

  const handleAdd = () => {
    if (!playerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    onAdd(playerName.trim(), selectedAvatar);

    // Reset form
    setPlayerName('');
    setSelectedAvatar('avatar-1');
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setPlayerName('');
    setSelectedAvatar('avatar-1');
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
            onClick={handleAdd}
            className="flex-1 px-6 py-3 bg-[#6b1a8b] text-white text-xl font-bold rounded hover:opacity-90 transition-opacity"
          >
            {title.includes('EDIT') ? 'SAVE' : 'ADD'}
          </button>
        </div>
      </div>
    </div>
  );
}
