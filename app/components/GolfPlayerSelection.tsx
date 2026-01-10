'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAvatar, { PlayerColor } from './PlayerAvatar';
import AddGuestPlayerModal from './AddGuestPlayerModal';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAppContext } from '../contexts/AppContext';
import { StoredPlayer } from '../types/storage';
import { STOCK_AVATARS } from '../lib/avatars';
import { GolfVariant } from '../types/game';

interface GolfPlayerSelectionProps {
  variant: GolfVariant;
}

const VARIANT_TITLES: Record<GolfVariant, string> = {
  'stroke-play': 'GOLF - STROKE PLAY - PLAYER SELECT',
  'match-play': 'GOLF - MATCH PLAY - PLAYER SELECT',
  'skins': 'GOLF - SKINS - PLAYER SELECT',
};

export default function GolfPlayerSelection({ variant }: GolfPlayerSelectionProps) {
  const router = useRouter();
  const { localPlayers, addGuestPlayer } = usePlayerContext();
  const { setSelectedPlayers: setGlobalSelectedPlayers } = useAppContext();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [draggedPlayerIndex, setDraggedPlayerIndex] = useState<number | null>(null);

  const handlePlayerClick = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const handleAddGuestPlayer = (name: string, avatar: string) => {
    addGuestPlayer(name, avatar);
  };

  const handleDragStart = (index: number) => {
    setDraggedPlayerIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPlayerIndex === null || draggedPlayerIndex === index) return;

    const newSelectedPlayers = [...selectedPlayers];
    const draggedPlayer = newSelectedPlayers[draggedPlayerIndex];
    newSelectedPlayers.splice(draggedPlayerIndex, 1);
    newSelectedPlayers.splice(index, 0, draggedPlayer);

    setSelectedPlayers(newSelectedPlayers);
    setDraggedPlayerIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedPlayerIndex(null);
  };

  // Touch event handlers for mobile/iPad
  const handleTouchStart = (index: number) => {
    setDraggedPlayerIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedPlayerIndex === null) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    // Find the player container element
    const playerContainer = element?.closest('[data-player-index]');
    if (playerContainer) {
      const targetIndex = parseInt(playerContainer.getAttribute('data-player-index') || '0');
      if (targetIndex !== draggedPlayerIndex) {
        const newSelectedPlayers = [...selectedPlayers];
        const draggedPlayer = newSelectedPlayers[draggedPlayerIndex];
        newSelectedPlayers.splice(draggedPlayerIndex, 1);
        newSelectedPlayers.splice(targetIndex, 0, draggedPlayer);

        setSelectedPlayers(newSelectedPlayers);
        setDraggedPlayerIndex(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedPlayerIndex(null);
  };

  const getPlayerColor = (playerId: string): PlayerColor => {
    const playerIndex = selectedPlayers.indexOf(playerId);
    if (playerIndex === -1) return null;

    const colors: PlayerColor[] = ['blue', 'red', 'purple', 'green'];
    return colors[playerIndex] || null;
  };

  const getPlayerBorderColor = (color: PlayerColor): string => {
    if (color === 'red') return '#9d1a1a';
    if (color === 'blue') return '#1a7a9d';
    if (color === 'purple') return '#6b1a8b';
    if (color === 'green') return '#2d5016';
    return '#666666';
  };

  const handlePlayGame = () => {
    // Save selected players to global context
    const players = selectedPlayers
      .map(id => localPlayers.find(p => p.id === id))
      .filter(Boolean) as StoredPlayer[];

    setGlobalSelectedPlayers('golf', variant, { players });

    // Navigate to game
    router.push(`/golf/${variant}/game`);
  };

  return (
    <main className="px-6 pb-16 flex flex-col min-h-screen">
      {/* Content container - takes available space above player pool */}
      <div className="flex-1 flex flex-col pb-4">
        {/* Top spacer */}
        <div className="flex-[0.7]"></div>

        {/* Selected Players Display - vertically centered */}
        <div className="flex justify-center gap-4">
          {selectedPlayers.slice(0, 4).map((playerId, index) => {
            const player = localPlayers.find(p => p.id === playerId);
            if (!player) return null;

            const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];
            const playerColor = getPlayerColor(playerId);
            const borderColor = getPlayerBorderColor(playerColor);

            return (
              <div
                key={playerId}
                className="flex flex-col items-center gap-2"
                data-player-index={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={() => handleTouchStart(index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <button
                  onClick={() => handlePlayerClick(playerId)}
                  className="w-36 h-36 rounded-full border-6 flex items-center justify-center text-5xl cursor-move hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: avatar.color, borderColor }}
                >
                  {avatar.emoji}
                </button>
                <button
                  onClick={() => handlePlayerClick(playerId)}
                  className="text-white text-base font-bold hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {player.name}
                </button>
              </div>
            );
          })}
        </div>

        {/* Middle spacer */}
        <div className="flex-1"></div>

        {/* Play Game Button - positioned below selected players */}
        <div className="flex justify-center">
          <button
            onClick={handlePlayGame}
            disabled={selectedPlayers.length === 0}
            className="px-18 py-6 bg-[#666666] text-white text-3xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            PLAY GAME
          </button>
        </div>

        {/* Bottom spacer */}
        <div className="flex-[0.5]"></div>
      </div>

      {/* Available Players - compact at bottom */}
      <div className="bg-[#333333]/50 rounded-lg p-4">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
          {localPlayers.map((player) => (
            <PlayerAvatar
              key={player.id}
              name={player.name}
              selected={selectedPlayers.includes(player.id)}
              onClick={() => handlePlayerClick(player.id)}
              teamColor={getPlayerColor(player.id)}
              avatar={player.avatar}
            />
          ))}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsAddPlayerModalOpen(true)}
              className="w-24 h-24 rounded-full bg-[#666666] border-4 border-transparent flex items-center justify-center hover:bg-[#777777] transition-colors"
            >
              <span className="text-white text-4xl">+</span>
            </button>
            <span className="text-white text-sm font-bold">ADD PLAYER</span>
          </div>
        </div>
      </div>

      {/* Bottom spacer for visual breathing room */}
      <div className="h-8"></div>

      {/* Add Guest Player Modal */}
      <AddGuestPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        onAdd={handleAddGuestPlayer}
      />
    </main>
  );
}
