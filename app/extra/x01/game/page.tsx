'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/app/contexts/AppContext';
import Header from '@/app/components/Header';
import { StoredPlayer } from '@/app/types/storage';
import { useOnlineGameState, OnlineConfig } from '@/app/hooks/useOnlineGameState';
import { completeOnlineSession, leaveSession } from '@/app/lib/sessions';

const PLAYER_COLORS = ['blue', 'red', 'purple', 'green'] as const;
const TEAM_ORDER = [0, 2, 1, 3];
// 5 columns: 20-16, 15-11, 10-6, 5-1
const BOARD_NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const COLOR_BORDERS: Record<string, string> = {
  blue: '#1a7a9d', red: '#9d1a1a', purple: '#6b1a8b', green: '#2d5016',
};

// Checkout guide — standard double-out finishes up to 170
const CHECKOUTS: Record<number, string> = {
  170:'T20 T20 Bull', 167:'T20 T19 Bull', 164:'T20 T18 Bull', 161:'T20 T17 Bull',
  160:'T20 T20 D20',  158:'T20 T20 D19',  157:'T20 T19 D20',  156:'T20 T20 D18',
  155:'T20 T19 D19',  154:'T20 T18 D20',  153:'T20 T19 D18',  152:'T20 T20 D16',
  151:'T20 T17 D20',  150:'T20 T18 D18',  149:'T20 T19 D16',  148:'T20 T20 D14',
  147:'T20 T17 D18',  146:'T20 T18 D16',  145:'T20 T15 D20',  144:'T20 T20 D12',
  143:'T20 T17 D16',  142:'T20 T14 D20',  141:'T20 T19 D12',  140:'T20 T20 D10',
  139:'T20 T13 D20',  138:'T20 T18 D12',  137:'T20 T15 D16',  136:'T20 T20 D8',
  135:'T20 T17 D12',  134:'T20 T14 D16',  133:'T20 T19 D8',   132:'T20 T16 D12',
  131:'T20 T13 D16',  130:'T20 T20 D5',   129:'T19 T16 D12',  128:'T20 T16 D8',
  127:'T20 T17 D8',   126:'T19 T19 D6',   125:'T20 T15 D10',  124:'T20 T16 D8',
  123:'T20 T13 D12',  122:'T18 T18 D7',   121:'T20 T11 D14',  120:'T20 S20 D20',
  119:'T19 T12 D13',  118:'T20 S18 D20',  117:'T20 S17 D20',  116:'T20 S16 D20',
  115:'T19 S18 D20',  114:'T20 S14 D20',  113:'T20 S13 D20',  112:'T20 S12 D20',
  111:'T20 S11 D20',  110:'T20 S10 D20',  109:'T20 S9 D20',   108:'T20 S8 D20',
  107:'T19 S18 D16',  106:'T20 S6 D20',   105:'T20 S5 D20',   104:'T18 S18 D16',
  103:'T20 S3 D20',   102:'T20 S2 D20',   101:'T17 S18 D16',
  100:'T20 D20',       99:'T19 S10 D16',   98:'T20 D19',   97:'T19 D20',
   96:'T20 D18',       95:'T19 D19',        94:'T18 D20',   93:'T19 D18',
   92:'T20 D16',       91:'T17 D20',        90:'T18 D18',   89:'T19 D16',
   88:'T20 D14',       87:'T17 D18',        86:'T18 D16',   85:'T15 D20',
   84:'T20 D12',       83:'T17 D16',        82:'T14 D20',   81:'T19 D12',
   80:'T20 D10',       79:'T13 D20',        78:'T18 D12',   77:'T15 D16',
   76:'T20 D8',        75:'T17 D12',        74:'T14 D16',   73:'T19 D8',
   72:'T16 D12',       71:'T13 D16',        70:'T18 D8',    69:'T15 D12',
   68:'T20 D4',        67:'T17 D8',         66:'T10 D18',   65:'T19 D4',
   64:'T16 D8',        63:'T13 D12',        62:'T10 D16',   61:'T15 D8',
   60:'S20 D20',       59:'S19 D20',        58:'S18 D20',   57:'S17 D20',
   56:'T16 D4',        55:'S15 D20',        54:'S14 D20',   53:'S13 D20',
   52:'S12 D20',       51:'S11 D20',        50:'DBull',     49:'S9 D20',
   48:'S16 D16',       47:'S15 D16',        46:'S14 D16',   45:'S13 D16',
   44:'S12 D16',       43:'S11 D16',        42:'S10 D16',   41:'S9 D16',
   40:'D20',           39:'S7 D16',         38:'D19',       37:'S5 D16',
   36:'D18',           35:'S3 D16',         34:'D17',       33:'S1 D16',
   32:'D16',           31:'S15 D8',         30:'D15',       29:'S13 D8',
   28:'D14',           27:'S11 D8',         26:'D13',       25:'S9 D8',
   24:'D12',           23:'S7 D8',          22:'D11',       21:'S5 D8',
   20:'D10',           19:'S3 D8',          18:'D9',        17:'S1 D8',
   16:'D8',            15:'S7 D4',          14:'D7',        13:'S5 D4',
   12:'D6',            11:'S3 D4',          10:'D5',         9:'S1 D4',
    8:'D4',             7:'S3 D2',           6:'D3',         5:'S1 D2',
    4:'D2',             3:'S1 D1',           2:'D1',
};

// Three number sections stacked: Triple (•••), Double (••), Single (•)
const SECTIONS = [
  { mult: 3 as const, dots: '●●●', bgClass: 'bg-[#2a1a3a] hover:bg-[#3d2a5a]', numClass: 'text-[#c0affe]', dotClass: 'text-[#7c5cbf]' },
  { mult: 2 as const, dots: '●●',  bgClass: 'bg-[#0a2a45] hover:bg-[#18405e]', numClass: 'text-[#74b9ff]', dotClass: 'text-[#2979b5]' },
  { mult: 1 as const, dots: '●',   bgClass: 'bg-[#1a3030] hover:bg-[#263d3d]', numClass: 'text-white',    dotClass: 'text-[#4a6060]' },
];

interface DartThrow {
  number: number;
  multiplier: 1 | 2 | 3;
  score: number;
  wasted: boolean;
  isMiss: boolean;
  isBust: boolean;
}

interface PlayerState {
  player: StoredPlayer;
  score: number;
  hasEnteredGame: boolean;
  turnsPlayed: number;
  totalReduced: number;
  lastTurn?: { darts: DartThrow[]; total: number };
}

interface TurnRecord {
  prevPlayerStates: PlayerState[];
}

function dartLabel(d: DartThrow): string {
  if (d.isMiss) return 'MISS';
  const pre = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : '';
  return `${pre}${d.number === 25 ? 'Bull' : d.number}`;
}

export default function X01GamePage() {
  const router = useRouter();
  const { selectedPlayers: selectedPlayersCtx, x01StartingScore, x01DoubleIn, x01DoubleOut, x01AverageMode } = useAppContext();

  const gameData = selectedPlayersCtx.x01?.default;
  // For online mode, players are passed via sessionStorage because the React context
  // state update from the routing page may not commit before navigation unmounts it.
  const [players] = useState<StoredPlayer[]>(() => {
    if (typeof window === 'undefined') return gameData?.players ?? [];
    try {
      const raw = sessionStorage.getItem('onlineX01Players');
      if (raw) { sessionStorage.removeItem('onlineX01Players'); return JSON.parse(raw); }
    } catch (_) {}
    return gameData?.players ?? [];
  });
  const isTeams = gameData?.isTeams ?? false;

  const [playerStates, setPlayerStates] = useState<PlayerState[]>(() =>
    players.map(p => ({ player: p, score: x01StartingScore, hasEnteredGame: !x01DoubleIn, turnsPlayed: 0, totalReduced: 0 }))
  );
  const [turnStep, setTurnStep] = useState(0);
  const [turnHistory, setTurnHistory] = useState<TurnRecord[]>([]);
  const [currentTurnDarts, setCurrentTurnDarts] = useState<DartThrow[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [bustMsg, setBustMsg] = useState('');
  // Online: defer turn commit until player clicks "Next Player"
  const [pendingCommit, setPendingCommit] = useState<{ darts: DartThrow[]; reduced: number; entering: boolean; winnerIdx?: number } | null>(null);
  const [exiting, setExiting] = useState(false);

  // ── Online 1v1 ─────────────────────────────────────────────────────────────
  // The game router stores onlineConfig in sessionStorage before navigating here
  const [onlineConfig] = useState<OnlineConfig | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('onlineConfig');
      if (raw) { sessionStorage.removeItem('onlineConfig'); return JSON.parse(raw); }
    } catch (_) {}
    return null;
  });
  const { isMyTurn, opponentState, submitTurn, opponentLeft, iWantRematch, opponentWantsRematch, bothWantRematch, requestRematch, resetForRematch, opponentLiveDarts, broadcastLiveDarts } = useOnlineGameState(onlineConfig);
  const inputDisabled = !!onlineConfig && !isMyTurn;

  // After each turn commit, sync state if it's now the opponent's turn
  useEffect(() => {
    if (!onlineConfig || players.length === 0) return;
    const currentId = players[getCurrentIdx(turnStep)]?.id;
    if (!currentId) return;
    if (currentId !== onlineConfig.myUserId) {
      submitTurn({ playerStates, turnStep, winner }, currentId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnStep]);

  // Apply opponent's state when they complete their turn
  useEffect(() => {
    if (!opponentState || !onlineConfig) return;
    setPlayerStates(opponentState.playerStates);
    setTurnStep(opponentState.turnStep);
    if (opponentState.winner !== null) setWinner(opponentState.winner);
  }, [opponentState]);

  // Suppress leaveSession on unmount for intentional exits (rematch, Return Home)
  const suppressLeaveRef = useRef(false);
  useEffect(() => {
    if (!onlineConfig) return;
    return () => {
      if (!suppressLeaveRef.current) leaveSession(onlineConfig.sessionId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net: immediately sync final state when game ends on our turn
  // (in case turnStep effect doesn't fire cleanly due to batching edge cases)
  useEffect(() => {
    if (!onlineConfig || winner === null || !players.length) return;
    const myIdx = players.findIndex(p => p.id === onlineConfig.myUserId);
    if (winner !== myIdx) return; // opponent won, they'll push it
    const opponentId = players.find(p => p.id !== onlineConfig.myUserId)?.id;
    if (!opponentId) return;
    submitTurn({ playerStates, turnStep, winner }, opponentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  // Rematch: when both players agree, reset game state
  useEffect(() => {
    if (!bothWantRematch || !onlineConfig) return;
    const doRematch = async () => {
      suppressLeaveRef.current = true;
      if (onlineConfig.myUserId === onlineConfig.hostUserId) await resetForRematch();
      setPlayerStates(players.map(p => ({ player: p, score: x01StartingScore, hasEnteredGame: !x01DoubleIn, turnsPlayed: 0, totalReduced: 0 })));
      setTurnStep(0); setTurnHistory([]); setCurrentTurnDarts([]); setWinner(null); setBustMsg('');
      suppressLeaveRef.current = false;
    };
    doRematch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothWantRematch]);

  // Broadcast live darts to opponent after each dart thrown
  useEffect(() => {
    if (!onlineConfig || !isMyTurn || currentTurnDarts.length === 0) return;
    broadcastLiveDarts({ currentTurnDarts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurnDarts]);
  const opponentName = onlineConfig
    ? (players.find(p => p.id !== onlineConfig.myUserId)?.name ?? 'Opponent')
    : '';

  const handleExitGame = async () => {
    if (!onlineConfig) return;
    if (!confirm('Exit game? This will end the session for both players.')) return;
    suppressLeaveRef.current = true;
    setExiting(true);
    await Promise.race([
      Promise.allSettled([completeOnlineSession(onlineConfig.sessionId), leaveSession(onlineConfig.sessionId)]),
      new Promise<void>(r => setTimeout(r, 2000)),
    ]);
    window.location.href = '/';
  };
  // ───────────────────────────────────────────────────────────────────────────

  const numPlayers = playerStates.length;

  useEffect(() => {
    if (players.length === 0 && !onlineConfig) router.replace('/extra/x01');
  }, []);

  const getCurrentIdx = (step: number) =>
    isTeams && numPlayers === 4 ? TEAM_ORDER[step % 4] : numPlayers > 0 ? step % numPlayers : 0;

  const currentIdx = getCurrentIdx(turnStep);
  const currentState = playerStates[currentIdx];
  const myPlayerIdx = onlineConfig ? players.findIndex(p => p.id === onlineConfig.myUserId) : -1;

  // Live dart display — show opponent's darts mid-throw when it's their turn
  const isShowingOpponentLive = !isMyTurn && !!onlineConfig && opponentLiveDarts !== null;
  const displayDarts: DartThrow[] = isShowingOpponentLive ? (opponentLiveDarts.currentTurnDarts ?? []) : currentTurnDarts;

  const getTeamForIdx = (idx: number) => (!isTeams ? null : idx < 2 ? 0 : 1);
  const getTeamMateIdx = (idx: number): number | undefined => {
    if (!isTeams) return undefined;
    if (idx === 0) return 1; if (idx === 1) return 0; if (idx === 2) return 3; return 2;
  };
  const getColorForIdx = (idx: number) =>
    isTeams ? (idx < 2 ? 'blue' : 'red') : (PLAYER_COLORS[idx] ?? 'blue');

  const currentTurnTotal = currentTurnDarts.reduce((s, d) => s + d.score, 0);
  const previewRemaining = currentState ? currentState.score - currentTurnTotal : 0;

  // Checkout guide: based on remaining score after darts thrown this turn
  const checkoutScore = currentTurnDarts.length > 0 ? previewRemaining : (currentState?.score ?? 0);
  const dartsLeft = 3 - currentTurnDarts.length;
  const rawHint = winner === null && checkoutScore >= 2 && checkoutScore <= 170
    ? CHECKOUTS[checkoutScore]
    : undefined;
  // Only show hint if achievable with darts remaining in this turn
  const checkoutHint = rawHint && rawHint.split(' ').length <= dartsLeft ? rawHint : undefined;

  const commitTurn = (darts: DartThrow[], scoreReduced: number, enteringGame: boolean) => {
    const prevPlayerStates = playerStates.map(ps => ({ ...ps }));
    setTurnHistory(prev => [...prev, { prevPlayerStates }]);
    const teamMate = getTeamMateIdx(currentIdx);
    setPlayerStates(prev => prev.map((ps, i) => {
      if (i === currentIdx) return {
        ...ps, score: ps.score - scoreReduced,
        hasEnteredGame: enteringGame ? true : ps.hasEnteredGame,
        turnsPlayed: (scoreReduced > 0 || darts.some(d => d.isBust)) ? ps.turnsPlayed + 1 : ps.turnsPlayed,
        totalReduced: ps.totalReduced + scoreReduced,
        lastTurn: { darts, total: scoreReduced },
      };
      if (isTeams && i === teamMate) return { ...ps, score: ps.score - scoreReduced };
      return ps;
    }));
    setCurrentTurnDarts([]);
    setTurnStep(prev => prev + 1);
  };

  const handleDart = (number: number, mult: 1 | 2 | 3, isMiss = false) => {
    if (winner !== null || !currentState || currentTurnDarts.length >= 3) return;
    // No triple bull
    const m: 1 | 2 | 3 = (!isMiss && number === 25 && mult === 3) ? 2 : mult;

    const enteredThisTurn = x01DoubleIn && !currentState.hasEnteredGame &&
      currentTurnDarts.some(d => !d.wasted && !d.isMiss && d.multiplier === 2);
    const isInGame = currentState.hasEnteredGame || enteredThisTurn;
    const wasted = !isMiss && x01DoubleIn && !isInGame && m !== 2;
    const enteredWithThis = !isMiss && x01DoubleIn && !isInGame && m === 2;
    const dartScore = isMiss || wasted ? 0 : number * m;

    const newDarts: DartThrow[] = [
      ...currentTurnDarts,
      { number: isMiss ? 0 : number, multiplier: m, score: dartScore, wasted, isMiss, isBust: false },
    ];
    const runningTotal = newDarts.reduce((s, d) => s + d.score, 0);
    const newRemaining = currentState.score - runningTotal;
    const nowInGame = currentState.hasEnteredGame || enteredThisTurn || enteredWithThis;

    // Helper: for online defer commit behind "Next Player" button; local = immediate
    const finishTurn = (darts: DartThrow[], reduced: number, entering: boolean, winnerIdx?: number) => {
      if (onlineConfig) {
        setPendingCommit({ darts, reduced, entering, winnerIdx });
      } else {
        commitTurn(darts, reduced, entering);
        if (winnerIdx !== undefined) setWinner(winnerIdx);
      }
    };

    if (newRemaining < 0 || (newRemaining === 1 && x01DoubleOut && nowInGame)) {
      const bustDarts = newDarts.map((d, i) => i === newDarts.length - 1 ? { ...d, score: 0, isBust: true } : d);
      setBustMsg('BUST!');
      setTimeout(() => setBustMsg(''), 1400);
      finishTurn(bustDarts, 0, enteredWithThis);
      return;
    }

    if (newRemaining === 0) {
      if (x01DoubleOut && m !== 2 && nowInGame) {
        const bustDarts = newDarts.map((d, i) => i === newDarts.length - 1 ? { ...d, score: 0, isBust: true } : d);
        setBustMsg('BUST — need double to finish!');
        setTimeout(() => setBustMsg(''), 1800);
        finishTurn(bustDarts, 0, enteredWithThis);
        return;
      }
      finishTurn(newDarts, runningTotal, enteredWithThis, currentIdx);
      return;
    }

    if (newDarts.length === 3) { finishTurn(newDarts, runningTotal, enteredWithThis); return; }

    setCurrentTurnDarts(newDarts);
  };

  const handleUndo = () => {
    // In online mode, undo is limited to the current turn only
    if (pendingCommit) { setPendingCommit(null); setBustMsg(''); return; }
    if (currentTurnDarts.length > 0) { setCurrentTurnDarts(prev => prev.slice(0, -1)); return; }
    if (turnHistory.length === 0) return;
    if (onlineConfig) return; // no cross-turn undo in online
    // Grab the darts from the just-completed turn (minus the last one) before restoring state
    const prevPlayerIdx = getCurrentIdx(turnStep - 1);
    const committedDarts = playerStates[prevPlayerIdx]?.lastTurn?.darts ?? [];
    const last = turnHistory[turnHistory.length - 1];
    setTurnHistory(prev => prev.slice(0, -1));
    setPlayerStates(last.prevPlayerStates);
    setTurnStep(prev => prev - 1);
    setCurrentTurnDarts(committedDarts.slice(0, -1));
    setWinner(null);
    setBustMsg('');
  };

  useEffect(() => {
    if (winner === null) return;
    const ws = playerStates[winner];
    const matchData = {
      matchId: `x01_${Date.now()}`, date: new Date().toISOString(),
      startingScore: x01StartingScore, doubleIn: x01DoubleIn, doubleOut: x01DoubleOut, isTeams,
      winnerId: ws.player.id, winnerName: ws.player.name,
      players: playerStates.map(ps => ({
        id: ps.player.id, name: ps.player.name, avatar: ps.player.avatar,
        turnsPlayed: ps.turnsPlayed, totalReduced: ps.totalReduced,
        average: ps.turnsPlayed > 0 ? Math.round((ps.totalReduced / ps.turnsPlayed) * 10) / 10 : 0,
        won: playerStates.indexOf(ps) === winner,
      })),
    };
    try {
      const ex = JSON.parse(localStorage.getItem('x01Matches') || '[]');
      ex.push(matchData);
      localStorage.setItem('x01Matches', JSON.stringify(ex));
    } catch (e) { console.error(e); }
    (async () => {
      const { syncX01Match } = await import('@/app/lib/supabaseSync');
      await syncX01Match(matchData.matchId, matchData);
    })();
  }, [winner]);

  const handlePlayAgain = () => {
    setPlayerStates(players.map(p => ({ player: p, score: x01StartingScore, hasEnteredGame: !x01DoubleIn, turnsPlayed: 0, totalReduced: 0 })));
    setTurnStep(0); setTurnHistory([]); setCurrentTurnDarts([]); setWinner(null); setBustMsg('');
  };

  if (players.length === 0) return null;

  const winnerState = winner !== null ? playerStates[winner] : null;
  const winnerTeam = winner !== null ? getTeamForIdx(winner) : null;

  return (
    <div className="h-screen bg-[#1a2a2a] flex flex-col overflow-hidden">
      {/* Online header — room code + exit (replaces app Header for online) */}
      {onlineConfig ? (
        <div className="fixed top-0 left-0 right-0 h-10 z-[60] bg-black/80 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-4">
          <span className="text-gray-400 text-xs font-mono">
            Room <span className="text-white font-bold tracking-widest">{onlineConfig.roomCode ?? onlineConfig.sessionId.slice(0, 6).toUpperCase()}</span>
          </span>
          <button
            onClick={handleExitGame}
            disabled={exiting}
            className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {exiting ? 'Exiting…' : '✕ Exit Game'}
          </button>
        </div>
      ) : (
        <Header title={`X01 — ${x01StartingScore}`} showBackButton={winner === null} />
      )}

      {/* Opponent left — full-screen overlay */}
      {opponentLeft && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center">
          <div className="bg-gray-900 border border-red-500/60 rounded-xl p-8 mx-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">🚪</div>
            <h2 className="text-white text-2xl font-bold mb-2">Match Ended</h2>
            <p className="text-gray-300 text-lg mb-6">
              <span className="text-red-400 font-semibold">{opponentName}</span> has left the match
            </p>
            <button
              onClick={async () => {
                suppressLeaveRef.current = true;
                await Promise.race([
                  Promise.allSettled([completeOnlineSession(onlineConfig!.sessionId), leaveSession(onlineConfig!.sessionId)]),
                  new Promise<void>(r => setTimeout(r, 2000)),
                ]);
                window.location.href = '/';
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
            >
              Return Home
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden" style={{ paddingTop: onlineConfig ? '40px' : '64px' }}>

        {/* ── Top 28%: scores + dart slots ── */}
        <div className="shrink-0 px-2 pt-2 pb-1 flex flex-col gap-1.5 overflow-hidden" style={{ height: '28%' }}>

          {/* Score Panels — fill available height */}
          {isTeams ? (
            /* Team mode: 2 shared panels */
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-1.5">
              {[0, 1].map(teamIdx => {
                const teamIdxList = playerStates.map((_, i) => i).filter(i => getTeamForIdx(i) === teamIdx);
                const teamPs = teamIdxList.map(i => playerStates[i]);
                const isCurrentTeam = teamIdxList.includes(currentIdx) && winner === null;
                const teamColor = teamIdx === 0 ? 'blue' : 'red';
                const teamBorderColor = COLOR_BORDERS[teamColor];
                const teamScore = teamPs[0]?.score ?? 0;
                const displayScore = isCurrentTeam && currentTurnDarts.length > 0 ? previewRemaining : teamScore;
                // Show last turn from the team member who most recently played
                const lastThrownIdx = getCurrentIdx(turnStep - 1);
                const lastTurnPs = teamIdxList.includes(lastThrownIdx)
                  ? playerStates[lastThrownIdx]
                  : teamPs.find(ps => ps.lastTurn);
                const activePlayerNeedsDouble = isCurrentTeam && !playerStates[currentIdx].hasEnteredGame;
                return (
                  <div
                    key={teamIdx}
                    className={`rounded-lg px-2 py-1 border-2 transition-all flex flex-col items-center justify-center text-center gap-0.5 overflow-hidden ${isCurrentTeam ? 'border-[#00d1b2] bg-[#1a3a3a]' : 'border-[#333] bg-[#2a2a2a]'}`}
                  >
                    <span className="font-bold leading-none" style={{ fontSize: 'clamp(10px, min(2vw, 1.8vh), 15px)', color: teamBorderColor }}>
                      TEAM {teamIdx + 1}
                    </span>
                    <span className="text-gray-300 leading-tight w-full truncate" style={{ fontSize: 'clamp(11px, min(2.5vw, 2vh), 18px)' }}>
                      {teamPs.map(ps => ps.player.name).join(' & ')}
                    </span>
                    <span className={`font-black leading-none ${isCurrentTeam ? 'text-white' : 'text-gray-400'}`} style={{ fontSize: 'clamp(20px, min(10vw, 7.5vh), 80px)' }}>
                      {displayScore}
                    </span>
                    {activePlayerNeedsDouble && <div className="text-yellow-400 font-bold" style={{ fontSize: 'clamp(9px, min(1.8vw, 1.4vh), 13px)' }}>NEEDS DOUBLE</div>}
                    {lastTurnPs?.lastTurn && (
                      <div className="flex items-center gap-1.5 justify-center flex-wrap w-full leading-none">
                        <span className={`font-bold ${lastTurnPs.lastTurn.total > 0 ? 'text-[#00d1b2]' : 'text-red-400'}`} style={{ fontSize: 'clamp(10px, min(2vw, 1.6vh), 14px)' }}>
                          {lastTurnPs.lastTurn.total > 0 ? `+${lastTurnPs.lastTurn.total}` : 'BUST'}
                        </span>
                        <span className="text-gray-500" style={{ fontSize: 'clamp(9px, min(1.8vw, 1.4vh), 12px)' }}>
                          {lastTurnPs.lastTurn.darts.map((d, i) => (
                            <span key={i} className={d.isBust || d.wasted ? 'text-red-700' : ''}>
                              {i > 0 ? '·' : ''}{dartLabel(d)}{d.wasted ? '*' : ''}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const totalTurns = teamPs.reduce((s, p) => s + p.turnsPlayed, 0);
                      const totalReduced = teamPs.reduce((s, p) => s + p.totalReduced, 0);
                      const rawAvg = totalTurns > 0 ? totalReduced / totalTurns : null;
                      const avg = rawAvg !== null ? (x01AverageMode === 'per-dart' ? rawAvg / 3 : rawAvg).toFixed(1) : null;
                      const avgLabel = x01AverageMode === 'per-dart' ? 'dart avg' : 'turn avg';
                      return avg ? (
                        <span className="text-gray-500" style={{ fontSize: 'clamp(9px, min(1.8vw, 1.4vh), 12px)' }}>{avgLabel} {avg}</span>
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Individual mode */
            <div className="flex-1 min-h-0 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${numPlayers}, minmax(0, 1fr))` }}>
              {playerStates.map((ps, idx) => {
                const isCurrent = idx === currentIdx && winner === null;
                const color = getColorForIdx(idx);
                return (
                  <div
                    key={ps.player.id}
                    className={`rounded-lg px-2 py-1 border-2 transition-all flex flex-col items-center justify-center text-center gap-0.5 overflow-hidden ${isCurrent ? 'border-[#00d1b2] bg-[#1a3a3a]' : 'border-[#333] bg-[#2a2a2a]'}`}
                  >
                    <span className="font-bold leading-tight w-full text-center truncate" style={{ fontSize: 'clamp(11px, min(3vw, 2.2vh), 22px)', color: COLOR_BORDERS[color] ?? '#fff' }}>
                      {ps.player.name}
                    </span>
                    <span className={`font-black leading-none ${isCurrent ? 'text-white' : 'text-gray-400'}`} style={{ fontSize: numPlayers <= 2 ? 'clamp(20px, min(10vw, 7.5vh), 80px)' : 'clamp(16px, min(7vw, 5.5vh), 56px)' }}>
                      {isCurrent && currentTurnDarts.length > 0 ? previewRemaining : ps.score}
                    </span>
                    {!ps.hasEnteredGame && <div className="text-yellow-400 font-bold" style={{ fontSize: 'clamp(9px, min(1.8vw, 1.4vh), 13px)' }}>NEEDS DOUBLE</div>}
                    {ps.lastTurn && (
                      <div className="flex items-center gap-1.5 justify-center flex-wrap w-full leading-none">
                        <span className={`font-bold ${ps.lastTurn.total > 0 ? 'text-[#00d1b2]' : 'text-red-400'}`} style={{ fontSize: 'clamp(10px, min(2vw, 1.6vh), 14px)' }}>
                          {ps.lastTurn.total > 0 ? `+${ps.lastTurn.total}` : 'BUST'}
                        </span>
                        <span className="text-gray-500" style={{ fontSize: 'clamp(9px, min(1.8vw, 1.4vh), 12px)' }}>
                          {ps.lastTurn.darts.map((d, i) => (
                            <span key={i} className={d.isBust || d.wasted ? 'text-red-700' : ''}>
                              {i > 0 ? '·' : ''}{dartLabel(d)}{d.wasted ? '*' : ''}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {ps.turnsPlayed > 0 && (
                      <span className="text-gray-500" style={{ fontSize: 'clamp(9px, min(1.8vw, 1.4vh), 12px)' }}>
                        {x01AverageMode === 'per-dart' ? 'dart' : 'turn'} avg {(ps.totalReduced / ps.turnsPlayed / (x01AverageMode === 'per-dart' ? 3 : 1)).toFixed(1)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dart Slots row — shows live opponent darts when it's their turn */}
          {isShowingOpponentLive && (
            <div className="shrink-0 text-center text-xs font-bold text-purple-400 uppercase tracking-wider pb-0.5">
              Opponent throwing…
            </div>
          )}
          <div className="flex items-stretch gap-1 shrink-0 h-24">
            {[0, 1, 2].map(i => {
              const d = displayDarts[i];
              return (
                <div
                  key={i}
                  className={`flex-1 rounded flex flex-col items-center justify-center ${d ? (d.isBust || d.wasted ? 'bg-red-900/30' : isShowingOpponentLive ? 'bg-[#2a1a4a]' : 'bg-[#1a4a4a]') : 'bg-[#1a2a2a]'}`}
                >
                  {d ? (
                    <>
                      <div className={`text-2xl font-bold leading-none ${d.isBust || d.wasted ? 'text-red-400' : isShowingOpponentLive ? 'text-purple-300' : 'text-white'}`}>
                        {dartLabel(d)}{d.wasted ? '*' : ''}
                      </div>
                      <div className={`text-base mt-1 ${d.isBust ? 'text-red-500' : d.wasted ? 'text-gray-600' : isShowingOpponentLive ? 'text-purple-400' : 'text-[#00d1b2]'}`}>
                        {d.isBust ? 'bust' : d.score}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-700 text-2xl">—</div>
                  )}
                </div>
              );
            })}
            <div className="text-right pl-2 shrink-0 min-w-[64px] flex flex-col justify-center">
              {!isShowingOpponentLive && (
                <>
                  <div className="text-white font-bold text-3xl leading-none">{currentTurnTotal > 0 ? currentTurnTotal : ''}</div>
                  {currentTurnTotal > 0 && (
                    <div className={`text-base mt-1 ${previewRemaining < 0 || (previewRemaining === 1 && x01DoubleOut) ? 'text-red-400' : 'text-gray-400'}`}>
                      → {previewRemaining}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Keypad — fills ALL remaining screen space ── */}
        {winner === null && (
          <div className="flex-1 flex flex-col px-2 pb-2 gap-0.5 min-h-0">

            {/* Bust message */}
            {bustMsg && (
              <div className="shrink-0 bg-red-800 text-white text-center py-1 rounded font-bold text-sm">
                {bustMsg}
              </div>
            )}

            {/* Checkout guide */}
            {!bustMsg && checkoutHint && !pendingCommit && (
              <div className="shrink-0 bg-[#1a3a1a] border border-[#2d6a2d] rounded px-3 py-1.5 flex items-center gap-2">
                <span className="text-[#00d1b2] font-bold text-xs uppercase tracking-wider shrink-0">Checkout</span>
                <span className="text-white font-bold" style={{ fontSize: 'clamp(13px, 3vw, 18px)' }}>{checkoutHint}</span>
              </div>
            )}

            {/* Online: Next Player button after turn complete */}
            {onlineConfig && pendingCommit ? (
              <button
                onClick={() => {
                  commitTurn(pendingCommit.darts, pendingCommit.reduced, pendingCommit.entering);
                  if (pendingCommit.winnerIdx !== undefined) setWinner(pendingCommit.winnerIdx);
                  setPendingCommit(null);
                  broadcastLiveDarts(null);
                }}
                className="flex-1 w-full bg-[#6b1a8b] hover:bg-[#8b2aab] text-white font-black text-2xl rounded-xl uppercase tracking-wider transition-colors"
              >
                Next Player →
              </button>
            ) : onlineConfig && !isMyTurn ? (
              /* Online: waiting for opponent — replace keypad */
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="font-bold text-lg">Waiting for opponent…</span>
                </div>
              </div>
            ) : (
              <>
                {/* Single, Double, Triple — each takes equal share of space */}
                {[...SECTIONS].reverse().map(sec => (
                  <div
                    key={sec.mult}
                    className={`flex-1 min-h-0 grid grid-cols-5 gap-0.5`}
                  >
                    {BOARD_NUMBERS.map(n => (
                      <button
                        key={n}
                        onClick={() => handleDart(n, sec.mult)}
                        disabled={inputDisabled}
                        className={`flex flex-col items-center justify-center rounded active:scale-95 transition-transform select-none disabled:opacity-40 ${sec.bgClass}`}
                      >
                        <span className={`font-black leading-none ${sec.numClass}`} style={{ fontSize: 'clamp(13px, 4vw, 24px)' }}>
                          {n}
                        </span>
                        <span className={`leading-none mt-0.5 ${sec.dotClass}`} style={{ fontSize: 'clamp(7px, 1.8vw, 11px)' }}>
                          {sec.dots}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}

                {/* Bottom row: Bull · D-Bull · MISS · UNDO */}
                <div className="flex gap-0.5 shrink-0 h-14">
                  <button
                    onClick={() => handleDart(25, 1)}
                    disabled={inputDisabled}
                    className="flex-1 flex flex-col items-center justify-center bg-[#4a4010] hover:bg-[#5a5018] rounded active:scale-95 transition-all disabled:opacity-40"
                  >
                    <span className="text-yellow-400 font-bold text-sm leading-none">Bull</span>
                    <span className="text-yellow-600 text-xs">25</span>
                  </button>
                  <button
                    onClick={() => handleDart(25, 2)}
                    disabled={inputDisabled}
                    className="flex-1 flex flex-col items-center justify-center bg-[#0a2a45] hover:bg-[#18405e] rounded active:scale-95 transition-all disabled:opacity-40"
                  >
                    <span className="text-[#74b9ff] font-bold text-sm leading-none">D-Bull</span>
                    <span className="text-[#4a7aaf] text-xs">50</span>
                  </button>
                  <button
                    onClick={() => handleDart(0, 1, true)}
                    disabled={inputDisabled}
                    className="flex-1 flex items-center justify-center bg-[#3a2020] hover:bg-[#4a2a2a] rounded active:scale-95 transition-all disabled:opacity-40"
                  >
                    <span className="text-red-400 font-bold text-sm">MISS</span>
                  </button>
                  <button
                    onClick={handleUndo}
                    disabled={pendingCommit === null && turnHistory.length === 0 && currentTurnDarts.length === 0}
                    className="flex-1 flex items-center justify-center bg-[#333] hover:bg-[#444] rounded disabled:opacity-30 active:scale-95 transition-all"
                  >
                    <span className="text-white font-bold text-sm">UNDO</span>
                  </button>
                </div>
              </>
            )}

          </div>
        )}

      </main>

      {/* Winner Overlay */}
      {winnerState && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a3a3a] rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="text-6xl mb-3">🎯</div>
            <div className="text-2xl font-bold mb-1" style={{ color: onlineConfig && winner !== myPlayerIdx ? '#ef4444' : '#00d1b2' }}>
              {onlineConfig && winner !== myPlayerIdx
                ? 'GAME OVER'
                : isTeams ? `TEAM ${(winnerTeam ?? 0) + 1} WINS!` : 'WINNER!'}
            </div>
            <div className="text-white text-3xl font-bold mb-1">{winnerState.player.name} WINS!</div>
            {isTeams && winnerTeam !== null && (
              <div className="text-gray-400 text-sm mb-4">
                {playerStates.filter((_, i) => getTeamForIdx(i) === winnerTeam).map(s => s.player.name).join(' & ')}
              </div>
            )}
            <div className="bg-[#2a4a4a] rounded-lg p-3 mb-6 text-left">
              <div className="text-gray-400 text-xs font-bold uppercase mb-2">Match Averages</div>
              {playerStates.map(ps => (
                <div key={ps.player.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-white">{ps.player.name}</span>
                  <span className="text-[#00d1b2] font-bold">
                    {ps.turnsPlayed > 0 ? Math.round(ps.totalReduced / ps.turnsPlayed) : '—'}
                  </span>
                </div>
              ))}
            </div>
            {onlineConfig ? (
              <div className="flex flex-col gap-3">
                {opponentLeft && <p className="text-red-400 text-sm font-bold">Opponent has returned home</p>}
                {!opponentLeft && opponentWantsRematch && !iWantRematch && (
                  <p className="text-yellow-400 text-sm font-bold animate-pulse">Opponent wants a rematch!</p>
                )}
                {!opponentLeft && iWantRematch && !opponentWantsRematch && (
                  <p className="text-gray-400 text-sm">Waiting for opponent…</p>
                )}
                <button
                  onClick={requestRematch}
                  disabled={iWantRematch || opponentLeft}
                  className={`py-3 bg-[#00d1b2] text-white font-bold rounded-lg transition-colors ${iWantRematch || opponentLeft ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00f5d4]'}`}
                >
                  {iWantRematch ? 'Waiting…' : 'Play Again'}
                </button>
                <button
                  onClick={async () => {
                    suppressLeaveRef.current = true;
                    await Promise.race([
                      Promise.allSettled([completeOnlineSession(onlineConfig.sessionId), leaveSession(onlineConfig.sessionId)]),
                      new Promise<void>(r => setTimeout(r, 2000)),
                    ]);
                    window.location.href = '/';
                  }}
                  className="py-3 bg-[#444] text-white font-bold rounded-lg hover:bg-[#555] transition-colors"
                >
                  Return Home
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => router.push('/extra/x01')} className="flex-1 py-3 bg-[#444] text-white font-bold rounded-lg hover:bg-[#555] transition-colors">
                  PLAYER SELECT
                </button>
                <button onClick={handlePlayAgain} className="flex-1 py-3 bg-[#00d1b2] text-white font-bold rounded-lg hover:bg-[#00f5d4] transition-colors">
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
