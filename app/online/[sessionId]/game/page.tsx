'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../contexts/AppContext';
import { useSession } from '../../../hooks/useSession';
import { useSessionParticipants } from '../../../hooks/useSessionParticipants';
import CricketGame from '../../../components/CricketGame';
import GolfGame from '../../../components/GolfGame';
import { OnlineConfig } from '../../../hooks/useOnlineGameState';
import { Player, CricketRules } from '../../../types/game';
import { completeOnlineSession, leaveSession } from '../../../lib/sessions';

/**
 * Generate deterministic KO numbers (1-20) for players using session ID as seed.
 * Both clients independently compute the same numbers without extra DB calls.
 */
function getKONumbersForSession(sessionId: string, playerIds: string[]): Record<string, number> {
  let seed = sessionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const nums = Array.from({ length: 20 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  const koNumbers: Record<string, number> = {};
  playerIds.forEach((id, index) => {
    koNumbers[id] = nums[index];
  });
  return koNumbers;
}

export default function OnlineGamePage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, setSelectedPlayers, setX01StartingScore, setX01DoubleIn, setX01DoubleOut } = useAppContext();
  const sessionId = params.sessionId as string;

  const { session, loading: sessionLoading } = useSession(sessionId);
  const { activeParticipants, loading: participantsLoading } = useSessionParticipants(sessionId);

  const [ready, setReady] = useState(false);
  const [rematchKey, setRematchKey] = useState(0);
  const [exiting, setExiting] = useState(false);
  // Ref mirrors exiting for synchronous reads inside effects — useState updates are
  // batched and may not be visible to an effect that fires in the same tick.
  const exitingRef = useRef(false);

  // Set by game component when the game finishes normally so we don't misread a
  // post-game Return Home click as a mid-game disconnect.
  const gameFinishedRef = useRef(false);

  // Shown when the opponent exits mid-game — detected via useSession status change.
  const [opponentExited, setOpponentExited] = useState(false);

  // Snapshot players at game-start so the game keeps rendering even after one player
  // sets left_at (which drops them from activeParticipants and would otherwise cause
  // the render to show "Missing player data").
  const [gameHostPlayer, setGameHostPlayer] = useState<Player | null>(null);
  const [gameGuestPlayer, setGameGuestPlayer] = useState<Player | null>(null);
  const [gameOnlineConfig, setGameOnlineConfig] = useState<OnlineConfig | null>(null);

  const myId = userProfile?.id;
  const handleRematch = () => setRematchKey(k => k + 1);
  const handleGameEnd = () => { gameFinishedRef.current = true; };

  const handleExitGame = async () => {
    if (!confirm('Exit game? This will end the session for both players.')) return;
    exitingRef.current = true;
    setExiting(true);
    // Await the DB updates before navigating — if we fire-and-forget the browser
    // cancels the pending fetch requests when the page unloads, so the opponent
    // never receives the disconnect signal.
    // Promise.race caps the wait at 2 s so a slow connection doesn't stall the exit.
    await Promise.race([
      Promise.allSettled([
        completeOnlineSession(sessionId),
        leaveSession(sessionId),
      ]),
      new Promise<void>(resolve => setTimeout(resolve, 2000)),
    ]);
    // Hard navigate — bypasses RSC payload / auth middleware so it's instant.
    window.location.href = '/';
  };

  useEffect(() => {
    if (sessionLoading || participantsLoading || !session || !myId) return;
    if (activeParticipants.length < 2) return;

    const settings = session.gameSettings;
    if (!settings) return;

    const hostP = activeParticipants.find(p => p.isHost);
    const guestP = activeParticipants.find(p => !p.isHost);
    if (!hostP?.userId || !guestP?.userId) return;

    const hostPlayer: Player = {
      id: hostP.userId,
      name: hostP.displayName || 'Player 1',
      avatar: hostP.avatar || 'avatar-1',
      photoUrl: hostP.photoUrl,
    };
    const guestPlayer: Player = {
      id: guestP.userId,
      name: guestP.displayName || 'Player 2',
      avatar: guestP.avatar || 'avatar-1',
      photoUrl: guestP.photoUrl,
    };
    const onlineConfig: OnlineConfig = {
      sessionId,
      myUserId: myId,
      hostUserId: hostP.userId,
      guestUserId: guestP.userId,
    };

    // For x01: stash onlineConfig in sessionStorage then navigate to the x01 game page
    if (settings.gameType === 'x01') {
      setX01StartingScore(settings.x01StartingScore || 501);
      setX01DoubleIn(settings.x01DoubleIn ?? false);
      setX01DoubleOut(settings.x01DoubleOut ?? true);
      setSelectedPlayers('x01', 'default', { players: [hostPlayer, guestPlayer], isTeams: false });
      try {
        sessionStorage.setItem('onlineConfig', JSON.stringify(onlineConfig));
      } catch (_) {}
      router.replace('/extra/x01/game?online=1');
      return;
    }

    // For cricket: seed KO numbers deterministically from session ID
    if (settings.gameType === 'cricket') {
      const koNumbers = getKONumbersForSession(sessionId, [hostP.userId, guestP.userId]);
      setSelectedPlayers('cricket', 'singles', {
        players: [hostPlayer, guestPlayer],
        isTeams: false,
        koNumbers,
      });
    }

    // Snapshot player data so a later participant update (opponent leaving) can't
    // wipe out hostP/guestP and break the render.
    setGameHostPlayer(hostPlayer);
    setGameGuestPlayer(guestPlayer);
    setGameOnlineConfig(onlineConfig);
    setReady(true);
  }, [sessionLoading, participantsLoading, session, activeParticipants, myId]);

  // Primary disconnect detection — useSession already has a confirmed-working
  // Realtime subscription on game_sessions. When the opponent exits (calling
  // completeOnlineSession), status becomes 'completed' here reliably.
  //   • Not in game yet (ready=false): redirect to lobby list
  //   • In game, game finished normally: do nothing (gameFinishedRef prevents false alarm)
  //   • In game, mid-game disconnect: show overlay
  useEffect(() => {
    if (exitingRef.current) return;
    if (!(session?.status === 'completed' || session?.status === 'expired')) return;

    if (!ready) {
      // Session ended before game started — boot to lobbies
      window.location.href = '/online';
    } else if (!gameFinishedRef.current) {
      // Session ended mid-game — opponent left
      setOpponentExited(true);
    }
  }, [session?.status, ready]);

  if (sessionLoading || participantsLoading || !ready) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  if (!session?.gameSettings) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white font-bold mb-4">Session not found</p>
          <button onClick={() => router.push('/online')} className="text-[#a855f7] underline">
            Back to Lobbies
          </button>
        </div>
      </div>
    );
  }

  const settings = session.gameSettings;

  // Use the snapshotted player data — never re-derive from activeParticipants here.
  // activeParticipants updates when a player leaves, which would wipe out their
  // data mid-game and show "Missing player data" instead of the game component.
  if (!gameHostPlayer || !gameGuestPlayer || !gameOnlineConfig || !myId) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-400">Missing player data</p>
      </div>
    );
  }

  const onlineConfig = gameOnlineConfig;
  const hostPlayer = gameHostPlayer;
  const guestPlayer = gameGuestPlayer;
  const opponentName = myId === hostPlayer.id ? guestPlayer.name : hostPlayer.name;

  // Full-screen overlay shown when the opponent exits mid-game.
  // Rendered at the page level (above the game) so it's independent of
  // in-game subscription state.
  const disconnectOverlay = opponentExited ? (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center">
      <div className="bg-gray-900 border border-red-500/60 rounded-xl p-8 mx-6 max-w-sm w-full text-center shadow-2xl">
        <div className="text-5xl mb-4">🚪</div>
        <h2 className="text-white text-2xl font-bold mb-2">Match Ended</h2>
        <p className="text-gray-300 text-lg mb-6">
          <span className="text-red-400 font-semibold">{opponentName}</span> has left the match
        </p>
        <button
          onClick={() => {
            leaveSession(sessionId).catch(console.error);
            window.location.href = '/';
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          Return Home
        </button>
      </div>
    </div>
  ) : null;

  // Thin fixed header shown above all game content
  const onlineHeader = (
    <div className="fixed top-0 left-0 right-0 h-10 z-[60] bg-black/80 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-4">
      <span className="text-gray-400 text-xs font-mono">
        Room <span className="text-white font-bold tracking-widest">{session.roomCode}</span>
      </span>
      <button
        onClick={handleExitGame}
        disabled={exiting}
        className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors disabled:opacity-50"
      >
        {exiting ? 'Exiting...' : '✕ Exit Game'}
      </button>
    </div>
  );

  if (settings.gameType === 'cricket') {
    const rules: CricketRules = {
      swampRules: settings.swampRules ?? true,
      noPoint: false,
      point: false,
    };
    return (
      <>
        {disconnectOverlay}
        {onlineHeader}
        <div className="pt-10">
          <CricketGame
            key={rematchKey}
            variant="singles"
            players={[hostPlayer, guestPlayer]}
            rules={rules}
            onlineConfig={onlineConfig}
            onRematch={handleRematch}
            onGameEnd={handleGameEnd}
          />
        </div>
      </>
    );
  }

  if (settings.gameType === 'golf') {
    return (
      <>
        {disconnectOverlay}
        {onlineHeader}
        <div className="pt-10">
          <GolfGame
            key={rematchKey}
            variant={settings.variant as any}
            initialPlayers={[hostPlayer, guestPlayer]}
            onlineConfig={onlineConfig}
            onRematch={handleRematch}
            onGameEnd={handleGameEnd}
          />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <p className="text-red-400">Unknown game type: {settings.gameType}</p>
    </div>
  );
}
