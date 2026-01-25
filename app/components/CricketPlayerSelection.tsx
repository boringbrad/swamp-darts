'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAvatar, { PlayerColor } from './PlayerAvatar';
import AddGuestPlayerModal from './AddGuestPlayerModal';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAppContext } from '../contexts/AppContext';
import { useKONumbers } from '../hooks/useKONumbers';
import { StoredPlayer } from '../types/storage';
import { STOCK_AVATARS } from '../lib/avatars';

export type CricketVariant = 'singles' | 'tag-team' | 'triple-threat' | 'fatal-4-way';

interface CricketPlayerSelectionProps {
  variant: CricketVariant;
}

interface VariantConfig {
  playerCount: number;
  title: string;
  backgroundColor: string;
  teams?: number; // Number of teams (for tag-team)
  teamColors?: string[]; // Border colors for teams
}

const VARIANT_CONFIGS: Record<CricketVariant, VariantConfig> = {
  singles: {
    playerCount: 2,
    title: 'CRICKET - SINGLES - PLAYER SELECT',
    backgroundColor: '#8b1a1a',
  },
  'tag-team': {
    playerCount: 4,
    title: 'CRICKET - TAG TEAM - PLAYER SELECT',
    backgroundColor: '#8b1a1a',
    teams: 2,
    teamColors: ['#1a7a9d', '#9d1a1a'], // Blue and Red
  },
  'triple-threat': {
    playerCount: 3,
    title: 'CRICKET - TRIPLE THREAT - PLAYER SELECT',
    backgroundColor: '#8b1a1a',
  },
  'fatal-4-way': {
    playerCount: 4,
    title: 'CRICKET - FATAL 4-WAY - PLAYER SELECT',
    backgroundColor: '#8b1a1a',
  },
};

export default function CricketPlayerSelection({ variant }: CricketPlayerSelectionProps) {
  const router = useRouter();
  const config = VARIANT_CONFIGS[variant];
  const { localPlayers, addGuestPlayer, updateLocalPlayer } = usePlayerContext();
  const { selectedPlayers, setSelectedPlayers, cricketRules } = useAppContext();

  // Check if KO is enabled (default true)
  const enableKO = cricketRules.enableKO !== false;

  // State for selected player IDs
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [teamAssignments, setTeamAssignments] = useState<Record<string, number>>({}); // For tag-team
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [draggedPlayerIndex, setDraggedPlayerIndex] = useState<number | null>(null);
  const [playerFilter, setPlayerFilter] = useState<'all' | 'league' | 'guests'>('all');
  const [playerSort, setPlayerSort] = useState<'alphabetical' | 'recent'>('recent');

  // KO Numbers hook
  const { koNumbers, incrementKO, decrementKO, randomizeKONumbers, initializeKONumbers } = useKONumbers();

  // Clear selections when component mounts or variant changes
  useEffect(() => {
    // Start with empty selections
    setSelectedPlayerIds([]);
    setTeamAssignments({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  // Handle player selection from the grid
  const handlePlayerClick = (playerId: string) => {
    if (variant === 'tag-team') {
      handleTagTeamPlayerClick(playerId);
    } else {
      handleRegularPlayerClick(playerId);
    }
  };

  const handleRegularPlayerClick = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        // Remove player
        return prev.filter(id => id !== playerId);
      } else if (prev.length < config.playerCount) {
        // Add player
        const newIds = [...prev, playerId];
        // Initialize KO number for new player
        if (!koNumbers[playerId]) {
          initializeKONumbers(newIds);
        }
        return newIds;
      }
      return prev;
    });
  };

  const handleTagTeamPlayerClick = (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      // Remove player
      setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
      setTeamAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[playerId];
        return newAssignments;
      });
    } else if (selectedPlayerIds.length < config.playerCount) {
      // Add first 2 players to team 0, second 2 to team 1
      const targetTeam = selectedPlayerIds.length < 2 ? 0 : 1;

      setSelectedPlayerIds(prev => {
        const newIds = [...prev, playerId];
        if (!koNumbers[playerId]) {
          initializeKONumbers(newIds);
        }
        return newIds;
      });
      setTeamAssignments(prev => ({ ...prev, [playerId]: targetTeam }));
    }
  };

  const getPlayerById = (id: string): StoredPlayer | undefined => {
    return localPlayers.find(p => p.id === id);
  };

  const getTeamColor = (playerId: string): PlayerColor => {
    // For tag-team, use team-based colors
    if (variant === 'tag-team') {
      const teamIndex = teamAssignments[playerId];
      if (teamIndex === 0) return 'blue';
      if (teamIndex === 1) return 'red';
      return null;
    }

    // For other modes, assign color based on player position
    const playerIndex = selectedPlayerIds.indexOf(playerId);
    if (playerIndex === -1) return null;

    const colors: PlayerColor[] = ['blue', 'red', 'purple', 'green'];
    return colors[playerIndex] || null;
  };

  const getTeamBorderColor = (teamIndex: number): string => {
    return config.teamColors?.[teamIndex] || '#666666';
  };

  const handleAddGuestPlayer = (name: string, avatar: string, photoUrl?: string) => {
    const player = addGuestPlayer(name, avatar);
    if (photoUrl) {
      updateLocalPlayer(player.id, { photoUrl });
    }
  };

  const handleRandomize = () => {
    randomizeKONumbers(selectedPlayerIds);
  };

  const handlePlayGame = () => {
    // Save selections to AppContext before navigating
    const players = selectedPlayerIds.map(id => getPlayerById(id)).filter(Boolean) as StoredPlayer[];

    if (variant === 'tag-team') {
      const team0 = players.filter(p => teamAssignments[p.id] === 0);
      const team1 = players.filter(p => teamAssignments[p.id] === 1);
      setSelectedPlayers('cricket', variant, {
        teams: [team0, team1],
        koNumbers,
      });
    } else {
      setSelectedPlayers('cricket', variant, {
        players,
        koNumbers,
      });
    }

    // Navigate to game
    router.push(`/cricket/${variant}/game`);
  };

  const handleRandomizeOrder = () => {
    if (selectedPlayerIds.length === 0) return;

    // Shuffle the selected player IDs using Fisher-Yates algorithm
    const shuffled = [...selectedPlayerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setSelectedPlayerIds(shuffled);

    // For tag-team, reassign teams based on new order
    if (variant === 'tag-team') {
      const newTeamAssignments: Record<string, number> = {};
      shuffled.forEach((playerId, index) => {
        newTeamAssignments[playerId] = index % 2; // Alternate teams: 0, 1, 0, 1
      });
      setTeamAssignments(newTeamAssignments);
    }
  };

  const isPlayDisabled = selectedPlayerIds.length !== config.playerCount;

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedPlayerIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPlayerIndex === null || draggedPlayerIndex === index) return;

    const newSelectedPlayerIds = [...selectedPlayerIds];
    const draggedPlayer = newSelectedPlayerIds[draggedPlayerIndex];
    newSelectedPlayerIds.splice(draggedPlayerIndex, 1);
    newSelectedPlayerIds.splice(index, 0, draggedPlayer);

    setSelectedPlayerIds(newSelectedPlayerIds);
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
        const newSelectedPlayerIds = [...selectedPlayerIds];
        const draggedPlayer = newSelectedPlayerIds[draggedPlayerIndex];
        newSelectedPlayerIds.splice(draggedPlayerIndex, 1);
        newSelectedPlayerIds.splice(targetIndex, 0, draggedPlayer);

        setSelectedPlayerIds(newSelectedPlayerIds);
        setDraggedPlayerIndex(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedPlayerIndex(null);
  };

  // Render selected players
  const renderSelectedPlayers = () => {
    if (variant === 'tag-team') {
      return renderTagTeamPlayers();
    } else {
      return renderRegularPlayers();
    }
  };

  const renderRegularPlayers = () => {
    const colors: PlayerColor[] = ['blue', 'red', 'purple', 'green'];

    return (
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
        {Array.from({ length: config.playerCount }).map((_, index) => {
          const playerId = selectedPlayerIds[index];
          const player = playerId ? getPlayerById(playerId) : null;

          if (!player) {
            // Render empty slot
            const borderColor = colors[index] || 'red';
            const borderStyle = { borderColor: borderColor === 'red' ? '#9d1a1a' : borderColor === 'blue' ? '#1a7a9d' : borderColor === 'purple' ? '#6b1a8b' : '#2d5016' };

            return (
              <div key={`slot-${index}`} className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-12 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-6 flex items-center justify-center border-dashed opacity-30"
                  style={borderStyle}
                >
                  <span className="text-white text-2xl sm:text-3xl md:text-4xl">?</span>
                </div>
                <div className="text-white text-xs sm:text-sm md:text-base font-bold opacity-30">PLAYER {index + 1}</div>
                <div className="text-white text-4xl sm:text-5xl md:text-6xl font-bold opacity-30">-</div>
                <div className="flex gap-1 sm:gap-2 opacity-0">
                  <button className="w-6 h-6 sm:w-8 sm:h-8 bg-[#333333] text-white rounded text-sm sm:text-base">-</button>
                  <button className="w-6 h-6 sm:w-8 sm:h-8 bg-[#333333] text-white rounded text-sm sm:text-base">+</button>
                </div>
              </div>
            );
          }

          const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];
          const borderColor = colors[index] || 'red';
          const borderStyle = { borderColor: borderColor === 'red' ? '#9d1a1a' : borderColor === 'blue' ? '#1a7a9d' : borderColor === 'purple' ? '#6b1a8b' : '#2d5016' };

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
                  className="w-12 h-12 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-6 overflow-hidden cursor-move hover:opacity-80 transition-opacity"
                  style={borderStyle}
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
                  style={{ backgroundColor: avatar.color, ...borderStyle }}
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
              {enableKO && (
                <>
                  <div className="text-white text-4xl sm:text-5xl md:text-6xl font-bold">{koNumbers[playerId] || 1}</div>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => decrementKO(playerId)}
                      className="w-6 h-6 sm:w-8 sm:h-8 bg-[#333333] text-white rounded flex items-center justify-center text-base sm:text-lg md:text-xl hover:bg-[#444444] transition-colors"
                    >
                      -
                    </button>
                    <button
                      onClick={() => incrementKO(playerId)}
                      className="w-6 h-6 sm:w-8 sm:h-8 bg-[#333333] text-white rounded flex items-center justify-center text-base sm:text-lg md:text-xl hover:bg-[#444444] transition-colors"
                    >
                      +
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTagTeamPlayers = () => {
    const playersPerTeam = config.playerCount / 2;

    return (
      <div className="flex flex-col sm:flex-row justify-center gap-8 sm:gap-12 md:gap-16">
        {/* Team 0 (Blue) */}
        <div className="flex gap-4">
          {Array.from({ length: playersPerTeam }).map((_, teamIndex) => {
            const globalIndex = teamIndex;
            const playerId = selectedPlayerIds[globalIndex];
            const player = playerId ? getPlayerById(playerId) : null;

            if (!player) {
              // Render empty slot
              return (
                <div key={`team0-slot-${teamIndex}`} className="flex flex-col items-center gap-2">
                  <div
                    className="w-18 h-18 sm:w-36 sm:h-36 rounded-full border-6 flex items-center justify-center text-5xl border-dashed opacity-30"
                    style={{ borderColor: getTeamBorderColor(0) }}
                  >
                    <span className="text-white text-4xl">?</span>
                  </div>
                  <div className="text-white text-base font-bold opacity-30">TEAM 1 - P{teamIndex + 1}</div>
                  <div className="text-white text-6xl font-bold opacity-30">-</div>
                  <div className="flex gap-2 opacity-0">
                    <button className="w-8 h-8 bg-[#333333] text-white rounded">-</button>
                    <button className="w-8 h-8 bg-[#333333] text-white rounded">+</button>
                  </div>
                </div>
              );
            }

            const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];

            return (
              <div
                key={playerId}
                className="flex flex-col items-center gap-2"
                data-player-index={globalIndex}
                draggable
                onDragStart={() => handleDragStart(globalIndex)}
                onDragOver={(e) => handleDragOver(e, globalIndex)}
                onDragEnd={handleDragEnd}
                onTouchStart={() => handleTouchStart(globalIndex)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {player.photoUrl ? (
                  <button
                    onClick={() => handlePlayerClick(playerId)}
                    className="w-18 h-18 sm:w-36 sm:h-36 rounded-full border-6 overflow-hidden cursor-move hover:opacity-80 transition-opacity"
                    style={{ borderColor: getTeamBorderColor(0) }}
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
                    className="w-18 h-18 sm:w-36 sm:h-36 rounded-full border-6 flex items-center justify-center text-5xl cursor-move hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: avatar.color, borderColor: getTeamBorderColor(0) }}
                  >
                    {avatar.emoji}
                  </button>
                )}
                <button
                  onClick={() => handlePlayerClick(playerId)}
                  className="text-white text-base font-bold hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {player.name}
                </button>
                {enableKO && (
                  <>
                    <div className="text-white text-6xl font-bold">{koNumbers[playerId] || 1}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => decrementKO(playerId)}
                        className="w-8 h-8 bg-[#333333] text-white rounded flex items-center justify-center text-xl hover:bg-[#444444] transition-colors"
                      >
                        -
                      </button>
                      <button
                        onClick={() => incrementKO(playerId)}
                        className="w-8 h-8 bg-[#333333] text-white rounded flex items-center justify-center text-xl hover:bg-[#444444] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Team 1 (Red) */}
        <div className="flex gap-4">
          {Array.from({ length: playersPerTeam }).map((_, teamIndex) => {
            const globalIndex = playersPerTeam + teamIndex;
            const playerId = selectedPlayerIds[globalIndex];
            const player = playerId ? getPlayerById(playerId) : null;

            if (!player) {
              // Render empty slot
              return (
                <div key={`team1-slot-${teamIndex}`} className="flex flex-col items-center gap-2">
                  <div
                    className="w-18 h-18 sm:w-36 sm:h-36 rounded-full border-6 flex items-center justify-center text-5xl border-dashed opacity-30"
                    style={{ borderColor: getTeamBorderColor(1) }}
                  >
                    <span className="text-white text-4xl">?</span>
                  </div>
                  <div className="text-white text-base font-bold opacity-30">TEAM 2 - P{teamIndex + 1}</div>
                  <div className="text-white text-6xl font-bold opacity-30">-</div>
                  <div className="flex gap-2 opacity-0">
                    <button className="w-8 h-8 bg-[#333333] text-white rounded">-</button>
                    <button className="w-8 h-8 bg-[#333333] text-white rounded">+</button>
                  </div>
                </div>
              );
            }

            const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];

            return (
              <div
                key={playerId}
                className="flex flex-col items-center gap-2"
                data-player-index={globalIndex}
                draggable
                onDragStart={() => handleDragStart(globalIndex)}
                onDragOver={(e) => handleDragOver(e, globalIndex)}
                onDragEnd={handleDragEnd}
                onTouchStart={() => handleTouchStart(globalIndex)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {player.photoUrl ? (
                  <button
                    onClick={() => handlePlayerClick(playerId)}
                    className="w-18 h-18 sm:w-36 sm:h-36 rounded-full border-6 overflow-hidden cursor-move hover:opacity-80 transition-opacity"
                    style={{ borderColor: getTeamBorderColor(1) }}
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
                    className="w-18 h-18 sm:w-36 sm:h-36 rounded-full border-6 flex items-center justify-center text-5xl cursor-move hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: avatar.color, borderColor: getTeamBorderColor(1) }}
                  >
                    {avatar.emoji}
                  </button>
                )}
                <button
                  onClick={() => handlePlayerClick(playerId)}
                  className="text-white text-base font-bold hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {player.name}
                </button>
                {enableKO && (
                  <>
                    <div className="text-white text-6xl font-bold">{koNumbers[playerId] || 1}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => decrementKO(playerId)}
                        className="w-8 h-8 bg-[#333333] text-white rounded flex items-center justify-center text-xl hover:bg-[#444444] transition-colors"
                      >
                        -
                      </button>
                      <button
                        onClick={() => incrementKO(playerId)}
                        className="w-8 h-8 bg-[#333333] text-white rounded flex items-center justify-center text-xl hover:bg-[#444444] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Filter and sort players for the player pool
  const getFilteredAndSortedPlayers = () => {
    let filtered = localPlayers;

    // Apply filter
    if (playerFilter === 'league') {
      filtered = localPlayers.filter(p => !p.isGuest);
    } else if (playerFilter === 'guests') {
      filtered = localPlayers.filter(p => p.isGuest);
    }

    // Apply sort
    if (playerSort === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Sort by lastUsed (most recent first), then by addedDate for ties
      filtered = [...filtered].sort((a, b) => {
        const aDate = a.lastUsed || a.addedDate;
        const bDate = b.lastUsed || b.addedDate;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    }

    return filtered;
  };

  const filteredPlayers = getFilteredAndSortedPlayers();

  return (
    <>
      <main className="px-4 sm:px-6 pb-16 flex flex-col min-h-screen">
        {/* Content container - takes available space above player pool */}
        <div className="flex-1 flex flex-col pb-4">
          {/* Top spacer */}
          <div className="flex-[0.7]"></div>

          {/* Selected Players Display - vertically centered */}
          <div className="flex justify-center">
            {renderSelectedPlayers()}
          </div>

          {/* Middle spacer */}
          <div className="flex-1"></div>

          {/* Action Buttons - positioned below selected players */}
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4">
            {/* Randomize Numbers Button - only show if KO is enabled */}
            {enableKO && (
              <button
                onClick={handleRandomize}
                disabled={selectedPlayerIds.length === 0}
                className="w-full max-w-md px-6 sm:px-12 md:px-18 py-3 sm:py-4 md:py-6 bg-[#666666] text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                RANDOMIZE NUMBERS
              </button>
            )}

            {/* Randomize Order Button */}
            <button
              onClick={handleRandomizeOrder}
              disabled={selectedPlayerIds.length === 0}
              className="w-full max-w-md px-6 sm:px-12 md:px-18 py-3 sm:py-4 md:py-6 bg-[#666666] text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              RANDOMIZE ORDER
            </button>

            {/* Play Game Button */}
            <button
              onClick={handlePlayGame}
              disabled={isPlayDisabled}
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
            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setPlayerFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerFilter === 'all'
                    ? 'bg-white text-[#8b1a1a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setPlayerFilter('league')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerFilter === 'league'
                    ? 'bg-white text-[#8b1a1a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                LEAGUE
              </button>
              <button
                onClick={() => setPlayerFilter('guests')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerFilter === 'guests'
                    ? 'bg-white text-[#8b1a1a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                GUESTS
              </button>
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <button
                onClick={() => setPlayerSort('recent')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerSort === 'recent'
                    ? 'bg-white text-[#8b1a1a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                RECENT
              </button>
              <button
                onClick={() => setPlayerSort('alphabetical')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerSort === 'alphabetical'
                    ? 'bg-white text-[#8b1a1a]'
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
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
            {filteredPlayers.map((player) => (
              <PlayerAvatar
                key={player.id}
                name={player.name}
                selected={selectedPlayerIds.includes(player.id)}
                onClick={() => handlePlayerClick(player.id)}
                teamColor={getTeamColor(player.id)}
                avatar={player.avatar}
                photoUrl={player.photoUrl}
              />
            ))}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setIsAddPlayerModalOpen(true)}
                className="w-12 h-12 sm:w-24 sm:h-24 rounded-full bg-[#666666] border-4 border-transparent flex items-center justify-center hover:bg-[#777777] transition-colors"
              >
                <span className="text-white text-2xl sm:text-4xl">+</span>
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
    </>
  );
}
