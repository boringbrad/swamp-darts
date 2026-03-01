'use client';

import { useState } from 'react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import AddGuestPlayerModal from '../components/AddGuestPlayerModal';
import { useAppContext } from '../contexts/AppContext';
import { usePlayerContext } from '../contexts/PlayerContext';
import { removeRoomMember } from '../lib/roomMembers';
import { useRoomCodeQuery } from '../lib/queries/useRoomMembersQuery';
import { STOCK_AVATARS } from '../lib/avatars';
import { StoredPlayer } from '../types/storage';

function getAvatarData(avatarId?: string) {
  return STOCK_AVATARS.find(a => a.id === avatarId) || STOCK_AVATARS[0];
}

function PlayerAvatar({ player, size = 12, borderClass = 'border-white/20' }: {
  player: { photoUrl?: string; avatar?: string; name: string };
  size?: number;
  borderClass?: string;
}) {
  const av = getAvatarData(player.avatar);
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0 border-2 ${borderClass}`;
  if (player.photoUrl) {
    return (
      <div className={`${cls} overflow-hidden`}>
        <img src={player.photoUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${cls} flex items-center justify-center text-xl`} style={{ backgroundColor: av.color }}>
      {av.emoji}
    </div>
  );
}

export default function ManagePlayersPage() {
  const { userProfile } = useAppContext();
  const {
    localPlayers,
    sessionPlayers,
    addGuestPlayer,
    updateLocalPlayer,
    deleteLocalPlayer,
    refreshRoomMembers,
  } = usePlayerContext();

  // Room code — from TanStack Query cache (no useEffect needed)
  const { data: roomCode } = useRoomCodeQuery();
  const [codeCopied, setCodeCopied] = useState(false);

  // Guest management
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<StoredPlayer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Room member removal
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const persistentGuests = localPlayers.filter(p => !p.isVerified);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleRemoveMember = async (sp: StoredPlayer) => {
    if (!sp.userId) return;
    setRemovingUserId(sp.userId);
    await removeRoomMember(sp.userId);
    await refreshRoomMembers();
    setRemovingUserId(null);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />
      <PageWrapper>
        <div className="h-24"></div>
        <main className="px-6 pb-24 max-w-2xl mx-auto">

          {/* ── YOUR ACCOUNT + ROOM CODE ──────────────────── */}
          <section className="mb-8">
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">Your Account</h2>
            <div className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4 mb-3">
              <PlayerAvatar
                player={{
                  photoUrl: (userProfile as any)?.photoUrl,
                  avatar: userProfile?.avatar,
                  name: userProfile?.displayName || '',
                }}
                size={14}
              />
              <div>
                <p className="text-white text-xl font-bold">{userProfile?.displayName || 'Unknown User'}</p>
                <p className="text-white/40 text-sm">Your account — always in the pool</p>
              </div>
            </div>

            {/* Room code display */}
            <div className="bg-[#2a2a2a] rounded-lg p-4">
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2">Your Room Code</p>
              <p className="text-white/60 text-xs mb-3">
                Share this code with friends. They enter it on their Friends page to join your player pool.
              </p>
              <div className="flex items-center gap-3">
                {roomCode ? (
                  <>
                    <span className="text-3xl font-black tracking-[0.3em] text-[#4CAF50] font-mono">
                      {roomCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-4 py-2 bg-[#444] text-white text-sm font-bold rounded hover:bg-[#555] transition-colors"
                    >
                      {codeCopied ? 'COPIED!' : 'COPY'}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
                    <span className="text-white/40 text-sm">Loading...</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── TONIGHT'S PLAYERS (room members) ─────────── */}
          <section className="mb-8">
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">Tonight's Players</h2>

            {sessionPlayers.length === 0 ? (
              <div className="bg-[#2a2a2a] rounded-lg p-6 text-center">
                <p className="text-white/40 text-sm">
                  No one has joined yet. Share your room code and friends will appear here automatically.
                </p>
              </div>
            ) : (
              sessionPlayers.map(sp => (
                <div key={sp.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4 mb-3">
                  <PlayerAvatar
                    player={{ photoUrl: sp.photoUrl, avatar: sp.avatar, name: sp.name }}
                    size={12}
                    borderClass="border-[#4CAF50]/60"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold truncate">{sp.name}</p>
                      <span className="text-[#4CAF50] text-xs font-bold">✓</span>
                    </div>
                    <p className="text-white/40 text-xs">Verified account</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(sp)}
                    disabled={removingUserId === sp.userId}
                    className="px-3 py-1 bg-[#444] text-white/70 text-sm font-bold rounded hover:bg-[#555] transition-colors disabled:opacity-50"
                  >
                    {removingUserId === sp.userId ? '...' : 'REMOVE'}
                  </button>
                </div>
              ))
            )}
          </section>

          {/* ── GUEST PLAYERS ────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">Guest Players</h2>

            {persistentGuests.length === 0 && (
              <p className="text-white/40 text-sm mb-4">No guest players yet.</p>
            )}

            {persistentGuests.map(p => (
              <div key={p.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4 mb-3">
                <PlayerAvatar player={{ photoUrl: p.photoUrl, avatar: p.avatar, name: p.name }} size={12} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{p.name}</p>
                  <p className="text-white/40 text-xs">Guest</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingGuest(p)}
                    className="px-3 py-1 bg-[#2196F3] text-white text-sm font-bold rounded hover:opacity-90 transition-opacity"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(p.id)}
                    className="px-3 py-1 bg-[#FF6B6B] text-white text-sm font-bold rounded hover:opacity-90 transition-opacity"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowAddGuest(true)}
              className="w-full py-3 border-2 border-dashed border-[#444] text-white/50 text-sm font-bold rounded-lg hover:border-[#6b1a8b] hover:text-white transition-colors"
            >
              + ADD GUEST
            </button>
          </section>
        </main>
      </PageWrapper>

      {/* Add Guest Modal */}
      <AddGuestPlayerModal
        isOpen={showAddGuest}
        onClose={() => setShowAddGuest(false)}
        onAdd={(name, avatar, photoUrl) => {
          const newPlayer = addGuestPlayer(name, avatar);
          if (photoUrl) updateLocalPlayer(newPlayer.id, { photoUrl });
        }}
      />

      {/* Edit Guest Modal */}
      <AddGuestPlayerModal
        isOpen={!!editingGuest}
        onClose={() => setEditingGuest(null)}
        onAdd={(name, avatar, photoUrl) => {
          if (!editingGuest) return;
          updateLocalPlayer(editingGuest.id, { name, avatar, photoUrl });
          setEditingGuest(null);
        }}
        initialName={editingGuest?.name}
        initialAvatar={editingGuest?.avatar}
        initialPhotoUrl={editingGuest?.photoUrl}
        title="EDIT PLAYER"
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[#2a2a2a] rounded-lg p-8 w-full max-w-sm mx-4 text-center shadow-2xl">
            <p className="text-white text-xl font-bold mb-2">Delete Player?</p>
            <p className="text-white/50 text-sm mb-6">This will also remove their local match history.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-[#444] text-white font-bold rounded hover:bg-[#555] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => { deleteLocalPlayer(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 py-3 bg-[#FF6B6B] text-white font-bold rounded hover:opacity-90 transition-opacity"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
