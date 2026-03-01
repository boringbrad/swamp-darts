'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import AddGuestPlayerModal from '../components/AddGuestPlayerModal';
import { useAppContext } from '../contexts/AppContext';
import { usePlayerContext } from '../contexts/PlayerContext';
import {
  createPlayerSession,
  closePlayerSession,
  getMyActiveSession,
  getSessionParticipants,
  removeParticipant,
  PlayerSessionInfo,
  SessionParticipant,
} from '../lib/playerSessions';
import { createClient } from '../lib/supabase/client';
import { STOCK_AVATARS } from '../lib/avatars';
import { StoredPlayer, SessionPlayer } from '../types/storage';

const supabase = createClient();

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
    addSessionPlayer,
    removeSessionPlayer,
  } = usePlayerContext();

  // Guest management
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<StoredPlayer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Game night session state
  const [mySession, setMySession] = useState<PlayerSessionInfo | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const persistentGuests = localPlayers.filter(p => !p.isVerified);

  // On mount: check for existing active session and subscribe to participants
  useEffect(() => {
    initSession();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  async function initSession() {
    const session = await getMyActiveSession();
    if (session) {
      setMySession(session);
      // Load existing participants and add them to the player pool
      const participants = await getSessionParticipants(session.id);
      for (const p of participants) {
        addSessionPlayer({
          userId: p.userId,
          displayName: p.displayName,
          avatar: p.avatar,
          photoUrl: p.photoUrl,
          joinedAt: p.joinedAt,
          expiresAt: session.expiresAt,
        });
      }
      subscribeToParticipants(session);
    }
  }

  function subscribeToParticipants(session: PlayerSessionInfo) {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`session-participants:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_session_participants',
          filter: `session_id=eq.${session.id}`,
        },
        (payload: any) => {
          const p = payload.new;
          addSessionPlayer({
            userId: p.user_id,
            displayName: p.display_name,
            avatar: p.avatar,
            photoUrl: p.photo_url,
            joinedAt: p.joined_at,
            expiresAt: session.expiresAt,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'player_session_participants',
          filter: `session_id=eq.${session.id}`,
        },
        (payload: any) => {
          if (payload.old?.user_id) removeSessionPlayer(payload.old.user_id);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }

  async function handleStartSession() {
    setStartingSession(true);
    try {
      const sessionId = await createPlayerSession({
        displayName: userProfile?.displayName,
        avatar: userProfile?.avatar,
        photoUrl: (userProfile as any)?.photoUrl,
      });

      if (sessionId) {
        const session: PlayerSessionInfo = {
          id: sessionId,
          hostUserId: userProfile?.id || '',
          hostProfile: {
            displayName: userProfile?.displayName,
            avatar: userProfile?.avatar,
            photoUrl: (userProfile as any)?.photoUrl,
          },
          status: 'open',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        };
        setMySession(session);
        subscribeToParticipants(session);
      }
    } catch (err) {
      console.error('Failed to start game night:', err);
    } finally {
      setStartingSession(false);
    }
  }

  async function handleEndSession() {
    if (!mySession) return;
    setEndingSession(true);
    await closePlayerSession(mySession.id);
    // Clear all session players from the pool
    for (const sp of sessionPlayers) {
      if (sp.userId) removeSessionPlayer(sp.userId);
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setMySession(null);
    setEndingSession(false);
  }

  async function handleRemoveParticipant(sp: StoredPlayer) {
    if (!mySession || !sp.userId) return;
    await removeParticipant(mySession.id, sp.userId);
    removeSessionPlayer(sp.userId);
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />
      <PageWrapper>
        <div className="h-24"></div>
        <main className="px-6 pb-24 max-w-2xl mx-auto">

          {/* ── YOUR ACCOUNT ─────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">Your Account</h2>
            <div className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4">
              <PlayerAvatar
                player={{ photoUrl: (userProfile as any)?.photoUrl, avatar: userProfile?.avatar, name: userProfile?.displayName || '' }}
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
            <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">Tonight's Players</h2>

            {/* Session players list */}
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
                {mySession && (
                  <button
                    onClick={() => handleRemoveParticipant(sp)}
                    className="px-3 py-1 bg-[#444] text-white/70 text-sm font-bold rounded hover:bg-[#555] transition-colors"
                  >
                    REMOVE
                  </button>
                )}
              </div>
            ))}

            {/* No session — show start button */}
            {!mySession && (
              <div className="bg-[#2a2a2a] rounded-lg p-6 text-center">
                {sessionPlayers.length === 0 && (
                  <p className="text-white/40 text-sm mb-5">
                    Start a game night so friends can join from their Friends page. Their stats will be tracked all night.
                  </p>
                )}
                <button
                  onClick={handleStartSession}
                  disabled={startingSession}
                  className="w-full py-4 bg-[#4CAF50] text-white text-lg font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {startingSession ? 'STARTING...' : 'START GAME NIGHT'}
                </button>
              </div>
            )}

            {/* Session open — show status and end button */}
            {mySession && (
              <div className="bg-[#2a2a2a] rounded-lg p-4 mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse inline-block" />
                  <p className="text-[#4CAF50] text-sm font-bold">Game night is open</p>
                  <p className="text-white/30 text-xs ml-auto">{timeRemaining(mySession.expiresAt)}</p>
                </div>
                <p className="text-white/50 text-xs mb-4">
                  Friends can join from their Friends page. They'll appear here automatically.
                </p>
                <button
                  onClick={handleEndSession}
                  disabled={endingSession}
                  className="w-full py-2 bg-[#444] text-white/70 text-sm font-bold rounded hover:bg-[#555] transition-colors disabled:opacity-50"
                >
                  {endingSession ? 'ENDING...' : 'END GAME NIGHT'}
                </button>
              </div>
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
