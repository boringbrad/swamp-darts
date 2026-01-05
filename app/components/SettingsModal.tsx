'use client';

import { usePlayerContext } from '../contexts/PlayerContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { deleteLocalPlayer, getGuestPlayers, refreshPlayers } = usePlayerContext();

  const handleRemoveAllGuests = () => {
    const guestPlayers = getGuestPlayers();
    if (guestPlayers.length === 0) {
      alert('No guest players to remove');
      return;
    }

    if (confirm(`Are you sure you want to remove all ${guestPlayers.length} guest player(s)?`)) {
      // Delete each guest player individually
      guestPlayers.forEach(player => {
        deleteLocalPlayer(player.id);
      });
      refreshPlayers();
      alert('All guest players have been removed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#2a2a2a] rounded-lg p-8 w-full max-w-2xl mx-4 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          SETTINGS
        </h2>

        {/* Guest Players Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-4">GUEST PLAYERS</h3>

          <button
            onClick={handleRemoveAllGuests}
            className="w-full px-6 py-3 bg-[#9d1a1a] text-white text-xl font-bold rounded hover:bg-[#b51f1f] transition-colors"
          >
            REMOVE ALL GUESTS
          </button>
        </div>

        {/* Close Button */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[#666666] text-white text-xl font-bold rounded hover:bg-[#777777] transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
