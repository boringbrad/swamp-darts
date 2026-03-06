'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import PageWrapper from '../../components/PageWrapper';
import { useAppContext } from '../../contexts/AppContext';
import { useSession } from '../../hooks/useSession';
import { useSessionParticipants } from '../../hooks/useSessionParticipants';
import { startOnlineGame, kickParticipant, leaveSession, completeOnlineSession, OnlineGameSettings } from '../../lib/sessions';
import { getAvatarById } from '../../lib/avatars';

function AvatarBubble({ avatar, photoUrl, name, size = 56 }: {
  avatar: string;
  photoUrl?: string | null;
  name: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name} className="rounded-full object-cover"
        style={{ width: size, height: size }} />
    );
  }
  const av = getAvatarById(avatar) || getAvatarById('avatar-1')!;
  return (
    <div className="rounded-full flex items-center justify-center text-2xl font-bold"
      style={{ width: size, height: size, backgroundColor: av.color + '33', border: `2px solid ${av.color}` }}>
      {av.emoji || name[0]?.toUpperCase()}
    </div>
  );
}

function gameLabel(settings: OnlineGameSettings | null): string {
  if (!settings) return 'Game';
  const typeMap: Record<string, string> = { cricket: 'Cricket', x01: 'X01', golf: 'Golf' };
  const variantMap: Record<string, string> = {
    singles: 'Singles', 'stroke-play': 'Stroke Play',
    'match-play': 'Match Play', skins: 'Skins', default: '',
  };
  if (settings.gameType === 'x01') return `${settings.x01StartingScore || 501} X01`;
  const v = variantMap[settings.variant] || settings.variant;
  return v ? `${typeMap[settings.gameType]} · ${v}` : typeMap[settings.gameType];
}

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAppContext();
  const sessionId = params.sessionId as string;

  const { session, loading: sessionLoading } = useSession(sessionId);
  const { activeParticipants } = useSessionParticipants(sessionId);

  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // When true the cleanup effect skips calling leaveSession (intentional navigation)
  const suppressLeaveRef = useRef(false);
  const prevGuestIdRef = useRef<string | null>(null);
  const hostWasSeenRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const myId = userProfile?.id;
  const isHost = session?.hostUserId === myId;
  const guest = activeParticipants.find(p => p.userId !== session?.hostUserId && !p.isHost);
  const hostParticipant = activeParticipants.find(p => p.isHost);

  // iOS-compatible audio using Web Audio API
  // AudioContext must be created/resumed inside a user gesture on iOS.
  const playBell = () => {
    const ctx = audioCtxRef.current;
    const buf = audioBufferRef.current;
    if (!ctx || !buf) return;
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  };

  useEffect(() => {
    const AudioCtx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const setup = async (fromGesture = false) => {
      if (audioCtxRef.current) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      // Pre-fetch & decode the sound file
      try {
        const res = await fetch('/sounds/mixkit-bell-notification-933.wav');
        const buf = await res.arrayBuffer();
        audioBufferRef.current = await ctx.decodeAudioData(buf);
      } catch { /* ignore */ }
      // If created in a user gesture, resume immediately to unlock
      if (fromGesture && ctx.state === 'suspended') ctx.resume();
    };

    // Try immediately (may succeed if page was reached via recent user gesture)
    setup(false);

    // Also set up on first user touch/click as a reliable fallback
    const onGesture = () => setup(true);
    document.addEventListener('touchstart', onGesture, { once: true });
    document.addEventListener('click', onGesture, { once: true });
    return () => {
      document.removeEventListener('touchstart', onGesture);
      document.removeEventListener('click', onGesture);
    };
  }, []);

  // If the host navigates away without clicking "Cancel Lobby", clean up the session
  // so it doesn't stay as a ghost in the lobby list.
  useEffect(() => {
    return () => {
      if (!suppressLeaveRef.current && sessionId) {
        // Complete the session so the guest sees the status change and gets redirected
        completeOnlineSession(sessionId).catch(() => {});
        leaveSession(sessionId); // fire-and-forget; Next.js client nav keeps JS context alive
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Navigate to game when host starts it
  useEffect(() => {
    if (session?.status === 'in_game') {
      suppressLeaveRef.current = true;
      router.push(`/online/${sessionId}/game`);
    }
    // If session expired or completed, go back to lobby list
    if (session?.status === 'expired' || session?.status === 'completed') {
      suppressLeaveRef.current = true;
      router.push('/online');
    }
  }, [session?.status]);

  // If guest was kicked (no longer a participant)
  useEffect(() => {
    if (!myId || sessionLoading) return;
    if (!isHost && session?.status === 'lobby') {
      const iAmParticipant = activeParticipants.some(p => p.userId === myId);
      if (activeParticipants.length > 0 && !iAmParticipant) {
        // We've been kicked
        router.push('/online');
      }
    }
  }, [activeParticipants, myId, isHost, sessionLoading]);

  // Guest: detect when host has left the lobby (more reliable than watching session status)
  useEffect(() => {
    if (hostParticipant) { hostWasSeenRef.current = true; return; }
    // If we've seen the host before and now they're gone, host cancelled
    if (!myId || sessionLoading || isHost || session?.status !== 'lobby') return;
    if (hostWasSeenRef.current && activeParticipants.length >= 0) {
      suppressLeaveRef.current = true;
      router.push('/online');
    }
  }, [hostParticipant, myId, sessionLoading, isHost, session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play notification sound for host when guest first joins
  useEffect(() => {
    if (!isHost) return;
    const guestId = guest?.userId ?? null;
    if (guestId && !prevGuestIdRef.current) {
      playBell();
    }
    prevGuestIdRef.current = guestId;
  }, [isHost, guest?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Repeat every 5 seconds while guest is present
  useEffect(() => {
    if (!isHost || !guest) return;
    const interval = setInterval(playBell, 5000);
    return () => clearInterval(interval);
  }, [isHost, !!guest]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async () => {
    if (!session) return;
    setStarting(true);
    const result = await startOnlineGame(session.id);
    if (!result.success) {
      alert(result.error || 'Failed to start game');
      setStarting(false);
      return;
    }
    suppressLeaveRef.current = true; // navigating to game, not leaving
    // Navigate directly — don't rely on Realtime for the host
    router.push(`/online/${sessionId}/game`);
  };

  const handleKick = async () => {
    if (!guest?.userId || !session) return;
    await kickParticipant(session.id, guest.userId);
  };

  const handleLeave = async () => {
    if (!session) return;
    setLeaving(true);
    suppressLeaveRef.current = true; // leaveSession called explicitly below
    // If host cancels, complete the session so the guest gets redirected
    if (isHost) {
      await Promise.allSettled([
        completeOnlineSession(session.id),
        leaveSession(session.id),
      ]);
    } else {
      await leaveSession(session.id);
    }
    router.push('/online');
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white font-bold mb-4">Lobby not found</p>
          <button onClick={() => router.push('/online')} className="text-[#a855f7] underline">
            Back to Lobbies
          </button>
        </div>
      </div>
    );
  }

  const settings = session.gameSettings;

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header showBackButton={false} />
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4 sm:px-6 py-8">
        <div className="w-full max-w-md">

          {/* Game info card */}
          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-2xl p-6 mb-6 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
              {isHost ? 'Your Lobby' : 'Joining Lobby'}
            </p>
            <h2 className="text-white text-2xl font-black mb-1">{gameLabel(settings)}</h2>
            {settings?.gameType === 'cricket' && (
              <p className="text-gray-500 text-sm">{settings.swampRules ? 'Swamp Rules' : 'Standard Rules'}</p>
            )}
            {settings?.gameType === 'x01' && (
              <p className="text-gray-500 text-sm">
                {settings.x01DoubleOut ? 'Double Out' : 'Straight Out'}
                {settings.x01DoubleIn ? ' · Double In' : ''}
              </p>
            )}
            {settings?.gameType === 'golf' && (
              <p className="text-gray-500 text-sm">
                {settings.tieBreakerEnabled ? 'Tie Breaker On' : 'No Tie Breaker'}
              </p>
            )}
            <div className="mt-3 inline-block bg-[#1a1a1a] px-3 py-1 rounded-full">
              <p className="text-gray-400 text-xs font-mono">Room: <span className="text-white font-bold">{session.roomCode}</span></p>
            </div>
          </div>

          {/* Players */}
          <div className="space-y-3 mb-8">
            {/* Host */}
            <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-4 flex items-center gap-4">
              <AvatarBubble
                avatar={hostParticipant?.avatar || 'avatar-1'}
                photoUrl={hostParticipant?.photoUrl}
                name={hostParticipant?.displayName || 'Host'}
              />
              <div className="flex-1">
                <p className="text-white font-bold">{hostParticipant?.displayName || 'Host'}</p>
                <p className="text-[#a855f7] text-xs font-bold uppercase">Host</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-green-400" title="Ready" />
            </div>

            {/* Guest slot */}
            {guest ? (
              <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-4 flex items-center gap-4">
                <AvatarBubble
                  avatar={guest.avatar || 'avatar-1'}
                  photoUrl={guest.photoUrl}
                  name={guest.displayName || 'Guest'}
                />
                <div className="flex-1">
                  <p className="text-white font-bold">{guest.displayName || 'Guest'}</p>
                  <p className="text-gray-400 text-xs">Wants to play</p>
                </div>
                {isHost && (
                  <button
                    onClick={handleKick}
                    className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#2a2a2a] border border-dashed border-[#4a4a4a] rounded-xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#4a4a4a] flex items-center justify-center text-gray-600 text-2xl">
                  ?
                </div>
                <p className="text-gray-500 italic">Waiting for opponent...</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isHost ? (
            <div className="space-y-3">
              <button
                onClick={handleStart}
                disabled={!guest || starting}
                className="w-full py-4 bg-[#6b1a8b] text-white font-black text-lg rounded-xl uppercase tracking-wider hover:bg-[#8b2aab] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {starting ? 'Starting...' : guest ? 'Start Game →' : 'Waiting for Opponent...'}
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
              >
                Cancel Lobby
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 text-gray-400">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm">Waiting for host to start...</span>
                </div>
              </div>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
              >
                Leave Lobby
              </button>
            </div>
          )}
        </div>
        </div>
      </PageWrapper>
    </div>
  );
}
