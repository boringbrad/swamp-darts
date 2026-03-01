'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import AddGuestPlayerModal from '../components/AddGuestPlayerModal';
import { useAppContext } from '../contexts/AppContext';
import { usePlayerContext } from '../contexts/PlayerContext';
import { getFriends, Friend } from '../lib/friends';
import { createClient } from '../lib/supabase/client';
import { STOCK_AVATARS } from '../lib/avatars';
import { StoredPlayer, SessionPlayer } from '../types/storage';

const supabase = createClient();

type InviteFlowState = 'idle' | 'picking' | 'waiting' | 'done';

function getAvatarData(avatarId?: string) {
  return STOCK_AVATARS.find(a => a.id === avatarId) || STOCK_AVATARS[0];
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
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
    <div
      className={`${cls} flex items-center justify-center text-xl`}
      style={{ backgroundColor: av.color }}
    >
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
    addSessionPlayer,
    removeSessionPlayer,
  } = usePlayerContext();

  // Guest management state
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<StoredPlayer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Friend invite flow state
  const [inviteState, setInviteState] = useState<InviteFlowState>('idle');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Separate persistent guests from session players in the display
  const persistentGuests = localPlayers.filter(p => !p.isVerified);

  // Cleanup Realtime channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  async function openFriendPicker() {
    setInviteState('picking');
    setLoadingFriends(true);
    const result = await getFriends();
    const sessionUserIds = new Set(sessionPlayers.map(sp => sp.userId));
    setFriends(result.filter(f => !sessionUserIds.has(f.userId)));
    setLoadingFriends(false);
  }

  async function selectFriend(friend: Friend) {
    setSelectedFriend(friend);
    setCreatingInvite(true);
    setInviteState('waiting');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setInviteState('idle');
      return;
    }

    const { data, error } = await supabase
      .from('local_game_invites')
      .insert({
        host_user_id: session.user.id,
        invited_user_id: friend.userId,
        host_profile: {
          displayName: userProfile?.displayName || session.user.email,
          avatar: userProfile?.avatar,
          photoUrl: (userProfile as any)?.photoUrl,
        },
      })
      .select('id')
      .single();

    setCreatingInvite(false);

    if (error || !data) {
      console.error('Error creating invite:', error);
      setInviteState('idle');
      return;
    }

    setInviteId(data.id);
    const url = `${window.location.origin}/join-session/${data.id}`;
    setInviteUrl(url);

    // Subscribe to invite updates via Realtime
    const channel = supabase
      .channel(`invite:${data.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'local_game_invites',
          filter: `id=eq.${data.id}`,
        },
        (payload: any) => {
          if (payload.new?.status === 'accepted') {
            const profile = payload.new.invited_profile || {};
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

            addSessionPlayer({
              userId: friend.userId,
              displayName: profile.displayName || friend.displayName,
              avatar: profile.avatar || friend.avatar,
              photoUrl: profile.photoUrl || friend.photoUrl,
              joinedAt: now.toISOString(),
              expiresAt: expiresAt.toISOString(),
            });

            supabase.removeChannel(channel);
            channelRef.current = null;
            setInviteState('done');
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }

  function cancelInvite() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setInviteState('idle');
    setSelectedFriend(null);
    setInviteId(null);
    setInviteUrl('');
  }

  function resetInviteFlow() {
    setInviteState('idle');
    setSelectedFriend(null);
    setInviteId(null);
    setInviteUrl('');
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />
      <PageWrapper>
        <div className="h-24"></div>
        <main className="px-6 pb-24 max-w-2xl mx-auto">

          {/* ── YOUR ACCOUNT ─────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">
              Your Account
            </h2>
            <div className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4">
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
          </section>

          {/* ── TONIGHT'S PLAYERS ────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">
              Tonight's Players
            </h2>

            {sessionPlayers.length === 0 && inviteState === 'idle' && (
              <p className="text-white/40 text-sm mb-4">
                Invite friends with accounts to join tonight's games. Their stats will be tracked on their profile.
              </p>
            )}

            {/* Verified session players list */}
            {sessionPlayers.map(sp => (
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
                  <p className="text-[#4CAF50] text-xs">
                    {sp.sessionExpiresAt ? timeRemaining(sp.sessionExpiresAt) : ''}
                  </p>
                </div>
                <button
                  onClick={() => sp.userId && removeSessionPlayer(sp.userId)}
                  className="px-3 py-1 bg-[#444] text-white/70 text-sm font-bold rounded hover:bg-[#555] transition-colors"
                >
                  REMOVE
                </button>
              </div>
            ))}

            {/* Invite flow */}
            {inviteState === 'idle' && (
              <button
                onClick={openFriendPicker}
                className="w-full py-3 border-2 border-dashed border-[#444] text-white/50 text-sm font-bold rounded-lg hover:border-[#6b1a8b] hover:text-white transition-colors"
              >
                + ADD FRIEND
              </button>
            )}

            {inviteState === 'picking' && (
              <div className="bg-[#2a2a2a] rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Select a Friend</h3>
                  <button onClick={cancelInvite} className="text-white/50 hover:text-white text-sm transition-colors">
                    CANCEL
                  </button>
                </div>
                {loadingFriends && (
                  <p className="text-white/50 text-sm py-4 text-center">Loading friends...</p>
                )}
                {!loadingFriends && friends.length === 0 && (
                  <p className="text-white/50 text-sm py-4 text-center">
                    No friends available to invite. Add friends on the Friends page first, or all your friends are already in tonight's session.
                  </p>
                )}
                {friends.map(f => (
                  <button
                    key={f.userId}
                    onClick={() => selectFriend(f)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#3a3a3a] transition-colors text-left mb-1"
                  >
                    <PlayerAvatar
                      player={{ photoUrl: f.photoUrl, avatar: f.avatar, name: f.displayName }}
                      size={10}
                    />
                    <div>
                      <p className="text-white font-bold">{f.displayName}</p>
                      <p className="text-white/40 text-xs">@{f.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {inviteState === 'waiting' && selectedFriend && (
              <div className="bg-[#2a2a2a] rounded-lg p-6 text-center">
                {creatingInvite ? (
                  <p className="text-white font-bold">Creating invite...</p>
                ) : (
                  <>
                    <p className="text-white font-bold text-lg mb-1">
                      Waiting for {selectedFriend.displayName}...
                    </p>
                    <p className="text-white/50 text-sm mb-6">
                      Have them scan this QR code or open the link on their phone
                    </p>
                    <div className="flex justify-center mb-6">
                      <div className="bg-white p-4 rounded-xl inline-block">
                        <QRCodeSVG value={inviteUrl} size={180} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-3 mb-5 text-left">
                      <span className="text-white/50 text-xs flex-1 break-all">{inviteUrl}</span>
                      <button
                        onClick={copyInviteLink}
                        className="text-white/60 hover:text-white text-xs font-bold flex-shrink-0 ml-2 transition-colors"
                      >
                        {copyDone ? 'COPIED!' : 'COPY'}
                      </button>
                    </div>
                  </>
                )}
                <button
                  onClick={cancelInvite}
                  className="px-6 py-2 bg-[#444] text-white/70 text-sm font-bold rounded hover:bg-[#555] transition-colors"
                >
                  CANCEL
                </button>
              </div>
            )}

            {inviteState === 'done' && selectedFriend && (
              <div className="bg-[#2a2a2a] rounded-lg p-6 text-center">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-white font-bold text-xl mb-1">{selectedFriend.displayName} joined!</p>
                <p className="text-white/50 text-sm mb-6">
                  They're in the player pool for 8 hours. Their stats will be tracked tonight.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={resetInviteFlow}
                    className="px-5 py-2 bg-[#444] text-white/70 text-sm font-bold rounded hover:bg-[#555] transition-colors"
                  >
                    CLOSE
                  </button>
                  <button
                    onClick={() => { resetInviteFlow(); openFriendPicker(); }}
                    className="px-5 py-2 bg-[#6b1a8b] text-white text-sm font-bold rounded hover:opacity-90 transition-opacity"
                  >
                    ADD ANOTHER
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── GUEST PLAYERS ────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">
              Guest Players
            </h2>

            {persistentGuests.length === 0 && (
              <p className="text-white/40 text-sm mb-4">No guest players yet.</p>
            )}

            {persistentGuests.map(p => (
              <div key={p.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4 mb-3">
                <PlayerAvatar
                  player={{ photoUrl: p.photoUrl, avatar: p.avatar, name: p.name }}
                  size={12}
                />
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-[#2a2a2a] rounded-lg p-8 w-full max-w-sm mx-4 text-center shadow-2xl">
            <p className="text-white text-xl font-bold mb-2">Delete Player?</p>
            <p className="text-white/50 text-sm mb-6">
              This will also remove their local match history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-[#444] text-white font-bold rounded hover:bg-[#555] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  deleteLocalPlayer(deleteConfirm);
                  setDeleteConfirm(null);
                }}
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
