'use client';

import { GolfMatch } from '@/app/types/stats';

interface ScoresOverGamesChartProps {
  matches: GolfMatch[];
  playerId: string;
  userId?: string;
  playerName?: string;
}

export default function ScoresOverGamesChart({ matches, playerId, userId, playerName }: ScoresOverGamesChartProps) {
  if (matches.length === 0) {
    return (
      <div className="bg-[#333333] rounded-lg p-6 mb-8">
        <h2 className="text-white text-2xl font-bold mb-6">SCORES OVER TIME</h2>
        <div className="text-gray-400 text-center py-8">
          No games played yet
        </div>
      </div>
    );
  }

  // Extract player scores from matches
  // Note: matches come in descending order (newest first), so we reverse to show chronological progression
  const scores = matches
    .map(match => {
      let player;

      // Try userId first (most reliable for admin stats)
      if (userId) {
        player = match.players.find(p => (p as any).userId === userId);
      }

      // Try playerId if not found by userId
      if (!player) {
        player = match.players.find(p => p.playerId === playerId);
      }

      // Try playerName if not found by playerId
      if (!player && playerName) {
        player = match.players.find(p => p.playerName.toLowerCase() === playerName.toLowerCase());
      }

      // If still not found and there's only one player, use that player
      if (!player && match.players.length === 1) {
        player = match.players[0];
      }

      return player?.totalScore;
    })
    .filter((score): score is number => score !== undefined && score !== null && score > 0) // Filter out invalid scores
    .reverse(); // Reverse to show oldest → newest (left to right)

  // If no valid scores found, show empty state
  if (scores.length === 0) {
    return (
      <div className="bg-[#333333] rounded-lg p-6 mb-8">
        <h2 className="text-white text-2xl font-bold mb-6">SCORES OVER TIME</h2>
        <div className="text-gray-400 text-center py-8">
          No valid scores found
        </div>
      </div>
    );
  }

  // Calculate average
  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Find min/max for scaling
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;
  const padding = Math.max(range * 0.1, 5); // 10% padding or 5, whichever is larger

  const chartMin = Math.max(0, minScore - padding);
  const chartMax = maxScore + padding;
  const chartRange = chartMax - chartMin;

  return (
    <div className="bg-[#333333] rounded-lg p-6 mb-8">
      <h2 className="text-white text-2xl font-bold mb-6">SCORES OVER TIME</h2>

      {/* Chart */}
      <div className="relative h-64 mb-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-gray-400 text-xs">
          {Array.from({ length: 6 }, (_, i) => {
            const value = Math.round(chartMax - (i * chartRange / 5));
            return (
              <div key={i} className="text-right pr-2">{value}</div>
            );
          })}
        </div>

        {/* Chart area */}
        <div className="absolute left-12 right-0 top-0 bottom-0">
          <svg className="w-full h-full" viewBox="0 0 1000 260" preserveAspectRatio="none">
            {/* Grid lines */}
            {Array.from({ length: 6 }, (_, i) => (
              <line
                key={i}
                x1="0"
                y1={(i * 260) / 5}
                x2="1000"
                y2={(i * 260) / 5}
                stroke="#444444"
                strokeWidth="1"
              />
            ))}

            {/* Average line (yellow dashed) */}
            <line
              x1="0"
              y1={260 - (((average - chartMin) / chartRange) * 260)}
              x2="1000"
              y2={260 - (((average - chartMin) / chartRange) * 260)}
              stroke="#FFD700"
              strokeWidth="2"
              strokeDasharray="10,5"
            />

            {/* Score line (green) */}
            <polyline
              points={scores.map((score, index) => {
                const x = scores.length > 1 ? (index / (scores.length - 1)) * 1000 : 500;
                const y = 260 - (((score - chartMin) / chartRange) * 260);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#90EE90"
              strokeWidth="3"
            />

            {/* Score dots */}
            {scores.map((score, index) => {
              const x = scores.length > 1 ? (index / (scores.length - 1)) * 1000 : 500;
              const y = 260 - (((score - chartMin) / chartRange) * 260);
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#90EE90"
                  stroke="#1a1a1a"
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          {/* X-axis label */}
          <div className="flex justify-between mt-2 text-gray-400 text-xs">
            <span>Game 1</span>
            {scores.length > 1 && <span>Game {scores.length}</span>}
          </div>
        </div>
      </div>

      {/* Legend and Stats */}
      <div className="flex justify-center gap-8 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#90EE90]" />
          <span className="text-white text-sm">Your Scores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-[#FFD700]" />
          <span className="text-white text-sm">
            Average ({average.toFixed(1)})
          </span>
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-gray-400 text-xs mb-1">Best</div>
          <div className="text-[#90EE90] text-xl font-bold">{minScore}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-gray-400 text-xs mb-1">Average</div>
          <div className="text-white text-xl font-bold">{average.toFixed(1)}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-gray-400 text-xs mb-1">Worst</div>
          <div className="text-[#FF6B6B] text-xl font-bold">{maxScore}</div>
        </div>
      </div>
    </div>
  );
}
