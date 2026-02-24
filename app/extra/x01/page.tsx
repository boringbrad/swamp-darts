'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import PlayerAvatar, { PlayerColor } from '@/app/components/PlayerAvatar';
import AddGuestPlayerModal from '@/app/components/AddGuestPlayerModal';
import { usePlayerContext } from '@/app/contexts/PlayerContext';
import { useAppContext } from '@/app/contexts/AppContext';
import { useVenueContext } from '@/app/contexts/VenueContext';
import { createVenueGuest } from '@/app/lib/venue';
import { StoredPlayer } from '@/app/types/storage';
import { STOCK_AVATARS } from '@/app/lib/avatars';

const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'purple', 'green'];
const COLOR_BORDERS: Record<string, string> = {
  blue: '#1a7a9d', red: '#9d1a1a', purple: '#6b1a8b', green: '#2d5016',
};

export default function X01PlayerSelectPage() {
  const router = useRouter();
  const { localPlayers, addGuestPlayer, updateLocalPlayer } = usePlayerContext();
  const { setSelectedPlayers, x01StartingScore, x01DoubleIn, x01DoubleOut } = useAppContext();
  const { venueId, venuePlayersForSelection: venuePlayers, refreshParticipants } = useVenueContext();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teamPlay, setTeamPlay] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [playerSort, setPlayerSort] = useState<'recent' | 'alphabetical'>('recent');
  const [playerFilter, setPlayerFilter] = useState<'all' | 'league' | 'guests'>('all');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (venueId) refreshParticipants();
  }, [venueId, refreshParticipants]);

  // Build player pool
  const allPlayers: StoredPlayer[] = venueId
    ? [...venuePlayers, ...localPlayers.filter(lp => !venuePlayers.find(vp => vp.id === lp.id))]
    : localPlayers;

  let filteredPool = [...allPlayers];
  if (playerFilter === 'league') filteredPool = filteredPool.filter(p => !p.isGuest);
  else if (playerFilter === 'guests') filteredPool = filteredPool.filter(p => p.isGuest);

  const sortedPlayers = filteredPool.sort((a, b) => {
    if (playerSort === 'alphabetical') return a.name.localeCompare(b.name);
    const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : new Date(a.addedDate).getTime();
    const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : new Date(b.addedDate).getTime();
    return bTime - aTime;
  });

  const getPlayerById = (id: string) => allPlayers.find(p => p.id === id);

  const getColorForSlot = (idx: number): PlayerColor => {
    if (teamPlay && selectedIds.length === 4) return idx < 2 ? 'blue' : 'red';
    return PLAYER_COLORS[idx] ?? null;
  };

  const handlePlayerClick = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  // Drag-to-reorder selected players
  const handleDragStart = (index: number) => setDraggedIdx(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const next = [...selectedIds];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(index, 0, moved);
    setSelectedIds(next);
    setDraggedIdx(index);
  };
  const handleDragEnd = () => setDraggedIdx(null);

  const handleAddGuest = async (name: string, avatar: string, photoUrl?: string) => {
    if (venueId) {
      try {
        const result = await createVenueGuest(venueId, name, avatar, photoUrl);
        if (result.success) refreshParticipants();
        else alert(result.error || 'Failed to create guest');
      } catch { alert('Failed to create guest'); }
    } else {
      const player = addGuestPlayer(name, avatar);
      if (photoUrl) updateLocalPlayer(player.id, { photoUrl });
    }
  };

  const isTeamMode = teamPlay && selectedIds.length === 4;
  const canStart = teamPlay ? selectedIds.length === 4 : selectedIds.length >= 1;

  const handleStart = () => {
    const players = selectedIds.map(id => getPlayerById(id)).filter(Boolean) as StoredPlayer[];
    setSelectedPlayers('x01', 'default', { players, isTeams: isTeamMode });
    router.push('/extra/x01/game');
  };

  const handleRandomizeOrder = () => {
    if (selectedIds.length === 0) return;
    const shuffled = [...selectedIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSelectedIds(shuffled);
  };

  // Show all 4 slots in team mode, otherwise show filled slots + 1 empty (up to 4)
  const slotsToShow = teamPlay ? 4 : Math.min(Math.max(selectedIds.length + 1, 1), 4);

  return (
    <div className="min-h-screen bg-[#1a5a5a]">
      <Header title="X01 - PLAYER SELECT" showBackButton={true} />
      <PageWrapper>
        <main className="px-4 sm:px-6 pb-16 flex flex-col min-h-screen">

          {/* ── Top content area ── */}
          <div className="flex-1 flex flex-col pb-4">
            <div className="flex-[0.4]" />

            {/* Settings Banner */}
            <div className="bg-[#2d4a4a] rounded-lg px-4 py-2 mb-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-white font-bold text-lg">{x01StartingScore}</span>
              <span className={`px-2 py-0.5 rounded font-bold text-xs ${x01DoubleIn ? 'bg-[#0984e3] text-white' : 'bg-[#444444] text-gray-400'}`}>
                {x01DoubleIn ? 'DOUBLE IN' : 'STRAIGHT IN'}
              </span>
              <span className={`px-2 py-0.5 rounded font-bold text-xs ${x01DoubleOut ? 'bg-[#0984e3] text-white' : 'bg-[#444444] text-gray-400'}`}>
                {x01DoubleOut ? 'DOUBLE OUT' : 'STRAIGHT OUT'}
              </span>
              <span className="text-gray-400 text-xs ml-auto">Change in Settings → X01</span>
            </div>

            {/* Team Play Toggle */}
            <div className="bg-[#2d4a4a] rounded-lg px-4 py-2 mb-6 flex items-center gap-3">
              <input
                type="checkbox"
                id="teamPlay"
                checked={teamPlay}
                onChange={e => setTeamPlay(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              <label htmlFor="teamPlay" className="text-white font-bold cursor-pointer select-none">
                Team Play (2v2)
              </label>
              {teamPlay && (
                <span className="text-gray-400 text-sm">
                  {selectedIds.length < 4
                    ? `— need ${4 - selectedIds.length} more player${4 - selectedIds.length !== 1 ? 's' : ''}`
                    : '— first 2 vs last 2'}
                </span>
              )}
            </div>

            {/* Selected Player Slots */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
              {Array.from({ length: slotsToShow }).map((_, index) => {
                const playerId = selectedIds[index];
                const player = playerId ? getPlayerById(playerId) : null;
                const color = getColorForSlot(index);
                const borderColor = color ? COLOR_BORDERS[color] : '#666';

                if (!player) {
                  return (
                    <div key={`slot-${index}`} className="flex flex-col items-center gap-2">
                      <div
                        className="w-12 h-12 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-[6px] flex items-center justify-center border-dashed opacity-30"
                        style={{ borderColor }}
                      >
                        <span className="text-white text-2xl sm:text-3xl md:text-4xl">?</span>
                      </div>
                      <div className="text-white text-xs sm:text-sm md:text-base font-bold opacity-30">PLAYER {index + 1}</div>
                    </div>
                  );
                }

                const avatarData = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];
                return (
                  <div
                    key={playerId}
                    className="flex flex-col items-center gap-2"
                    data-player-index={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {player.photoUrl ? (
                      <button
                        onClick={() => handlePlayerClick(playerId)}
                        className="w-12 h-12 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-[6px] overflow-hidden hover:opacity-80 transition-opacity cursor-move"
                        style={{ borderColor }}
                      >
                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlayerClick(playerId)}
                        className="w-12 h-12 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-[6px] flex items-center justify-center text-3xl sm:text-4xl md:text-5xl hover:opacity-80 transition-opacity cursor-move"
                        style={{ backgroundColor: avatarData.color, borderColor }}
                      >
                        {avatarData.emoji}
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

            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 px-4">
              <button
                onClick={handleRandomizeOrder}
                disabled={selectedIds.length === 0}
                className="w-full max-w-md px-6 py-3 sm:py-4 md:py-6 bg-[#666666] text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                RANDOMIZE ORDER
              </button>
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="w-full max-w-md px-6 py-3 sm:py-4 md:py-6 bg-[#666666] text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!canStart && teamPlay ? 'NEED 4 PLAYERS FOR TEAM MODE' : canStart ? 'PLAY GAME' : 'SELECT A PLAYER'}
              </button>
            </div>

            <div className="flex-[0.4]" />
          </div>

          {/* ── Filter & Sort ── */}
          <div className="px-2 mb-3">
            <div className="flex justify-between items-center gap-4">
              {venueId ? (
                <div className="flex gap-2">
                  {(['all', 'league', 'guests'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setPlayerFilter(f)}
                      className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                        playerFilter === f ? 'bg-white text-[#1a5a5a]' : 'bg-[#666666] text-white hover:bg-[#777777]'
                      }`}
                    >
                      {f === 'all' ? 'ALL' : f === 'league' ? 'PLAYERS' : 'GUESTS'}
                    </button>
                  ))}
                </div>
              ) : <div />}
              <div className="flex gap-2">
                {(['recent', 'alphabetical'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setPlayerSort(s)}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      playerSort === s ? 'bg-white text-[#1a5a5a]' : 'bg-[#666666] text-white hover:bg-[#777777]'
                    }`}
                  >
                    {s === 'recent' ? 'RECENT' : 'A-Z'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Player Pool ── */}
          <div className="bg-[#333333]/50 rounded-lg p-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {sortedPlayers.map(player => {
                const slotIdx = selectedIds.indexOf(player.id);
                const color: PlayerColor = slotIdx !== -1 ? getColorForSlot(slotIdx) : null;
                return (
                  <PlayerAvatar
                    key={player.id}
                    name={player.name}
                    selected={selectedIds.includes(player.id)}
                    onClick={() => handlePlayerClick(player.id)}
                    teamColor={color}
                    avatar={player.avatar}
                    photoUrl={player.photoUrl}
                  />
                );
              })}
              {sortedPlayers.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-6 text-sm">
                  No players yet — add a guest to get started.
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setIsAddPlayerModalOpen(true)}
                  className="w-12 h-12 sm:w-24 sm:h-24 rounded-full bg-[#666666] border-4 border-transparent flex items-center justify-center hover:bg-[#777777] transition-colors"
                >
                  <span className="text-white text-2xl sm:text-4xl">+</span>
                </button>
                <span className="text-white text-sm font-bold">{venueId ? 'ADD GUEST' : 'ADD PLAYER'}</span>
              </div>
            </div>
          </div>

          <div className="h-8" />
        </main>
      </PageWrapper>

      <AddGuestPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        onAdd={handleAddGuest}
        title="ADD GUEST PLAYER"
      />
    </div>
  );
}
