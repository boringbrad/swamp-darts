'use client';

import { GolfMatch } from '@/app/types/stats';

interface ShotAccuracyPieChartProps {
  matches: GolfMatch[];
  playerId: string;
  userId?: string;
}

export default function ShotAccuracyPieChart({ matches, playerId, userId }: ShotAccuracyPieChartProps) {
  if (matches.length === 0) {
    return (
      <div className="bg-[#333333] rounded-lg p-6 mb-8">
        <h2 className="text-white text-2xl font-bold mb-6">SHOT ACCURACY</h2>
        <div className="text-gray-400 text-center py-8">
          No games played yet
        </div>
      </div>
    );
  }

  // Count how many times each score appears across all games
  const scoreCounts: { [score: number]: number } = {};
  let totalShots = 0;

  matches.forEach(match => {
    let player;

    // Try userId first (most reliable for admin stats)
    if (userId) {
      player = match.players.find(p => (p as any).userId === userId);
    }

    // Try playerId if not found by userId
    if (!player) {
      player = match.players.find(p => p.playerId === playerId);
    }

    // If still not found and there's only one player, use that player
    if (!player && match.players.length === 1) {
      player = match.players[0];
    }

    if (player) {
      player.holeScores.forEach(score => {
        if (score !== null) {
          scoreCounts[score] = (scoreCounts[score] || 0) + 1;
          totalShots++;
        }
      });
    }
  });

  // Calculate percentages
  const scoreData = Object.entries(scoreCounts)
    .map(([score, count]) => ({
      score: parseInt(score),
      count,
      percentage: (count / totalShots) * 100
    }))
    .sort((a, b) => a.score - b.score);

  if (scoreData.length === 0) {
    return (
      <div className="bg-[#333333] rounded-lg p-6 mb-8">
        <h2 className="text-white text-2xl font-bold mb-6">SHOT ACCURACY</h2>
        <div className="text-gray-400 text-center py-8">
          No shot data available
        </div>
      </div>
    );
  }

  // Define colors for each score (1-6 most common)
  const scoreColors: { [score: number]: string } = {
    1: '#00FF00', // Bright green (ace)
    2: '#90EE90', // Light green
    3: '#FFD700', // Gold/yellow
    4: '#FFA500', // Orange (par)
    5: '#FF6B6B', // Light red
    6: '#FF0000', // Bright red
    7: '#8B0000', // Dark red
    8: '#4B0000', // Very dark red
  };

  // Calculate pie chart segments
  let currentAngle = -90; // Start at top
  const segments = scoreData.map(({ score, percentage }) => {
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate arc path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = 100 + 90 * Math.cos(startRad);
    const y1 = 100 + 90 * Math.sin(startRad);
    const x2 = 100 + 90 * Math.cos(endRad);
    const y2 = 100 + 90 * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    return {
      score,
      percentage,
      count: scoreCounts[score],
      color: scoreColors[score] || '#666666',
      path: `M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`
    };
  });

  return (
    <div className="bg-[#333333] rounded-lg p-6 mb-8">
      <h2 className="text-white text-2xl font-bold mb-6">SHOT ACCURACY</h2>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Pie Chart */}
        <div className="flex-shrink-0">
          <svg width="240" height="240" viewBox="0 0 200 200">
            {/* Center circle for donut effect */}
            <circle cx="100" cy="100" r="90" fill="none" />

            {/* Pie segments */}
            {segments.map(({ score, path, color }) => (
              <path
                key={score}
                d={path}
                fill={color}
                stroke="#1a1a1a"
                strokeWidth="2"
                className="transition-all hover:opacity-80 cursor-pointer"
              />
            ))}

            {/* Center white circle for donut effect */}
            <circle cx="100" cy="100" r="45" fill="#1a1a1a" />

            {/* Center text */}
            <text
              x="100"
              y="95"
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="bold"
            >
              {totalShots}
            </text>
            <text
              x="100"
              y="110"
              textAnchor="middle"
              fill="#999999"
              fontSize="10"
            >
              Total Shots
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {scoreData.map(({ score, count, percentage }) => (
            <div
              key={score}
              className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg p-3"
            >
              <div
                className="w-6 h-6 rounded flex-shrink-0"
                style={{ backgroundColor: scoreColors[score] || '#666666' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm">
                  Score {score}
                </div>
                <div className="text-gray-400 text-xs">
                  {count} shots ({percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="mt-6 pt-6 border-t border-[#666666]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-gray-400 text-xs mb-1">Most Common</div>
            <div className="text-white text-xl font-bold">
              Score {scoreData[0]?.score}
            </div>
            <div className="text-gray-400 text-xs">
              {scoreData[0]?.percentage.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Aces (1s)</div>
            <div className="text-[#00FF00] text-xl font-bold">
              {scoreCounts[1] || 0}
            </div>
            <div className="text-gray-400 text-xs">
              {((scoreCounts[1] || 0) / totalShots * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Pars (4s)</div>
            <div className="text-[#FFA500] text-xl font-bold">
              {scoreCounts[4] || 0}
            </div>
            <div className="text-gray-400 text-xs">
              {((scoreCounts[4] || 0) / totalShots * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Under Par</div>
            <div className="text-[#90EE90] text-xl font-bold">
              {(scoreCounts[1] || 0) + (scoreCounts[2] || 0) + (scoreCounts[3] || 0)}
            </div>
            <div className="text-gray-400 text-xs">
              {(((scoreCounts[1] || 0) + (scoreCounts[2] || 0) + (scoreCounts[3] || 0)) / totalShots * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
