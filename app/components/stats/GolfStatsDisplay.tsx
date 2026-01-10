'use client';

import { useEffect, useState } from 'react';
import { GolfPlayerStats } from '@/app/types/stats';
import { loadGolfMatches, calculateGolfStats } from '@/app/lib/golfStats';
import StatsSummaryCards from './StatsSummaryCards';
import HoleAverageChart from './HoleAverageChart';
import ScoreProbabilityHeatmap from './ScoreProbabilityHeatmap';

interface GolfStatsDisplayProps {
  playerFilter: string; // 'all' or playerId
  courseFilter: string; // 'all' or course name
  playModeFilter: string; // 'all', 'practice', 'casual', or 'league'
}

export default function GolfStatsDisplay({ playerFilter, courseFilter, playModeFilter }: GolfStatsDisplayProps) {
  const [stats, setStats] = useState<GolfPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Load and calculate stats
    const matches = loadGolfMatches();

    const filters = {
      playerId: playerFilter !== 'all' ? playerFilter : undefined,
      courseName: courseFilter !== 'all' ? courseFilter : undefined,
      playMode: playModeFilter !== 'all' ? playModeFilter : undefined,
    };

    const calculatedStats = calculateGolfStats(matches, filters);
    setStats(calculatedStats);
    setLoading(false);
  }, [playerFilter, courseFilter, playModeFilter]);

  if (loading) {
    return (
      <div className="text-white text-center py-12">
        <div className="text-2xl font-bold">Loading stats...</div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="bg-[#333333] rounded-lg p-12 text-center">
        <div className="text-white text-2xl font-bold mb-4">No Golf Stats Available</div>
        <div className="text-gray-400 text-lg">
          Play some golf games to see your statistics here!
        </div>
      </div>
    );
  }

  // If filtering by a specific player, show detailed stats for that player
  if (playerFilter !== 'all' && stats.length === 1) {
    const playerStats = stats[0];

    return (
      <div>
        {/* Player name header */}
        <div className="mb-6">
          <h2 className="text-white text-3xl font-bold text-center">
            {playerStats.playerName}
          </h2>
        </div>

        {/* Summary cards */}
        <StatsSummaryCards stats={playerStats} />

        {/* Hole averages */}
        <HoleAverageChart stats={playerStats} />

        {/* Score probability heatmap */}
        <ScoreProbabilityHeatmap stats={playerStats} />

        {/* Additional stats */}
        <div className="bg-[#333333] rounded-lg p-6 mb-8">
          <h3 className="text-white text-xl font-bold mb-4">ADDITIONAL STATS</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Tie Breaker Wins</div>
              <div className="text-white text-2xl font-bold">{playerStats.tieBreakerWins}</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Win Rate</div>
              <div className="text-white text-2xl font-bold">{playerStats.winRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Course-specific stats if available */}
        {playerStats.courseStats && Object.keys(playerStats.courseStats).length > 0 && (
          <div className="bg-[#333333] rounded-lg p-6 mb-8">
            <h3 className="text-white text-xl font-bold mb-4">COURSE BREAKDOWN</h3>
            <div className="space-y-3">
              {Object.entries(playerStats.courseStats).map(([courseName, courseData]) => (
                <div key={courseName} className="bg-[#1a1a1a] rounded-lg p-4">
                  <div className="text-white font-bold mb-2">{courseName}</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Games</div>
                      <div className="text-white font-bold">{courseData.gamesPlayed}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Avg Score</div>
                      <div className="text-white font-bold">{courseData.averageScore.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Best</div>
                      <div className="text-white font-bold">{courseData.bestScore}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show comparison view for multiple players or "all"
  return (
    <div>
      <h2 className="text-white text-2xl font-bold mb-6 text-center">PLAYER COMPARISON</h2>

      <div className="bg-[#333333] rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#666666]">
                <th className="text-left text-white font-bold p-3">Player</th>
                <th className="text-center text-white font-bold p-3">Games</th>
                <th className="text-center text-white font-bold p-3">Wins</th>
                <th className="text-center text-white font-bold p-3">Win %</th>
                <th className="text-center text-white font-bold p-3">Avg Score</th>
                <th className="text-center text-white font-bold p-3">Best</th>
                <th className="text-center text-white font-bold p-3">Worst</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(playerStats => (
                <tr
                  key={playerStats.playerId}
                  className="border-b border-[#666666] hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="text-white font-bold p-3">{playerStats.playerName}</td>
                  <td className="text-white text-center p-3">{playerStats.gamesPlayed}</td>
                  <td className="text-white text-center p-3">{playerStats.wins}</td>
                  <td className="text-white text-center p-3">{playerStats.winRate.toFixed(1)}%</td>
                  <td className="text-white text-center p-3">{playerStats.averageScore.toFixed(1)}</td>
                  <td className="text-[#90EE90] text-center p-3 font-bold">{playerStats.bestScore}</td>
                  <td className="text-[#FF6B6B] text-center p-3">{playerStats.worstScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
