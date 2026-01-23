'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import AddGuestPlayerModal from '@/app/components/AddGuestPlayerModal';
import { usePlayerContext } from '@/app/contexts/PlayerContext';
import { STOCK_AVATARS } from '@/app/lib/avatars';

export default function ManageLeaguePage() {
  const { localPlayers, addLocalPlayer, updateLocalPlayer, deleteLocalPlayer, addGuestPlayer } = usePlayerContext();
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string; avatar: string; photoUrl?: string } | null>(null);
  const [editingGuest, setEditingGuest] = useState<{ id: string; name: string; avatar: string; photoUrl?: string } | null>(null);

  // Filter out guest players - only show persistent league players
  const leaguePlayers = localPlayers.filter(p => !p.isGuest);
  const guestPlayers = localPlayers.filter(p => p.isGuest);

  const handleAddPlayer = (name: string, avatar: string, photoUrl?: string) => {
    const player = addLocalPlayer(name, avatar, false); // false = not a guest
    if (photoUrl) {
      updateLocalPlayer(player.id, { photoUrl });
    }
    setIsAddPlayerModalOpen(false);
  };

  const handleEditPlayer = (id: string) => {
    const player = leaguePlayers.find(p => p.id === id);
    if (player) {
      setEditingPlayer({ id: player.id, name: player.name, avatar: player.avatar || 'avatar-1', photoUrl: player.photoUrl });
    }
  };

  const handleSaveEdit = (name: string, avatar: string, photoUrl?: string) => {
    if (editingPlayer) {
      updateLocalPlayer(editingPlayer.id, { name, avatar, photoUrl });
      setEditingPlayer(null);
    }
  };

  const handleDeletePlayer = (id: string) => {
    if (confirm('Are you sure you want to remove this player from your league? This will permanently delete their profile.')) {
      deleteLocalPlayer(id);
    }
  };

  const handleAddGuest = (name: string, avatar: string, photoUrl?: string) => {
    const player = addGuestPlayer(name, avatar);
    if (photoUrl) {
      updateLocalPlayer(player.id, { photoUrl });
    }
    setIsAddGuestModalOpen(false);
  };

  const handleEditGuest = (id: string) => {
    const player = guestPlayers.find(p => p.id === id);
    if (player) {
      setEditingGuest({ id: player.id, name: player.name, avatar: player.avatar || 'avatar-1', photoUrl: player.photoUrl });
    }
  };

  const handleSaveGuestEdit = (name: string, avatar: string, photoUrl?: string) => {
    if (editingGuest) {
      updateLocalPlayer(editingGuest.id, { name, avatar, photoUrl });
      setEditingGuest(null);
    }
  };

  const handleDeleteGuest = (id: string) => {
    if (confirm('Are you sure you want to remove this guest player?')) {
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
                const hasPhoto = !!player.photoUrl;

                return (
                  <div key={player.id} className="flex flex-col items-center gap-2 relative">
                    {/* Avatar or Photo */}
                    {hasPhoto ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20">
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                        style={{ backgroundColor: avatar.color }}
                      >
                        {avatar.emoji}
                      </div>
                    )}

                    {/* Name */}
                    <span className="text-white text-sm font-bold text-center max-w-24 truncate">
                      {player.name}
                    </span>

                    {/* Edit/Delete Buttons */}
                    <div className="flex gap-2">
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
            <div className="flex justify-center mb-12">
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

            {/* Divider */}
            <div className="border-t border-white/20 my-8"></div>

            {/* Guest Players Section */}
            <h2 className="text-white text-2xl font-bold mb-6 text-center">
              GUEST PLAYERS ({guestPlayers.length})
            </h2>

            <p className="text-white text-center mb-8 opacity-75">
              Temporary guest players added during games. These can be removed when no longer needed.
            </p>

            {guestPlayers.length > 0 ? (
              <div className="grid grid-cols-6 gap-6 mb-8">
                {guestPlayers.map((player) => {
                  const avatar = STOCK_AVATARS.find(a => a.id === player.avatar) || STOCK_AVATARS[0];
                  const hasPhoto = !!player.photoUrl;

                  return (
                    <div key={player.id} className="flex flex-col items-center gap-2 relative">
                      {/* Avatar or Photo */}
                      {hasPhoto ? (
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20">
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                          style={{ backgroundColor: avatar.color }}
                        >
                          {avatar.emoji}
                        </div>
                      )}

                      {/* Name */}
                      <span className="text-white text-sm font-bold text-center max-w-24 truncate">
                        {player.name}
                      </span>

                      {/* Edit/Delete Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditGuest(player.id)}
                          className="px-3 py-1 bg-[#6b1a8b] text-white text-xs font-bold rounded hover:opacity-90 transition-opacity"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDeleteGuest(player.id)}
                          className="px-3 py-1 bg-[#9d1a1a] text-white text-xs font-bold rounded hover:opacity-90 transition-opacity"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-white text-center mb-8 opacity-50 italic">
                No guest players. Add guests from the player selection screen during games.
              </p>
            )}

            {/* Add Guest Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsAddGuestModalOpen(true)}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-[#666666] flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">+</span>
                </div>
                <span className="text-white text-lg font-bold">ADD GUEST</span>
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
          initialPhotoUrl={editingPlayer?.photoUrl}
          title={editingPlayer ? 'EDIT PLAYER' : 'ADD PLAYER'}
        />

        {/* Add/Edit Guest Modal */}
        <AddGuestPlayerModal
          isOpen={isAddGuestModalOpen || editingGuest !== null}
          onClose={() => {
            setIsAddGuestModalOpen(false);
            setEditingGuest(null);
          }}
          onAdd={editingGuest ? handleSaveGuestEdit : handleAddGuest}
          initialName={editingGuest?.name}
          initialAvatar={editingGuest?.avatar}
          initialPhotoUrl={editingGuest?.photoUrl}
          title={editingGuest ? 'EDIT GUEST' : 'ADD GUEST'}
        />
      </PageWrapper>
    </div>
  );
}
