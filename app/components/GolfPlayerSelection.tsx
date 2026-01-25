'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAvatar, { PlayerColor } from './PlayerAvatar';
import AddGuestPlayerModal from './AddGuestPlayerModal';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAppContext } from '../contexts/AppContext';
import { StoredPlayer } from '../types/storage';
import { STOCK_AVATARS } from '../lib/avatars';
import { GolfVariant, Player } from '../types/game';
import { playerHasGames, createGhostPlayer } from '../lib/ghostPlayer';

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
  const { localPlayers, addGuestPlayer, updateLocalPlayer } = usePlayerContext();
  const { setSelectedPlayers: setGlobalSelectedPlayers, playMode } = useAppContext();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [draggedPlayerIndex, setDraggedPlayerIndex] = useState<number | null>(null);
  const [playerFilter, setPlayerFilter] = useState<'all' | 'league' | 'guests'>('all');
  const [playerSort, setPlayerSort] = useState<'alphabetical' | 'recent'>('recent');
  const [ghostMode, setGhostMode] = useState(false);
  const [ghostPlayers, setGhostPlayers] = useState<Map<string, Player>>(new Map()); // Store ghost player objects

  const handlePlayerClick = (playerId: string) => {
    if (ghostMode) {
      // Ghost mode: create and add ghost player
      // Check if there's a ghost player for this base player ID
      const existingGhostEntry = Array.from(ghostPlayers.entries()).find(
        ([_, ghost]) => ghost.ghostBasePlayerId === playerId
      );

      if (existingGhostEntry) {
        // Remove the ghost player
        const [ghostId] = existingGhostEntry;
        setSelectedPlayers(selectedPlayers.filter(id => id !== ghostId));
        const newGhosts = new Map(ghostPlayers);
        newGhosts.delete(ghostId);
        setGhostPlayers(newGhosts);
      } else {
        // Add ghost player (keep any regular player that's already selected)
        const basePlayer = localPlayers.find(p => p.id === playerId);
        if (!basePlayer) return;

        const ghostPlayer = createGhostPlayer(basePlayer, 'golf', variant);
        if (!ghostPlayer) {
          alert(`${basePlayer.name} has no games recorded in ${variant.replace(/-/g, ' ')} mode.`);
          return;
        }

        setSelectedPlayers([...selectedPlayers, ghostPlayer.id]);
        const newGhosts = new Map(ghostPlayers);
        newGhosts.set(ghostPlayer.id, ghostPlayer);
        setGhostPlayers(newGhosts);
      }
    } else {
      // Normal mode: add regular player
      if (selectedPlayers.includes(playerId)) {
        setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
      } else {
        setSelectedPlayers([...selectedPlayers, playerId]);
      }
    }
  };

  const handleAddGuestPlayer = (name: string, avatar: string, photoUrl?: string) => {
    const player = addGuestPlayer(name, avatar);
    if (photoUrl) {
      updateLocalPlayer(player.id, { photoUrl });
    }
  };

  const getFilteredAndSortedPlayers = () => {
    let filtered = localPlayers;

    // Apply ghost mode filter first
    if (ghostMode) {
      // Only show players who have games in this variant
      filtered = localPlayers.filter(p => playerHasGames(p.id, 'golf', variant));
    }

    // Apply filter
    if (playerFilter === 'league') {
      filtered = filtered.filter(p => !p.isGuest);
    } else if (playerFilter === 'guests') {
      filtered = filtered.filter(p => p.isGuest);
    }

    // Apply sort
    if (playerSort === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Sort by recently played (most recent first)
      filtered = [...filtered].sort((a, b) => {
        const aDate = a.lastUsed || a.addedDate;
        const bDate = b.lastUsed || b.addedDate;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    }

    return filtered;
  };

  const filteredPlayers = getFilteredAndSortedPlayers();

  // Helper to get player (either regular or ghost)
  const getPlayer = (playerId: string): Player | StoredPlayer | null => {
    const ghostPlayer = ghostPlayers.get(playerId);
    if (ghostPlayer) return ghostPlayer;
    return localPlayers.find(p => p.id === playerId) || null;
  };

  // Helper to check if a base player is selected (including as a ghost)
  const isPlayerSelected = (basePlayerId: string): boolean => {
    // In ghost mode, only show as selected if ghost version is selected
    if (ghostMode) {
      const hasGhost = Array.from(ghostPlayers.values()).some(
        ghost => ghost.ghostBasePlayerId === basePlayerId && selectedPlayers.includes(ghost.id)
      );
      return hasGhost;
    }

    // In normal mode, check if the regular player ID is selected
    return selectedPlayers.includes(basePlayerId);
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

  const getPlayerColor = (basePlayerId: string): PlayerColor => {
    // Check if regular player is selected
    let playerIndex = selectedPlayers.indexOf(basePlayerId);

    // If not found, check if ghost version is selected
    if (playerIndex === -1) {
      const ghostEntry = Array.from(ghostPlayers.entries()).find(
        ([ghostId, ghost]) => ghost.ghostBasePlayerId === basePlayerId
      );
      if (ghostEntry) {
        playerIndex = selectedPlayers.indexOf(ghostEntry[0]);
      }
    }

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
    // Save selected players to global context (include both regular and ghost players)
    const players = selectedPlayers
      .map(id => getPlayer(id))
      .filter(Boolean) as Player[];

    setGlobalSelectedPlayers('golf', variant, players);

    // Navigate to game
    router.push(`/golf/${variant}/game`);
  };

  const handleRandomizeOrder = () => {
    if (selectedPlayers.length === 0) return;

    // Shuffle the selected player IDs using Fisher-Yates algorithm
    const shuffled = [...selectedPlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setSelectedPlayers(shuffled);
  };

  return (
    <main className="px-4 sm:px-6 pb-16 flex flex-col min-h-screen">
      {/* Content container - takes available space above player pool */}
      <div className="flex-1 flex flex-col pb-4">
        {/* Top spacer */}
        <div className="flex-[0.7]"></div>

        {/* Ghost Mode Indicator */}
        {ghostMode && (
          <div className="mb-6 px-4 sm:px-8">
            <div className="bg-[#9b59b6]/20 border-2 border-[#9b59b6] rounded-lg p-3 sm:p-4">
              <p className="text-white text-center text-sm sm:text-base md:text-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-2">
                <span className="text-xl sm:text-2xl">👻</span>
                <span>GHOSTS ACTIVE - Select players to add their best game performance</span>
              </p>
            </div>
          </div>
        )}

        {/* Selected Players Display - vertically centered */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {selectedPlayers.slice(0, 4).map((playerId, index) => {
            const player = getPlayer(playerId);
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
                {player.photoUrl ? (
                  <button
                    onClick={() => handlePlayerClick(playerId)}
                    className="w-12 h-12 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-6 flex items-center justify-center overflow-hidden cursor-move hover:opacity-80 transition-opacity"
                    style={{ borderColor }}
                  >
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlayerClick(playerId)}
                    className="w-12 h-12 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-6 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl cursor-move hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: avatar.color, borderColor }}
                  >
                    {avatar.emoji}
                  </button>
                )}
                <button
                  onClick={() => handlePlayerClick(playerId)}
                  className="text-white text-xs sm:text-sm md:text-base font-bold hover:opacity-80 transition-opacity cursor-pointer text-center"
                >
                  {player.name}
                </button>
              </div>
            );
          })}
        </div>

        {/* Middle spacer */}
        <div className="flex-1"></div>

        {/* Action Buttons - positioned below selected players */}
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4">
          <button
            onClick={handleRandomizeOrder}
            disabled={selectedPlayers.length === 0}
            className="w-full max-w-md px-6 sm:px-12 md:px-18 py-3 sm:py-4 md:py-6 bg-[#666666] text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            RANDOMIZE ORDER
          </button>

          <button
            onClick={handlePlayGame}
            disabled={selectedPlayers.length === 0}
            className="w-full max-w-md px-6 sm:px-12 md:px-18 py-3 sm:py-4 md:py-6 bg-[#666666] text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            PLAY GAME
          </button>
        </div>

        {/* Bottom spacer */}
        <div className="flex-[0.5]"></div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="px-8 mb-3">
        <div className="flex justify-between items-center gap-4">
          {/* Filter buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setPlayerFilter('all')}
              className={`px-4 py-2 font-bold rounded transition-colors ${
                playerFilter === 'all'
                  ? 'bg-[#6b1a8b] text-white'
                  : 'bg-[#666666] text-white hover:bg-[#777777]'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setPlayerFilter('league')}
              className={`px-4 py-2 font-bold rounded transition-colors ${
                playerFilter === 'league'
                  ? 'bg-[#6b1a8b] text-white'
                  : 'bg-[#666666] text-white hover:bg-[#777777]'
              }`}
            >
              LEAGUE
            </button>
            <button
              onClick={() => setPlayerFilter('guests')}
              className={`px-4 py-2 font-bold rounded transition-colors ${
                playerFilter === 'guests'
                  ? 'bg-[#6b1a8b] text-white'
                  : 'bg-[#666666] text-white hover:bg-[#777777]'
              }`}
            >
              GUESTS
            </button>
          </div>

          {/* Ghost Mode Toggle (Practice Mode Only) */}
          {playMode === 'practice' && (
            <div className="flex gap-2">
              <button
                onClick={() => setGhostMode(!ghostMode)}
                className={`px-4 py-2 font-bold rounded transition-colors flex items-center gap-2 ${
                  ghostMode
                    ? 'bg-[#9b59b6] text-white ring-2 ring-white'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                <span>👻</span>
                <span>GHOSTS</span>
              </button>
            </div>
          )}

          {/* Sort buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setPlayerSort('recent')}
              className={`px-4 py-2 font-bold rounded transition-colors ${
                playerSort === 'recent'
                  ? 'bg-[#6b1a8b] text-white'
                  : 'bg-[#666666] text-white hover:bg-[#777777]'
              }`}
            >
              RECENT
            </button>
            <button
              onClick={() => setPlayerSort('alphabetical')}
              className={`px-4 py-2 font-bold rounded transition-colors ${
                playerSort === 'alphabetical'
                  ? 'bg-[#6b1a8b] text-white'
                  : 'bg-[#666666] text-white hover:bg-[#777777]'
              }`}
            >
              A-Z
            </button>
          </div>
        </div>
      </div>

      {/* Available Players - compact at bottom */}
      <div className="bg-[#333333]/50 rounded-lg p-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {filteredPlayers.map((player) => (
            <div key={player.id} className="flex-shrink-0">
              <PlayerAvatar
                name={player.name}
                selected={isPlayerSelected(player.id)}
                onClick={() => handlePlayerClick(player.id)}
                teamColor={getPlayerColor(player.id)}
                avatar={player.avatar}
                photoUrl={player.photoUrl}
              />
            </div>
          ))}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsAddPlayerModalOpen(true)}
              className="w-12 h-12 sm:w-24 sm:h-24 rounded-full bg-[#666666] border-4 border-transparent flex items-center justify-center hover:bg-[#777777] transition-colors"
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
