'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../contexts/AppContext';
import { useSession } from '../../../hooks/useSession';
import { useSessionParticipants } from '../../../hooks/useSessionParticipants';
import CricketGame from '../../../components/CricketGame';
import GolfGame from '../../../components/GolfGame';
import { OnlineConfig } from '../../../hooks/useOnlineGameState';
import { Player, CricketRules } from '../../../types/game';
import { completeOnlineSession } from '../../../lib/sessions';

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

  const myId = userProfile?.id;
  const handleRematch = () => setRematchKey(k => k + 1);

  const handleExitGame = async () => {
    if (!confirm('Exit game? This will end the session for both players.')) return;
    setExiting(true);
    await completeOnlineSession(sessionId);
    router.push('/');
  };

  useEffect(() => {
    if (sessionLoading || participantsLoading || !session || !myId) return;
    if (activeParticipants.length < 2) return;

    const settings = session.gameSettings;
    if (!settings) return;

    const hostP = activeParticipants.find(p => p.isHost);
    const guestP = activeParticipants.find(p => !p.isHost);
    if (!hostP?.userId || !guestP?.userId) return;

    // For x01: stash onlineConfig in sessionStorage then navigate to the x01 game page
    if (settings.gameType === 'x01') {
      setX01StartingScore(settings.x01StartingScore || 501);
      setX01DoubleIn(settings.x01DoubleIn ?? false);
      setX01DoubleOut(settings.x01DoubleOut ?? true);

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
      setSelectedPlayers('x01', 'default', { players: [hostPlayer, guestPlayer], isTeams: false });

      const onlineConfig: OnlineConfig = {
        sessionId,
        myUserId: myId,
        hostUserId: hostP.userId,
        guestUserId: guestP.userId,
      };
      try {
        sessionStorage.setItem('onlineConfig', JSON.stringify(onlineConfig));
      } catch (_) {}
      router.replace('/extra/x01/game?online=1');
      return;
    }

    // For cricket: seed KO numbers deterministically from session ID
    if (settings.gameType === 'cricket') {
      const koNumbers = getKONumbersForSession(sessionId, [hostP.userId, guestP.userId]);
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
      setSelectedPlayers('cricket', 'singles', {
        players: [hostPlayer, guestPlayer],
        isTeams: false,
        koNumbers,
      });
    }

    setReady(true);
  }, [sessionLoading, participantsLoading, session, activeParticipants, myId]);

  // If session ends, go back to lobby list
  useEffect(() => {
    if (session?.status === 'completed' || session?.status === 'expired') {
      router.push('/online');
    }
  }, [session?.status]);

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
  const hostP = activeParticipants.find(p => p.isHost);
  const guestP = activeParticipants.find(p => !p.isHost);

  if (!hostP?.userId || !guestP?.userId || !myId) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-400">Missing player data</p>
      </div>
    );
  }

  const onlineConfig: OnlineConfig = {
    sessionId,
    myUserId: myId,
    hostUserId: hostP.userId,
    guestUserId: guestP.userId,
  };

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
        {onlineHeader}
        <div className="pt-10">
          <CricketGame
            key={rematchKey}
            variant="singles"
            players={[hostPlayer, guestPlayer]}
            rules={rules}
            onlineConfig={onlineConfig}
            onRematch={handleRematch}
          />
        </div>
      </>
    );
  }

  if (settings.gameType === 'golf') {
    return (
      <>
        {onlineHeader}
        <div className="pt-10">
          <GolfGame
            key={rematchKey}
            variant={settings.variant as any}
            initialPlayers={[hostPlayer, guestPlayer]}
            onlineConfig={onlineConfig}
            onRematch={handleRematch}
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
