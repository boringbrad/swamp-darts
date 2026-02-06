'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';

type Player = {
  name: string;
  score: number;
  dartsThrown: number;
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
      },
    ]);
  };

  const handleScore = (baseValue: number, displayText?: string) => {
    saveToHistory();

    const points = baseValue * multiplier;
    const display = displayText || (multiplier === 1 ? `${baseValue}` : multiplier === 2 ? `D${baseValue}` : `T${baseValue}`);

    const newPlayers = [...players];
    const currentPlayer = newPlayers[currentPlayerIndex];
    const newScore = currentPlayer.score - points;

    if (newScore < 0) {
      // Bust - reset to original score for this turn
      alert('BUST! Score would go below zero.');
      return;
    }

    if (newScore === 0) {
      // Winner!
      currentPlayer.score = 0;
      currentPlayer.dartsThrown += dartCount + 1;
      setPlayers(newPlayers);
      setTimeout(() => {
        alert(`${currentPlayer.name} WINS! 🎉`);
        router.push('/extra/x01');
      }, 100);
      return;
    }

    currentPlayer.score = newScore;
    const newDartCount = dartCount + 1;
    const newTurnDarts = [...currentTurnDarts, { value: points, display }];

    if (newDartCount >= 3) {
      // End of turn
      currentPlayer.dartsThrown += 3;
      setPlayers(newPlayers);
      setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
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
    setHistory(history.slice(0, -1));
    setMultiplier(1);
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
                  <div className="text-gray-300 text-xs sm:text-sm">Darts: {player.dartsThrown + dartCount}</div>
                </div>
              ))}
            </div>
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
                  onClick={() => handleScore(50, 'Bull')}
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
