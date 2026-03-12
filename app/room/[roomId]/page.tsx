'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePartyRoom } from '../../hooks/usePartyRoom';
import { usePartyMembers } from '../../hooks/usePartyMembers';
import {
  leavePartyRoom,
  kickPartyMember,
  setSittingOut,
  startPartyGame,
  PartyMember,
} from '../../lib/partyRooms';
import { OnlineGameSettings } from '../../lib/sessions';
import { getAvatarById } from '../../lib/avatars';
import { createClient } from '../../lib/supabase/client';
import ChatPanel from '../../components/ChatPanel';

// ── Shared avatar bubble ──────────────────────────────────────────────────────
function AvatarBubble({ avatar, photoUrl, name, size = 48 }: {
  avatar: string; photoUrl?: string | null; name: string; size?: number;
}) {
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  const av = getAvatarById(avatar) || getAvatarById('avatar-1')!;
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold"
      style={{ width: size, height: size, backgroundColor: av.color + '33', border: `2px solid ${av.color}` }}>
      {av.emoji || name[0]?.toUpperCase()}
    </div>
  );
}

// ── Game settings used in the start-game modal ────────────────────────────────
type GameType = 'cricket' | 'golf' | 'x01';

const GAME_TYPES: { id: GameType; label: string; emoji: string }[] = [
  { id: 'cricket', label: 'Cricket', emoji: '🦗' },
  { id: 'golf',    label: 'Golf',    emoji: '⛳' },
  { id: 'x01',     label: 'X01',     emoji: '🎯' },
];

// ── Start Game Modal ──────────────────────────────────────────────────────────
function StartGameModal({
  members,
  myUserId,
  onStart,
  onClose,
}: {
  members: PartyMember[];
  myUserId: string;
  onStart: (settings: OnlineGameSettings, hostId: string, guestId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [gameType, setGameType] = useState<GameType>('cricket');
  const [player1Id, setPlayer1Id] = useState(myUserId);
  const [player2Id, setPlayer2Id] = useState('');
  // Cricket
  const [swampRules, setSwampRules] = useState(true);
  // Golf
  const [golfVariant, setGolfVariant] = useState<'stroke-play' | 'match-play' | 'skins'>('stroke-play');
  const [tieBreakerEnabled, setTieBreakerEnabled] = useState(true);
  // X01
  const [x01Score, setX01Score] = useState<301 | 501 | 701>(501);
  const [doubleIn, setDoubleIn] = useState(false);
  const [doubleOut, setDoubleOut] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  // Default second player to first non-host active member
  useEffect(() => {
    const other = members.find(m => m.userId !== myUserId && !m.isSittingOut);
    if (other) setPlayer2Id(other.userId);
  }, [members, myUserId]);

  const activePlayers = members.filter(m => !m.isSittingOut);

  const handleStart = async () => {
    if (!player1Id || !player2Id || player1Id === player2Id) {
      setError('Select two different players'); return;
    }
    setStarting(true);
    setError('');
    let settings: OnlineGameSettings;
    if (gameType === 'cricket') {
      settings = { gameType: 'cricket', variant: 'singles', swampRules };
    } else if (gameType === 'golf') {
      settings = { gameType: 'golf', variant: golfVariant, tieBreakerEnabled };
    } else {
      settings = { gameType: 'x01', variant: 'default', x01StartingScore: x01Score, x01DoubleIn: doubleIn, x01DoubleOut: doubleOut };
    }
    await onStart(settings, player1Id, player2Id);
    setStarting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#2a2a2a]">
          <h2 className="text-white font-black text-lg uppercase tracking-wide">Start a Game</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Game type */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Game</p>
            <div className="grid grid-cols-3 gap-2">
              {GAME_TYPES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGameType(g.id)}
                  className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1 transition-colors ${
                    gameType === g.id
                      ? 'bg-[#6b1a8b] text-white'
                      : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                  }`}
                >
                  <span className="text-xl">{g.emoji}</span>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Game settings */}
          {gameType === 'cricket' && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Rules</p>
              <button
                onClick={() => setSwampRules(v => !v)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  swampRules ? 'bg-[#4CAF50]/20 border border-[#4CAF50] text-[#4CAF50]' : 'bg-[#2a2a2a] text-gray-400 border border-[#3a3a3a]'
                }`}
              >
                {swampRules ? '✓ Swamp Rules' : 'Swamp Rules'}
              </button>
            </div>
          )}

          {gameType === 'golf' && (
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Variant</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['stroke-play', 'match-play', 'skins'] as const).map(v => (
                    <button key={v}
                      onClick={() => setGolfVariant(v)}
                      className={`py-2 rounded-lg font-semibold text-xs transition-colors ${
                        golfVariant === v ? 'bg-[#6b1a8b] text-white' : 'bg-[#2a2a2a] text-gray-300'
                      }`}
                    >
                      {v === 'stroke-play' ? 'Stroke' : v === 'match-play' ? 'Match' : 'Skins'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setTieBreakerEnabled(v => !v)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  tieBreakerEnabled ? 'bg-[#4CAF50]/20 border border-[#4CAF50] text-[#4CAF50]' : 'bg-[#2a2a2a] text-gray-400 border border-[#3a3a3a]'
                }`}
              >
                {tieBreakerEnabled ? '✓ Tie Breaker' : 'Tie Breaker'}
              </button>
            </div>
          )}

          {gameType === 'x01' && (
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Starting Score</p>
                <div className="grid grid-cols-3 gap-2">
                  {([301, 501, 701] as const).map(s => (
                    <button key={s}
                      onClick={() => setX01Score(s)}
                      className={`py-2 rounded-lg font-bold text-sm transition-colors ${
                        x01Score === s ? 'bg-[#6b1a8b] text-white' : 'bg-[#2a2a2a] text-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Double In', val: doubleIn, set: setDoubleIn },
                  { label: 'Double Out', val: doubleOut, set: setDoubleOut },
                ].map(({ label, val, set }) => (
                  <button key={label}
                    onClick={() => set(v => !v)}
                    className={`py-2 rounded-xl font-semibold text-xs transition-colors ${
                      val ? 'bg-[#4CAF50]/20 border border-[#4CAF50] text-[#4CAF50]' : 'bg-[#2a2a2a] text-gray-400 border border-[#3a3a3a]'
                    }`}
                  >
                    {val ? `✓ ${label}` : label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player selection */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Players (pick 2)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Player 1', value: player1Id, set: setPlayer1Id, other: player2Id },
                { label: 'Player 2', value: player2Id, set: setPlayer2Id, other: player1Id },
              ].map(({ label, value, set, other }) => (
                <div key={label}>
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <select
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6b1a8b]"
                  >
                    <option value="">— select —</option>
                    {activePlayers.map(m => (
                      <option key={m.userId} value={m.userId} disabled={m.userId === other}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleStart}
            disabled={starting || !player1Id || !player2Id || player1Id === player2Id}
            className="w-full py-4 bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold text-lg rounded-xl transition-colors disabled:opacity-40"
          >
            {starting ? 'Starting...' : '▶ Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Party Lobby Page ──────────────────────────────────────────────────────────
export default function PartyLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { room, loading: roomLoading } = usePartyRoom(roomId);
  const { members } = usePartyMembers(roomId);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState('Player');
  const [showStartModal, setShowStartModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Track when a game session is started — navigate to it
  const prevSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push('/auth/login'); return; }
      setMyUserId(session.user.id);
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('display_name').eq('id', user.id).single()
        .then(({ data }) => { if (data?.display_name) setMyDisplayName(data.display_name); });
    });
  }, []);

  // Navigate to game when host starts one
  useEffect(() => {
    if (!room?.currentSessionId) {
      prevSessionIdRef.current = null;
      return;
    }
    if (room.currentSessionId === prevSessionIdRef.current) return;
    prevSessionIdRef.current = room.currentSessionId;
    // Navigate to the game (only the two players will actually play;
    // sitting-out members stay here and see the "in progress" banner)
    if (!myUserId) return;
    const isPlaying = members.some(m => m.userId === myUserId && !m.isSittingOut);
    if (isPlaying) {
      // Check if this user is one of the two players in the session
      const supabase = createClient();
      supabase
        .from('session_participants')
        .select('user_id')
        .eq('session_id', room.currentSessionId)
        .then(({ data }) => {
          const playerIds = (data || []).map((p: any) => p.user_id);
          if (playerIds.includes(myUserId)) {
            router.push(`/online/${room.currentSessionId}/game`);
          }
        });
    }
  }, [room?.currentSessionId, myUserId, members]);

  // Room closed → boot everyone to online page
  useEffect(() => {
    if (room?.status === 'closed' && myUserId && room.hostUserId !== myUserId) {
      alert('The host has closed the room.');
      router.push('/online');
    }
  }, [room?.status, myUserId]);

  const isHost = myUserId && room?.hostUserId === myUserId;
  const myMember = members.find(m => m.userId === myUserId);
  const activeMembers = members.filter(m => !m.leftAt);

  const handleLeave = async () => {
    if (!confirm(isHost ? 'Close the room for everyone?' : 'Leave this room?')) return;
    setLeaving(true);
    await leavePartyRoom(roomId);
    router.push('/online');
  };

  const handleStartGame = async (settings: OnlineGameSettings, hostId: string, guestId: string) => {
    setShowStartModal(false);
    await startPartyGame(roomId, settings, hostId, guestId);
    // Navigation handled via room.currentSessionId effect above
  };

  const handleToggleSitOut = async (member: PartyMember) => {
    await setSittingOut(roomId, member.userId, !member.isSittingOut);
  };

  if (roomLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-400">Loading room...</p>
      </div>
    );
  }

  if (!room || room.status === 'closed') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-white font-bold text-xl mb-2">Room not found</p>
          <p className="text-gray-400 text-sm mb-6">This room has been closed or doesn't exist.</p>
          <button onClick={() => router.push('/online')} className="px-6 py-3 bg-[#6b1a8b] text-white font-bold rounded-xl">
            Back to Online
          </button>
        </div>
      </div>
    );
  }

  const gameInProgress = !!room.currentSessionId;

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="bg-[#111] border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs">Party Room</p>
          <p className="text-white font-black text-xl tracking-widest font-mono">{room.roomCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{activeMembers.length}/4</span>
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="px-4 py-2 text-red-400 border border-red-400/40 rounded-lg text-sm font-bold hover:bg-red-400/10 transition-colors disabled:opacity-50"
          >
            {isHost ? 'Close Room' : 'Leave'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-5 gap-5 max-w-lg mx-auto w-full">

        {/* Game in progress banner */}
        {gameInProgress && (
          <div className="bg-[#4CAF50]/10 border border-[#4CAF50]/40 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <div className="flex-1">
              <p className="text-[#4CAF50] font-bold text-sm">Game in progress</p>
              <p className="text-gray-400 text-xs">Players will return here when the game ends</p>
            </div>
            <button
              onClick={() => router.push(`/online/${room.currentSessionId}/game`)}
              className="px-3 py-1 bg-[#4CAF50]/20 text-[#4CAF50] font-bold text-xs rounded-lg hover:bg-[#4CAF50]/30 transition-colors"
            >
              Watch
            </button>
          </div>
        )}

        {/* Share code */}
        <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">Share code</p>
            <p className="text-white font-black text-2xl tracking-widest font-mono">{room.roomCode}</p>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(room.roomCode)}
            className="px-3 py-2 bg-[#3a3a3a] text-gray-300 text-sm font-semibold rounded-lg hover:bg-[#4a4a4a] transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Members */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">
            Players ({activeMembers.length}/4)
          </p>
          <div className="space-y-2">
            {activeMembers.map(member => {
              const isMe = member.userId === myUserId;
              const isRoomHost = member.userId === room.hostUserId;
              return (
                <div
                  key={member.userId}
                  className={`flex items-center gap-3 bg-[#2a2a2a] border rounded-xl px-4 py-3 ${
                    member.isSittingOut ? 'border-[#2a2a2a] opacity-60' : 'border-[#3a3a3a]'
                  }`}
                >
                  <AvatarBubble
                    avatar={member.avatar}
                    photoUrl={member.photoUrl}
                    name={member.displayName}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold truncate">{member.displayName}</p>
                      {isRoomHost && (
                        <span className="text-[#a855f7] text-xs font-bold bg-[#a855f7]/10 px-2 py-0.5 rounded-full">HOST</span>
                      )}
                      {isMe && !isRoomHost && (
                        <span className="text-gray-500 text-xs">you</span>
                      )}
                    </div>
                    {member.isSittingOut && (
                      <p className="text-gray-500 text-xs">sitting out</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Sit out toggle — own row or host can toggle */}
                    {(isMe || isHost) && (
                      <button
                        onClick={() => handleToggleSitOut(member)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          member.isSittingOut
                            ? 'bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50]/40'
                            : 'bg-[#2a2a2a] text-gray-500 border border-[#3a3a3a] hover:border-[#4CAF50]/40'
                        }`}
                      >
                        {member.isSittingOut ? 'Sit In' : 'Sit Out'}
                      </button>
                    )}
                    {/* Host kick button */}
                    {isHost && !isMe && (
                      <button
                        onClick={() => kickPartyMember(roomId, member.userId)}
                        className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors"
                        title="Kick player"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - activeMembers.length) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#1e1e1e] border border-dashed border-[#2a2a2a] rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#3a3a3a] flex items-center justify-center text-gray-600 text-lg">+</div>
                <p className="text-gray-600 text-sm">Waiting for player...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Start game button — host only, not during a game */}
        {isHost && !gameInProgress && (
          <button
            onClick={() => setShowStartModal(true)}
            disabled={activeMembers.filter(m => !m.isSittingOut).length < 2}
            className="w-full py-4 bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold text-lg rounded-2xl transition-colors disabled:opacity-40 shadow-lg"
          >
            ▶ Start Game
          </button>
        )}
        {isHost && !gameInProgress && activeMembers.filter(m => !m.isSittingOut).length < 2 && (
          <p className="text-gray-500 text-xs text-center -mt-3">
            Need at least 2 active players to start
          </p>
        )}
      </div>

      {/* Start game modal */}
      {showStartModal && myUserId && (
        <StartGameModal
          members={activeMembers.filter(m => !m.isSittingOut)}
          myUserId={myUserId}
          onStart={handleStartGame}
          onClose={() => setShowStartModal(false)}
        />
      )}

      {/* Chat panel — always available in the party room */}
      {myUserId && room.currentSessionId && (
        <ChatPanel
          sessionId={room.currentSessionId}
          myUserId={myUserId}
          myDisplayName={myDisplayName}
        />
      )}
    </div>
  );
}
