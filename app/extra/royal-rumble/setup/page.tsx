'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import PlayerAvatar from '../../../components/PlayerAvatar';
import { RoyalRumblePlayer, RoyalRumbleSettings } from '../../../types/royalRumble';
import { STOCK_AVATARS } from '../../../lib/avatars';
import { usePlayerContext } from '../../../contexts/PlayerContext';

export default function RoyalRumbleSetup() {
  const router = useRouter();
  const { localPlayers } = usePlayerContext();

  // Player selection
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Settings
  const [settings, setSettings] = useState<RoyalRumbleSettings>({
    songDuration: 30,
    timeBetweenPlayers: 120,
    timeUntilNoHeal: 300,
    songsEnabled: false,
    buzzerEnabled: false, // Deprecated - kept for backward compatibility
    koNumbersMatchEntry: false,
    useUserOrder: false,
  });

  // Song uploads for each player
  const [playerSongs, setPlayerSongs] = useState<Record<string, { file?: File; url?: string }>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Filter and sort state
  const [playerFilter, setPlayerFilter] = useState<'all' | 'league' | 'guests'>('all');
  const [playerSort, setPlayerSort] = useState<'alphabetical' | 'recent'>('recent');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Toggle player selection
  const togglePlayer = (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
      // Remove song data when deselecting
      const newSongs = { ...playerSongs };
      delete newSongs[playerId];
      setPlayerSongs(newSongs);
    } else {
      if (selectedPlayerIds.length < 20) {
        setSelectedPlayerIds([...selectedPlayerIds, playerId]);
      }
    }
  };

  // Randomize player order
  const randomizeOrder = () => {
    if (selectedPlayerIds.length === 0) return;
    const shuffled = [...selectedPlayerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSelectedPlayerIds(shuffled);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...selectedPlayerIds];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    setSelectedPlayerIds(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch event handlers for mobile drag and drop
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);
  const [touchY, setTouchY] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setTouchStartIndex(index);
    setTouchY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndex === null) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchY;

    // Calculate which index we're over based on movement
    const itemHeight = 120; // Approximate height of each player item
    const indexDiff = Math.round(diff / itemHeight);
    const newIndex = Math.max(0, Math.min(selectedPlayerIds.length - 1, touchStartIndex + indexDiff));

    setDragOverIndex(newIndex);
  };

  const handleTouchEnd = () => {
    if (touchStartIndex === null || dragOverIndex === null) {
      setTouchStartIndex(null);
      setDragOverIndex(null);
      return;
    }

    if (touchStartIndex !== dragOverIndex) {
      const newOrder = [...selectedPlayerIds];
      const [draggedItem] = newOrder.splice(touchStartIndex, 1);
      newOrder.splice(dragOverIndex, 0, draggedItem);
      setSelectedPlayerIds(newOrder);
    }

    setTouchStartIndex(null);
    setDragOverIndex(null);
  };

  // Handle song file upload - creates blob URLs (no size limit, but won't persist across page reloads)
  const handleSongUpload = (playerId: string, file: File | null) => {
    if (file) {
      // Set initial progress
      setUploadProgress({
        ...uploadProgress,
        [playerId]: 0
      });

      // Simulate progress for better UX
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 20;
        if (progress <= 80) {
          setUploadProgress(prev => ({
            ...prev,
            [playerId]: progress
          }));
        }
      }, 50);

      // Create blob URL (much more efficient than base64, no localStorage size limit issues)
      setTimeout(() => {
        clearInterval(progressInterval);

        const blobUrl = URL.createObjectURL(file);
        setPlayerSongs(prev => ({
          ...prev,
          [playerId]: { file, url: blobUrl }
        }));

        // Complete progress
        setUploadProgress(prev => ({
          ...prev,
          [playerId]: 100
        }));

        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[playerId];
            return newProgress;
          });
        }, 1000);
      }, 300);
    } else {
      const newSongs = { ...playerSongs };
      // Revoke blob URL to free memory
      if (newSongs[playerId]?.url) {
        URL.revokeObjectURL(newSongs[playerId].url!);
      }
      delete newSongs[playerId];
      setPlayerSongs(newSongs);
    }
  };

  // Validate and start game
  const handleStartGame = () => {
    // Validation
    if (selectedPlayerIds.length < 4) {
      alert('You need at least 4 players to start a Royal Rumble!');
      return;
    }

    // Check for songs if songs are enabled
    if (settings.songsEnabled) {
      const playersWithoutSongs = selectedPlayerIds.filter(
        id => !playerSongs[id]?.url
      );
      if (playersWithoutSongs.length > 0) {
        const playerNames = playersWithoutSongs
          .map(id => localPlayers.find(p => p.id === id)?.name)
          .join(', ');
        const confirm = window.confirm(
          `Warning: The following players don't have songs: ${playerNames}\n\nDo you want to continue anyway?`
        );
        if (!confirm) return;
      }
    }

    // Determine entry order
    let entryOrder = [...selectedPlayerIds];
    if (!settings.useUserOrder) {
      // Randomize entry order
      for (let i = entryOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entryOrder[i], entryOrder[j]] = [entryOrder[j], entryOrder[i]];
      }
    }

    // Assign KO numbers
    const players: RoyalRumblePlayer[] = entryOrder.map((playerId, index) => {
      const player = localPlayers.find(p => p.id === playerId)!;
      const entryNumber = index + 1;
      let koNumber: number;

      if (settings.koNumbersMatchEntry) {
        // KO number = entry number (wrap around if > 20)
        koNumber = entryNumber <= 20 ? entryNumber : (entryNumber % 20) || 20;
      } else {
        // Random KO number
        koNumber = Math.floor(Math.random() * 20) + 1;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        entryNumber,
        koNumber,
        status: index < 2 ? 'active' : 'not-entered', // First 2 start in game
        hitsReceived: 0,
        // Note: We only store the URL (blob URL for uploaded files, or Spotify URL)
        // File objects cannot be serialized to localStorage
        songUrl: playerSongs[playerId]?.url,
        hasEnteredGame: index < 2, // First 2 have entered
      };
    });

    // Store game data in localStorage
    localStorage.setItem('royalRumbleSetup', JSON.stringify({ players, settings }));

    // Navigate to game page
    router.push('/extra/royal-rumble/game');
  };

  const selectedPlayers = selectedPlayerIds.map(id =>
    localPlayers.find(p => p.id === id)!
  ).filter(Boolean);

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
        return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime();
      });
    }

    return filtered;
  };

  const filteredPlayers = getFilteredAndSortedPlayers();

  return (
    <div className="min-h-screen bg-[#1a5a5a]">
      <Header title="ROYAL RUMBLE SETUP" />

      <main className="px-6 pb-16 flex flex-col min-h-screen">
        {/* Content container - takes available space above player pool */}
        <div className="flex-1 flex flex-col pb-4">
          {/* Top spacer */}
          <div className="flex-[0.7]"></div>

          {/* Selected Players Display - centered */}
          <div className="flex flex-col items-center w-full">
            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-4xl font-bold text-white">
                  SELECTED PLAYERS ({selectedPlayerIds.length}/20)
                </h2>
                <button
                  onClick={randomizeOrder}
                  disabled={selectedPlayerIds.length === 0}
                  className="px-6 py-3 bg-[#666666] text-white text-2xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  RANDOMIZE ORDER
                </button>
              </div>
              <p className="text-white text-xl mb-4">
                Minimum 4 players required. Tap players in the pool below to select.
              </p>
            </div>

            {/* Selected Players Grid */}
            {selectedPlayerIds.length > 0 ? (
              <div className="bg-[#2d2d2d] rounded-lg p-6 w-full max-w-4xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {selectedPlayers.map((player, index) => {
                    const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];
                    const isDragging = draggedIndex === index || touchStartIndex === index;
                    const isDragOver = dragOverIndex === index;

                    return (
                      <div
                        key={player.id}
                        className={`relative flex flex-col items-center gap-2 transition-all ${
                          isDragging ? 'opacity-50 scale-95' : ''
                        } ${isDragOver ? 'scale-105' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, index)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <button
                          onClick={() => togglePlayer(player.id)}
                          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl hover:opacity-80 transition-opacity ring-4 ring-[#4CAF50] cursor-move"
                          style={{ backgroundColor: avatar.color }}
                        >
                          {avatar.emoji}
                        </button>
                        <span className="text-white text-sm font-bold">{player.name}</span>
                        <div className="absolute -top-2 -right-2 bg-[#4CAF50] text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-[#2d2d2d] rounded-lg p-12 text-center w-full max-w-4xl">
                <p className="text-white text-2xl opacity-50">
                  No players selected. Choose players from the pool below.
                </p>
              </div>
            )}
          </div>

          {/* Middle spacer */}
          <div className="flex-1"></div>

          {/* Settings Panel and Buttons - centered */}
          <div className="flex flex-col items-center justify-center gap-4 w-full">
            {/* Settings Panel */}
            {selectedPlayerIds.length >= 4 && (
              <div className="bg-[#2d2d2d] rounded-lg p-6 w-full max-w-4xl">
                <h2 className="text-4xl font-bold text-white mb-6">SETTINGS</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Number Assignment */}
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Number Assignment</h3>

                    <label className="flex items-center gap-3 mb-3 text-white text-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.koNumbersMatchEntry}
                        onChange={(e) =>
                          setSettings({ ...settings, koNumbersMatchEntry: e.target.checked })
                        }
                        className="w-6 h-6"
                      />
                      <span>Entry # = KO #</span>
                    </label>

                    <label className="flex items-center gap-3 text-white text-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.useUserOrder}
                        onChange={(e) =>
                          setSettings({ ...settings, useUserOrder: e.target.checked })
                        }
                        className="w-6 h-6"
                      />
                      <span>Use Selection Order for Entry</span>
                    </label>
                    <p className="text-gray-400 text-sm ml-9 mt-1">
                      {settings.useUserOrder
                        ? "Players will enter in the order shown above"
                        : "Entry order will be randomized at game start"}
                    </p>
                  </div>

                  {/* Timers */}
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Timers</h3>

                    <div className="space-y-3">
                      {settings.songsEnabled && (
                        <div>
                          <label className="text-white text-lg block mb-1">
                            Song Duration (seconds):
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="120"
                            value={settings.songDuration}
                            onChange={(e) =>
                              setSettings({ ...settings, songDuration: parseInt(e.target.value) || 30 })
                            }
                            className="w-full px-4 py-2 bg-[#666666] text-white text-xl rounded"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-white text-lg block mb-1">
                          Time Between Players (seconds):
                        </label>
                        <input
                          type="number"
                          min="30"
                          max="600"
                          value={settings.timeBetweenPlayers}
                          onChange={(e) =>
                            setSettings({ ...settings, timeBetweenPlayers: parseInt(e.target.value) || 120 })
                          }
                          className="w-full px-4 py-2 bg-[#666666] text-white text-xl rounded"
                        />
                      </div>

                      <div>
                        <label className="text-white text-lg block mb-1">
                          Time Until No Heal (seconds):
                        </label>
                        <input
                          type="number"
                          min="60"
                          max="1800"
                          value={settings.timeUntilNoHeal}
                          onChange={(e) =>
                            setSettings({ ...settings, timeUntilNoHeal: parseInt(e.target.value) || 300 })
                          }
                          className="w-full px-4 py-2 bg-[#666666] text-white text-xl rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Songs Section */}
                <div className="mt-6 pt-6 border-t border-[#666666]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">Entrance Songs</h3>
                    <label className="flex items-center gap-3 text-white text-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.songsEnabled}
                        onChange={(e) =>
                          setSettings({ ...settings, songsEnabled: e.target.checked })
                        }
                        className="w-6 h-6"
                      />
                      <span>Enable Songs</span>
                    </label>
                  </div>

                  {settings.songsEnabled && (
                    <div className="space-y-4">
                      {selectedPlayers.map((player) => (
                        <div key={player.id} className="bg-[#1a1a1a] rounded p-4">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-white font-bold text-xl">{player.name}</span>
                            {playerSongs[player.id]?.url && !uploadProgress[player.id] && (
                              <span className="text-[#4CAF50] text-lg">✓ Song Ready</span>
                            )}
                            {uploadProgress[player.id] !== undefined && uploadProgress[player.id] < 100 && (
                              <span className="text-yellow-400 text-lg">Uploading... {uploadProgress[player.id]}%</span>
                            )}
                          </div>

                          {/* File Upload */}
                          <div>
                            <label className="text-white text-sm block mb-2">Upload Audio File:</label>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleSongUpload(player.id, e.target.files?.[0] || null)}
                              className="w-full text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#4CAF50] file:text-white hover:file:bg-[#45a049]"
                            />

                            {/* Progress bar */}
                            {uploadProgress[player.id] !== undefined && (
                              <div className="w-full bg-[#333333] rounded-full h-2 mt-2">
                                <div
                                  className="bg-[#4CAF50] h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress[player.id]}%` }}
                                />
                              </div>
                            )}

                            {/* Success message with file name */}
                            {playerSongs[player.id]?.url && !uploadProgress[player.id] && (
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-green-400 text-xs">✓ {playerSongs[player.id]?.file?.name || 'Song uploaded'}</p>
                                <button
                                  onClick={() => {
                                    const newSongs = { ...playerSongs };
                                    delete newSongs[player.id];
                                    setPlayerSongs(newSongs);
                                  }}
                                  className="text-red-400 text-xs hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Start Button */}
            <div className="flex justify-center gap-6">
              <button
                onClick={() => router.push('/extra')}
                className="px-12 py-6 bg-[#666666] text-white text-4xl font-bold rounded hover:bg-[#777777] transition-colors"
              >
                BACK
              </button>
              <button
                onClick={handleStartGame}
                disabled={selectedPlayerIds.length < 4}
                className="px-12 py-6 bg-[#4CAF50] text-white text-4xl font-bold rounded hover:bg-[#45a049] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                START RUMBLE
              </button>
            </div>
          </div>

          {/* Bottom spacer */}
          <div className="flex-[0.5]"></div>
        </div>

        {/* Filter and Sort Controls - Fixed at bottom */}
        <div className="mb-3">
          <div className="flex justify-between items-center gap-4">
            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setPlayerFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerFilter === 'all'
                    ? 'bg-white text-[#1a5a5a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setPlayerFilter('league')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerFilter === 'league'
                    ? 'bg-white text-[#1a5a5a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                LEAGUE
              </button>
              <button
                onClick={() => setPlayerFilter('guests')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerFilter === 'guests'
                    ? 'bg-white text-[#1a5a5a]'
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
                    ? 'bg-white text-[#1a5a5a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                RECENT
              </button>
              <button
                onClick={() => setPlayerSort('alphabetical')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  playerSort === 'alphabetical'
                    ? 'bg-white text-[#1a5a5a]'
                    : 'bg-[#666666] text-white hover:bg-[#777777]'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Player Pool - Fixed at bottom */}
        <div className="bg-[#333333]/50 rounded-lg p-4">
          {filteredPlayers.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
              {filteredPlayers.map((player) => (
                <PlayerAvatar
                  key={player.id}
                  name={player.name}
                  selected={selectedPlayerIds.includes(player.id)}
                  onClick={() => togglePlayer(player.id)}
                  avatar={player.avatar}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white text-xl opacity-50">
                No players available. Please create players from the main menu.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
