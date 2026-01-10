'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import AddGuestPlayerModal from '@/app/components/AddGuestPlayerModal';
import { usePlayerContext } from '@/app/contexts/PlayerContext';
import { STOCK_AVATARS } from '@/app/lib/avatars';

export default function ManageLeaguePage() {
  const { localPlayers, addLocalPlayer, updateLocalPlayer, deleteLocalPlayer } = usePlayerContext();
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string; avatar: string } | null>(null);

  // Filter out guest players - only show persistent league players
  const leaguePlayers = localPlayers.filter(p => !p.isGuest);

  const handleAddPlayer = (name: string, avatar: string) => {
    addLocalPlayer(name, avatar, false); // false = not a guest
    setIsAddPlayerModalOpen(false);
  };

  const handleEditPlayer = (id: string) => {
    const player = leaguePlayers.find(p => p.id === id);
    if (player) {
      setEditingPlayer({ id: player.id, name: player.name, avatar: player.avatar || 'avatar-1' });
    }
  };

  const handleSaveEdit = (name: string, avatar: string) => {
    if (editingPlayer) {
      updateLocalPlayer(editingPlayer.id, { name, avatar });
      setEditingPlayer(null);
    }
  };

  const handleDeletePlayer = (id: string) => {
    if (confirm('Are you sure you want to remove this player from your league? This will permanently delete their profile.')) {
      deleteLocalPlayer(id);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header title="MANAGE LEAGUE" />

      <PageWrapper>
        <main className="px-6 pb-6 flex items-center justify-center min-h-[calc(100vh-176px)]">
          <div className="max-w-6xl w-full bg-[#333333] rounded-lg p-8">
            <h2 className="text-white text-2xl font-bold mb-6 text-center">
              LEAGUE PLAYERS ({leaguePlayers.length})
            </h2>

            <p className="text-white text-center mb-8 opacity-75">
              Manage your persistent league players. These players will always be available for games.
              Guest players added during games are temporary and not shown here.
            </p>

            {/* League Players Grid */}
            <div className="grid grid-cols-6 gap-6 mb-8">
              {leaguePlayers.map((player) => {
                const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];
                return (
                  <div key={player.id} className="flex flex-col items-center gap-2 relative">
                    {/* Avatar */}
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                      style={{ backgroundColor: avatar.color }}
                    >
                      {avatar.emoji}
                    </div>

                    {/* Name */}
                    <span className="text-white text-sm font-bold text-center max-w-24 truncate">
                      {player.name}
                    </span>

                    {/* Edit/Delete Buttons (always visible) */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEditPlayer(player.id)}
                        className="px-3 py-1 bg-[#6b1a8b] text-white text-xs font-bold rounded hover:opacity-90 transition-opacity"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
                        className="px-3 py-1 bg-[#9d1a1a] text-white text-xs font-bold rounded hover:opacity-90 transition-opacity"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Player Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsAddPlayerModalOpen(true)}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-[#666666] flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">+</span>
                </div>
                <span className="text-white text-lg font-bold">ADD PLAYER</span>
              </button>
            </div>
          </div>
        </main>

        {/* Add/Edit Player Modal */}
        <AddGuestPlayerModal
          isOpen={isAddPlayerModalOpen || editingPlayer !== null}
          onClose={() => {
            setIsAddPlayerModalOpen(false);
            setEditingPlayer(null);
          }}
          onAdd={editingPlayer ? handleSaveEdit : handleAddPlayer}
          initialName={editingPlayer?.name}
          initialAvatar={editingPlayer?.avatar}
          title={editingPlayer ? 'EDIT PLAYER' : 'ADD PLAYER'}
        />
      </PageWrapper>
    </div>
  );
}
