'use client';

import { useState, useMemo } from 'react';
import { usePlayerContext } from '../contexts/PlayerContext';
import { playerHasGames } from '../lib/ghostPlayer';
import { CricketVariant } from '../types/game';
import { STOCK_AVATARS } from '../lib/avatars';

interface AddGhostPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (playerId: string, canAddSelf: boolean) => void; // Pass back the selected player ID
  gameMode: 'cricket' | 'golf';
  variant: CricketVariant | 'stroke-play' | 'match-play' | 'skins';
  currentPlayerIds: string[]; // Players already selected
}

export default function AddGhostPlayerModal({
  isOpen,
  onClose,
  onAdd,
  gameMode,
  variant,
  currentPlayerIds,
}: AddGhostPlayerModalProps) {
  const { localPlayers } = usePlayerContext();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Filter players who have games in this mode/variant
  const availablePlayers = useMemo(() => {
    return localPlayers.filter(player =>
      playerHasGames(player.id, gameMode, variant)
    );
  }, [localPlayers, gameMode, variant]);

  const handleAdd = () => {
    if (!selectedPlayerId) {
      alert('Please select a player to add as a ghost');
      return;
    }

    // Check if user can add themselves as a ghost
    const canAddSelf = currentPlayerIds.includes(selectedPlayerId);

    onAdd(selectedPlayerId, canAddSelf);
    setSelectedPlayerId(null);
    onClose();
  };

  const handleCancel = () => {
    setSelectedPlayerId(null);
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
      <div className="relative bg-[#2a2a2a] rounded-lg p-8 w-full max-w-4xl mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">
          ADD GHOST PLAYER
        </h2>

        <p className="text-white text-center mb-6 opacity-75">
          Ghost players are computer-controlled and play using scores from their best game in this mode.
          {currentPlayerIds.length > 0 && (
            <span className="block mt-2 text-sm">
              You can also add yourself as a ghost to play against your personal best!
            </span>
          )}
        </p>

        {availablePlayers.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-lg p-8 mb-6">
            <p className="text-white text-center text-lg">
              No players have games recorded in <span className="font-bold">{gameMode.toUpperCase()} - {variant.toUpperCase().replace(/-/g, ' ')}</span>.
            </p>
            <p className="text-white text-center mt-4 opacity-75">
              Play some games first to enable ghost players!
            </p>
          </div>
        ) : (
          <>
            {/* Player Selection Grid */}
            <div className="bg-[#1a1a1a] rounded-lg p-6 mb-6">
              <h3 className="text-white text-xl font-bold mb-4">SELECT PLAYER</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {availablePlayers.map((player) => {
                  const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];
                  const isSelected = selectedPlayerId === player.id;
                  const isAlreadyInGame = currentPlayerIds.includes(player.id);

                  return (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayerId(player.id)}
                      className="flex flex-col items-center gap-2 transition-opacity hover:opacity-100"
                    >
                      <div className="relative">
                        {player.photoUrl ? (
                          <div
                            className={`w-20 h-20 rounded-full border-4 overflow-hidden transition-all ${
                              isSelected
                                ? 'ring-4 ring-[#6b1a8b] scale-110 border-[#6b1a8b]'
                                : 'border-[#444444] opacity-80'
                            }`}
                          >
                            <img
                              src={player.photoUrl}
                              alt={player.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-3xl transition-all ${
                              isSelected
                                ? 'ring-4 ring-[#6b1a8b] scale-110 border-[#6b1a8b]'
                                : 'border-[#444444] opacity-80'
                            }`}
                            style={{ backgroundColor: avatar.color }}
                          >
                            {avatar.emoji}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#6b1a8b] rounded-full flex items-center justify-center">
                            <span className="text-white text-xl">✓</span>
                          </div>
                        )}
                      </div>
                      <span className="text-white text-xs font-bold text-center max-w-20 truncate">
                        {player.name}
                      </span>
                      {isAlreadyInGame && (
                        <span className="text-[#4CAF50] text-xs font-bold">
                          (IN GAME)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 bg-[#444444] text-white text-xl font-bold rounded hover:bg-[#555555] transition-colors"
          >
            CANCEL
          </button>
          {availablePlayers.length > 0 && (
            <button
              onClick={handleAdd}
              disabled={!selectedPlayerId}
              className="flex-1 px-6 py-3 bg-[#6b1a8b] text-white text-xl font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ADD GHOST
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
