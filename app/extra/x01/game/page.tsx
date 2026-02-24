'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';

type Player = {
  name: string;
  score: number;
  dartsThrown: number;
  lastTurnScore: number;
  lastTurnDarts: DartScore[];
  turnStartScore: number;
};

type DartScore = {
  value: number;
  display: string;
};

type HistoryEntry = {
  players: Player[];
  currentPlayerIndex: number;
  dartCount: number;
  currentTurnDarts: DartScore[];
  multiplier: number;
};

const CHECKOUT_PATHS: Record<number, string[]> = {
  // 1-dart finishes
  2: ['D1'], 4: ['D2'], 6: ['D3'], 8: ['D4'], 10: ['D5'],
  12: ['D6'], 14: ['D7'], 16: ['D8'], 18: ['D9'], 20: ['D10'],
  22: ['D11'], 24: ['D12'], 26: ['D13'], 28: ['D14'], 30: ['D15'],
  32: ['D16'], 34: ['D17'], 36: ['D18'], 38: ['D19'], 40: ['D20'],
  50: ['Bull'],
  // 2-dart finishes (3–59)
  3: ['1', 'D1'], 5: ['1', 'D2'], 7: ['3', 'D2'], 9: ['1', 'D4'],
  11: ['3', 'D4'], 13: ['5', 'D4'], 15: ['3', 'D6'], 17: ['1', 'D8'],
  19: ['3', 'D8'], 21: ['1', 'D10'], 23: ['3', 'D10'], 25: ['1', 'D12'],
  27: ['3', 'D12'], 29: ['1', 'D14'], 31: ['3', 'D14'], 33: ['1', 'D16'],
  35: ['3', 'D16'], 37: ['1', 'D18'], 39: ['3', 'D18'],
  41: ['1', 'D20'], 42: ['2', 'D20'], 43: ['3', 'D20'], 44: ['4', 'D20'],
  45: ['5', 'D20'], 46: ['6', 'D20'], 47: ['7', 'D20'], 48: ['8', 'D20'],
  49: ['9', 'D20'], 51: ['11', 'D20'], 52: ['12', 'D20'], 53: ['13', 'D20'],
  54: ['14', 'D20'], 55: ['15', 'D20'], 56: ['16', 'D20'], 57: ['17', 'D20'],
  58: ['18', 'D20'], 59: ['19', 'D20'],
  // 2-dart finishes (60–100)
  60: ['20', 'D20'], 61: ['T15', 'D8'], 62: ['T10', 'D16'], 63: ['T13', 'D12'],
  64: ['T16', 'D8'], 65: ['T19', 'D4'], 66: ['T10', 'D18'], 67: ['T17', 'D8'],
  68: ['T20', 'D4'], 69: ['T15', 'D12'], 70: ['T10', 'D20'], 71: ['T13', 'D16'],
  72: ['T16', 'D12'], 73: ['T19', 'D8'], 74: ['T14', 'D16'], 75: ['T17', 'D12'],
  76: ['T20', 'D8'], 77: ['T19', 'D10'], 78: ['T18', 'D12'], 79: ['T19', 'D11'],
  80: ['T20', 'D10'], 81: ['T19', 'D12'], 82: ['T14', 'D20'], 83: ['T17', 'D16'],
  84: ['T20', 'D12'], 85: ['T15', 'D20'], 86: ['T18', 'D16'], 87: ['T17', 'D18'],
  88: ['T16', 'D20'], 89: ['T19', 'D16'], 90: ['T20', 'D15'], 91: ['T17', 'D20'],
  92: ['T20', 'D16'], 93: ['T19', 'D18'], 94: ['T18', 'D20'], 95: ['T19', 'D19'],
  96: ['T20', 'D18'], 97: ['T19', 'D20'], 98: ['T20', 'D19'], 100: ['T20', 'D20'],
  // 3-dart finishes (99–170)
  99: ['T19', '10', 'D16'],
  101: ['T20', '1', 'D20'], 102: ['T20', '10', 'D16'], 103: ['T20', '3', 'D20'],
  104: ['T18', '18', 'D16'], 105: ['T19', '16', 'D16'], 106: ['T20', '14', 'D16'],
  107: ['T19', '18', 'D16'], 108: ['T20', '16', 'D16'], 109: ['T19', '20', 'D16'],
  110: ['T20', '18', 'D16'], 111: ['T20', '19', 'D16'], 112: ['T20', '12', 'D20'],
  113: ['T20', '13', 'D20'], 114: ['T20', '14', 'D20'], 115: ['T20', '15', 'D20'],
  116: ['T20', '16', 'D20'], 117: ['T20', '17', 'D20'], 118: ['T20', '18', 'D20'],
  119: ['T19', 'T10', 'D16'], 120: ['T20', '20', 'D20'],
  121: ['T17', 'T10', 'D20'], 122: ['T18', 'T20', 'D4'], 123: ['T19', 'T16', 'D9'],
  124: ['T20', 'T16', 'D8'], 125: ['25', 'T20', 'D20'], 126: ['T19', 'T19', 'D6'],
  127: ['T20', 'T17', 'D8'], 128: ['T18', 'T14', 'D16'], 129: ['T19', 'T16', 'D12'],
  130: ['T20', 'T20', 'D5'], 131: ['T20', 'T13', 'D16'], 132: ['T20', 'T16', 'D12'],
  133: ['T20', 'T19', 'D8'], 134: ['T20', 'T14', 'D16'], 135: ['T20', 'T17', 'D12'],
  136: ['T20', 'T20', 'D8'], 137: ['T19', 'T16', 'D16'], 138: ['T20', 'T18', 'D12'],
  139: ['T19', 'T14', 'D20'], 140: ['T20', 'T16', 'D16'], 141: ['T20', 'T19', 'D12'],
  142: ['T20', 'T14', 'D20'], 143: ['T20', 'T17', 'D16'], 144: ['T20', 'T20', 'D12'],
  145: ['T20', 'T15', 'D20'], 146: ['T20', 'T18', 'D16'], 147: ['T20', 'T17', 'D18'],
  148: ['T20', 'T16', 'D20'], 149: ['T20', 'T19', 'D16'], 150: ['T20', 'T18', 'D18'],
  151: ['T20', 'T17', 'D20'], 152: ['T20', 'T20', 'D16'], 153: ['T20', 'T19', 'D18'],
  154: ['T20', 'T18', 'D20'], 155: ['T20', 'T19', 'D19'], 156: ['T20', 'T20', 'D18'],
  157: ['T20', 'T19', 'D20'], 158: ['T20', 'T20', 'D19'],
  160: ['T20', 'T20', 'D20'],
  161: ['T20', 'T17', 'Bull'], 164: ['T20', 'T18', 'Bull'],
  167: ['T20', 'T19', 'Bull'], 170: ['T20', 'T20', 'Bull'],
};

function X01Game() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [startingScore, setStartingScore] = useState(501);
  const [isTeams, setIsTeams] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dartCount, setDartCount] = useState(0);
  const [currentTurnDarts, setCurrentTurnDarts] = useState<DartScore[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  useEffect(() => {
    if (initialized) return;

    const playersParam = searchParams.get('players');
    const startingScoreParam = searchParams.get('startingScore');
    const isTeamsParam = searchParams.get('isTeams');

    if (playersParam && startingScoreParam) {
      const playerNames = JSON.parse(playersParam);
      const score = parseInt(startingScoreParam);
      const teams = isTeamsParam === 'true';

      setStartingScore(score);
      setIsTeams(teams);
      setPlayers(
        playerNames.map((name: string) => ({
          name,
          score,
          dartsThrown: 0,
          lastTurnScore: 0,
          lastTurnDarts: [],
          turnStartScore: score,
        }))
      );
      setInitialized(true);
    }
  }, [searchParams, initialized]);

  const saveToHistory = () => {
    setHistory([
      ...history,
      {
        players: JSON.parse(JSON.stringify(players)),
        currentPlayerIndex,
        dartCount,
        currentTurnDarts: [...currentTurnDarts],
        multiplier,
      },
    ]);
  };

  // Team mode helpers: teams are [0,1] and [2,3], turn order is 0→2→1→3→0
  const TEAM_TURN_ORDER = [0, 2, 1, 3];
  const teammateIndex = (idx: number) => idx % 2 === 0 ? idx + 1 : idx - 1;
  const nextPlayerIdx = () => {
    if (!isTeams) return (currentPlayerIndex + 1) % players.length;
    const pos = TEAM_TURN_ORDER.indexOf(currentPlayerIndex);
    return TEAM_TURN_ORDER[(pos + 1) % 4];
  };

  const handleScore = (baseValue: number, displayText?: string, isDouble?: boolean) => {
    saveToHistory();

    const points = isDouble ? baseValue : baseValue * multiplier;
    const isFinishingDouble = isDouble || multiplier === 2;
    const display = displayText || (multiplier === 1 ? `${baseValue}` : multiplier === 2 ? `D${baseValue}` : `T${baseValue}`);

    const newPlayers = [...players];
    const currentPlayer = newPlayers[currentPlayerIndex];
    const newScore = currentPlayer.score - points;
    const newDartCount = dartCount + 1;
    const newTurnDarts = [...currentTurnDarts, { value: points, display }];
    const next = nextPlayerIdx();

    const endTurnBust = () => {
      currentPlayer.score = currentPlayer.turnStartScore;
      if (isTeams) newPlayers[teammateIndex(currentPlayerIndex)].score = currentPlayer.turnStartScore;
      currentPlayer.dartsThrown += 3;
      currentPlayer.lastTurnScore = 0;
      currentPlayer.lastTurnDarts = newTurnDarts;
      newPlayers[next].turnStartScore = newPlayers[next].score;
      setPlayers(newPlayers);
      setCurrentPlayerIndex(next);
      setDartCount(0);
      setCurrentTurnDarts([]);
      setMultiplier(1);
    };

    // Check for bust conditions
    if (newScore < 0 || newScore === 1) {
      alert(`BUST! ${newScore < 0 ? 'Score would go below zero.' : 'Cannot finish on a score of 1!'}`);
      endTurnBust();
      return;
    }

    if (newScore === 0 && !isFinishingDouble) {
      alert('BUST! Must finish on a DOUBLE!');
      endTurnBust();
      return;
    }

    if (newScore === 0 && isFinishingDouble) {
      // Winner!
      currentPlayer.score = 0;
      if (isTeams) newPlayers[teammateIndex(currentPlayerIndex)].score = 0;
      currentPlayer.dartsThrown += newDartCount;
      currentPlayer.lastTurnScore = currentPlayer.turnStartScore;
      currentPlayer.lastTurnDarts = newTurnDarts;
      setPlayers(newPlayers);
      const winMsg = isTeams
        ? `${currentPlayer.name}'s team WINS! 🎉`
        : `${currentPlayer.name} WINS! 🎉`;
      setTimeout(() => {
        alert(winMsg);
        router.push('/extra/x01');
      }, 100);
      return;
    }

    currentPlayer.score = newScore;
    if (isTeams) newPlayers[teammateIndex(currentPlayerIndex)].score = newScore;

    if (newDartCount >= 3) {
      // End of turn
      currentPlayer.lastTurnScore = currentPlayer.turnStartScore - newScore;
      currentPlayer.lastTurnDarts = newTurnDarts;
      currentPlayer.dartsThrown += 3;
      newPlayers[next].turnStartScore = newPlayers[next].score;
      setPlayers(newPlayers);
      setCurrentPlayerIndex(next);
      setDartCount(0);
      setCurrentTurnDarts([]);
      setMultiplier(1);
    } else {
      // Continue turn
      setPlayers(newPlayers);
      setDartCount(newDartCount);
      setCurrentTurnDarts(newTurnDarts);
      setMultiplier(1);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    setPlayers(lastState.players);
    setCurrentPlayerIndex(lastState.currentPlayerIndex);
    setDartCount(lastState.dartCount);
    setCurrentTurnDarts(lastState.currentTurnDarts);
    setMultiplier(lastState.multiplier);
    setHistory(history.slice(0, -1));
  };

  const orderedNumbers = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  if (!initialized || players.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a5a5a] flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const dartsRemaining = 3 - dartCount;

  return (
    <div className="min-h-screen bg-[#1a5a5a]">
      <Header title={`X01 - ${startingScore}`} />

      <main className="pt-32 px-2 sm:px-4 lg:px-12 xl:px-20 pb-6">
        <div className="w-full max-w-4xl mx-auto lg:max-w-none">
          {/* Top Spacer */}
          <div className="h-16 sm:h-20"></div>

          {/* Score Display */}
          <div className="mb-4 sm:mb-6">
            {isTeams ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {[0, 1].map(teamIdx => {
                  const p0 = players[teamIdx * 2];
                  const p1 = players[teamIdx * 2 + 1];
                  const isActive = currentPlayerIndex === teamIdx * 2 || currentPlayerIndex === teamIdx * 2 + 1;
                  return (
                    <div
                      key={teamIdx}
                      className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
                        isActive ? 'bg-[#0984e3] ring-2 sm:ring-4 ring-[#74b9ff]' : 'bg-[#2d4a4a]'
                      }`}
                    >
                      <div className="text-white text-xs font-bold uppercase tracking-wider mb-1">Team {teamIdx + 1}</div>
                      <div className="text-white text-3xl sm:text-5xl font-bold mb-2">{p0.score}</div>
                      <div className="flex justify-center gap-2 mb-2 flex-wrap">
                        {[p0, p1].map((p, i) => (
                          <span
                            key={i}
                            className={`text-sm font-bold px-2 py-0.5 rounded ${
                              isActive && currentPlayerIndex === teamIdx * 2 + i
                                ? 'bg-[#00d1b2] text-white'
                                : 'text-gray-300'
                            }`}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                      {[p0, p1].some(p => p.lastTurnDarts.length > 0) && (
                        <div className="bg-[#1a3a3a] rounded-lg px-2 py-2 space-y-1">
                          {[p0, p1].filter(p => p.lastTurnDarts.length > 0).map((p, i) => (
                            <div key={i}>
                              <span className={`text-sm font-bold ${p.lastTurnScore > 0 ? 'text-[#00d1b2]' : 'text-[#ff7675]'}`}>
                                {p.name}: {p.lastTurnScore > 0 ? `-${p.lastTurnScore}` : 'BUST'}
                              </span>
                              <span className="text-gray-400 text-xs ml-1">{p.lastTurnDarts.map(d => d.display).join(' · ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-gray-300 text-xs mt-2">
                        Darts: {[p0, p1].reduce((sum, p, i) => sum + p.dartsThrown + (currentPlayerIndex === teamIdx * 2 + i ? dartCount : 0), 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`grid gap-2 sm:gap-4`} style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
                {players.map((player, index) => (
                  <div
                    key={index}
                    className={`p-3 sm:p-4 rounded-lg transition-all text-center ${
                      index === currentPlayerIndex
                        ? 'bg-[#0984e3] ring-2 sm:ring-4 ring-[#74b9ff]'
                        : 'bg-[#2d4a4a]'
                    }`}
                  >
                    <div className="text-white text-base sm:text-xl font-bold mb-1 sm:mb-2 truncate">{player.name}</div>
                    <div className="text-white text-3xl sm:text-5xl font-bold mb-1">{player.score}</div>
                    {player.lastTurnDarts.length > 0 && (
                      <div className="mt-1 mb-1 bg-[#1a3a3a] rounded-lg px-3 py-2">
                        <div className={`text-xl sm:text-2xl font-bold ${player.lastTurnScore > 0 ? 'text-[#00d1b2]' : 'text-[#ff7675]'}`}>
                          {player.lastTurnScore > 0 ? `Last: -${player.lastTurnScore}` : 'BUST'}
                        </div>
                        <div className="text-gray-300 text-sm sm:text-base tracking-wide">
                          {player.lastTurnDarts.map(d => d.display).join('  ·  ')}
                        </div>
                      </div>
                    )}
                    <div className="text-gray-300 text-xs sm:text-sm">Darts: {player.dartsThrown + (index === currentPlayerIndex ? dartCount : 0)}</div>
                    {(() => {
                      const totalPoints = startingScore - player.score;
                      const completedTurns = Math.floor(player.dartsThrown / 3);
                      const avg = completedTurns > 0 ? (totalPoints / completedTurns).toFixed(1) : '0.0';
                      return (
                        <div className="text-gray-400 text-xs sm:text-sm">Avg: {avg} pts/turn</div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Turn Info */}
          <div className="bg-[#2d4a4a] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="text-center mb-3 sm:mb-4">
              <div className="text-white text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
                {currentPlayer.name}'s Turn
              </div>
              <div className="text-[#00d1b2] text-base sm:text-xl">
                Darts Remaining: {dartsRemaining}
              </div>
              {currentPlayer.score > 0 && currentPlayer.score <= 170 && CHECKOUT_PATHS[currentPlayer.score] && (
                <div className="mt-3 bg-[#1a3a3a] rounded-lg px-4 py-3">
                  <div className="text-[#f39c12] text-xs font-bold text-center mb-2 uppercase tracking-wider">
                    Checkout ({CHECKOUT_PATHS[currentPlayer.score].length} dart{CHECKOUT_PATHS[currentPlayer.score].length !== 1 ? 's' : ''})
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {CHECKOUT_PATHS[currentPlayer.score].map((dart, i) => (
                      <span
                        key={i}
                        className={`text-white text-base sm:text-lg font-bold px-3 py-1 rounded ${
                          i === CHECKOUT_PATHS[currentPlayer.score].length - 1
                            ? 'bg-[#00a693]'
                            : 'bg-[#2d6a9f]'
                        }`}
                      >
                        {dart}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Current Turn Darts Display */}
            <div className="flex justify-center gap-2 sm:gap-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bold ${
                    currentTurnDarts[index]
                      ? 'bg-[#0984e3] text-white'
                      : 'bg-[#1a3a3a] text-gray-500 border-2 border-dashed border-gray-600'
                  }`}
                >
                  {currentTurnDarts[index]?.display || '-'}
                </div>
              ))}
            </div>
          </div>

          {/* Score Input Grid */}
          <div className="bg-[#2d4a4a] rounded-lg p-3 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-white text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-center">Score Input</h3>

            {/* Multiplier Buttons */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <button
                onClick={() => setMultiplier(1)}
                className={`py-8 sm:py-10 rounded-lg text-2xl sm:text-3xl font-bold transition-all touch-manipulation ${
                  multiplier === 1
                    ? 'bg-[#00d1b2] text-white ring-4 sm:ring-6 ring-[#00f5d4]'
                    : 'bg-[#444444] text-gray-300 active:bg-[#555555]'
                }`}
              >
                Single (1x)
              </button>
              <button
                onClick={() => setMultiplier(2)}
                className={`py-8 sm:py-10 rounded-lg text-2xl sm:text-3xl font-bold transition-all touch-manipulation ${
                  multiplier === 2
                    ? 'bg-[#0984e3] text-white ring-4 sm:ring-6 ring-[#74b9ff]'
                    : 'bg-[#444444] text-gray-300 active:bg-[#555555]'
                }`}
              >
                Double (2x)
              </button>
              <button
                onClick={() => setMultiplier(3)}
                className={`py-8 sm:py-10 rounded-lg text-2xl sm:text-3xl font-bold transition-all touch-manipulation ${
                  multiplier === 3
                    ? 'bg-[#d63031] text-white ring-4 sm:ring-6 ring-[#ff7675]'
                    : 'bg-[#444444] text-gray-300 active:bg-[#555555]'
                }`}
              >
                Triple (3x)
              </button>
            </div>

            {/* Bulls */}
            <div className="mb-6 sm:mb-8">
              <div className="text-white text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center">Bulls</div>
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <button
                  onClick={() => handleScore(25, '25')}
                  className="bg-[#444444] active:bg-[#555555] text-white text-3xl sm:text-4xl font-bold py-10 sm:py-12 rounded-lg transition-colors touch-manipulation"
                >
                  25
                </button>
                <button
                  onClick={() => handleScore(50, 'Bull', true)}
                  className="bg-[#d63031] active:bg-[#ff7675] text-white text-3xl sm:text-4xl font-bold py-10 sm:py-12 rounded-lg transition-colors touch-manipulation"
                >
                  Bull (50)
                </button>
              </div>
            </div>

            {/* Numbers Grid */}
            <div className="text-white text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center">Numbers (20-1)</div>
            <div className="grid grid-cols-4 gap-3 sm:gap-4">
              {orderedNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => handleScore(num)}
                  className={`py-12 sm:py-16 rounded-lg font-bold text-3xl sm:text-5xl transition-colors touch-manipulation active:scale-95 ${
                    multiplier === 1
                      ? 'bg-[#00d1b2] active:bg-[#00f5d4]'
                      : multiplier === 2
                      ? 'bg-[#0984e3] active:bg-[#74b9ff]'
                      : 'bg-[#d63031] active:bg-[#ff7675]'
                  } text-white`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`py-10 sm:py-12 rounded-lg text-3xl sm:text-4xl font-bold transition-colors touch-manipulation ${
                history.length === 0
                  ? 'bg-[#333333] text-gray-500 cursor-not-allowed'
                  : 'bg-[#f39c12] active:bg-[#f1c40f] text-white'
              }`}
            >
              ⟲ UNDO
            </button>
            <button
              onClick={() => handleScore(0, 'Miss')}
              className="bg-[#666666] active:bg-[#777777] text-white py-10 sm:py-12 rounded-lg text-3xl sm:text-4xl font-bold transition-colors touch-manipulation"
            >
              MISS
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function X01GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a5a5a] flex items-center justify-center">
      <div className="text-white text-2xl">Loading...</div>
    </div>}>
      <X01Game />
    </Suspense>
  );
}
