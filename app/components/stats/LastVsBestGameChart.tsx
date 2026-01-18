'use client';

import { GolfMatch } from '@/app/types/stats';

interface LastVsBestGameChartProps {
  lastGame: GolfMatch | null;
  bestGame: GolfMatch | null;
  playerId: string;
}

export default function LastVsBestGameChart({ lastGame, bestGame, playerId }: LastVsBestGameChartProps) {
  if (!lastGame || !bestGame) {
    return (
      <div className="bg-[#333333] rounded-lg p-6 mb-8">
        <h2 className="text-white text-2xl font-bold mb-6">LAST GAME VS BEST GAME</h2>
        <div className="text-gray-400 text-center py-8">
          Not enough games played
        </div>
      </div>
    );
  }

  const lastGamePlayer = lastGame.players.find(p => p.playerId === playerId);
  const bestGamePlayer = bestGame.players.find(p => p.playerId === playerId);

  if (!lastGamePlayer || !bestGamePlayer) return null;

  const lastGameScores = lastGamePlayer.holeScores.filter((s): s is number => s !== null);
  const bestGameScores = bestGamePlayer.holeScores.filter((s): s is number => s !== null);

  // Find max score for scaling
  const maxScore = Math.max(
    ...lastGameScores,
    ...bestGameScores,
    6 // Ensure at least 6 for scale
  );

  return (
    <div className="bg-[#333333] rounded-lg p-6 mb-8">
      <h2 className="text-white text-2xl font-bold mb-6">LAST GAME VS BEST GAME</h2>

      {/* Chart */}
      <div className="relative h-64 mb-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-gray-400 text-xs">
          {Array.from({ length: maxScore + 1 }, (_, i) => maxScore - i).map(val => (
            <div key={val} className="text-right pr-2">{val}</div>
          ))}
        </div>

        {/* Chart area */}
        <div className="absolute left-10 right-0 top-0 bottom-0">
          <svg className="w-full h-full" viewBox="0 0 1000 260" preserveAspectRatio="none">
            {/* Grid lines */}
            {Array.from({ length: maxScore + 1 }, (_, i) => (
              <line
                key={i}
                x1="0"
                y1={(i * 260) / maxScore}
                x2="1000"
                y2={(i * 260) / maxScore}
                stroke="#444444"
                strokeWidth="1"
              />
            ))}

            {/* Best game line (blue) */}
            <polyline
              points={bestGameScores.map((score, index) => {
                const x = (index / 17) * 1000;
                const y = 260 - ((score / maxScore) * 260);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#4A90E2"
              strokeWidth="3"
            />

            {/* Best game dots */}
            {bestGameScores.map((score, index) => {
              const x = (index / 17) * 1000;
              const y = 260 - ((score / maxScore) * 260);
              return (
                <circle
                  key={`best-${index}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#4A90E2"
                />
              );
            })}

            {/* Last game line (red) */}
            <polyline
              points={lastGameScores.map((score, index) => {
                const x = (index / 17) * 1000;
                const y = 260 - ((score / maxScore) * 260);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#E24A4A"
              strokeWidth="3"
            />

            {/* Last game dots */}
            {lastGameScores.map((score, index) => {
              const x = (index / 17) * 1000;
              const y = 260 - ((score / maxScore) * 260);
              return (
                <circle
                  key={`last-${index}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#E24A4A"
                />
              );
            })}
          </svg>

          {/* X-axis labels (hole numbers) */}
          <div className="flex justify-between mt-2 text-gray-400 text-xs">
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} className="text-center" style={{ width: '5.5%' }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#E24A4A]" />
          <span className="text-white text-sm">
            Last Game ({lastGamePlayer.totalScore})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#4A90E2]" />
          <span className="text-white text-sm">
            Best Game ({bestGamePlayer.totalScore})
          </span>
        </div>
      </div>
    </div>
  );
}
