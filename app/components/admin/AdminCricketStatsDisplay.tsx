'use client';

import { useEffect, useState } from 'react';
import { CricketPlayerStats } from '@/app/types/stats';
import { getUserCricketStats } from '@/app/lib/adminPlayerStats';

interface AdminCricketStatsDisplayProps {
  userId: string;
  playerName: string;
}

export default function AdminCricketStatsDisplay({ userId, playerName }: AdminCricketStatsDisplayProps) {
  const [stats, setStats] = useState<CricketPlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const playerStats = await getUserCricketStats(userId);
      setStats(playerStats);
    } catch (error) {
      console.error('Error loading cricket stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-white py-12">
        <p className="text-2xl font-bold">Loading cricket stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-400 py-12">
        <p className="text-xl">No Cricket stats available</p>
        <p className="text-sm mt-2">This player hasn't played any cricket games yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {/* Player Header */}
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <h2 className="text-2xl font-bold text-white">{playerName}</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Games Played</p>
            <p className="text-white text-3xl font-bold">{stats.gamesPlayed}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Wins</p>
            <p className="text-white text-3xl font-bold">{stats.wins}</p>
            <p className="text-gray-400 text-xs">
              {stats.winRate.toFixed(1)}% Win Rate
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Average MPR</p>
            <p className="text-white text-3xl font-bold">{stats.averageMPR.toFixed(2)}</p>
            <p className="text-gray-400 text-xs">Best: {stats.bestMPR.toFixed(2)}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Accuracy</p>
            <p className="text-white text-3xl font-bold">
              {stats.averageAccuracy.toFixed(1)}%
            </p>
            <p className="text-gray-400 text-xs">
              {stats.totalMarks} / {stats.totalDarts} darts
            </p>
          </div>
        </div>

        {/* Skip Stats */}
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">SKIP STATISTICS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Players Skipped</p>
              <p className="text-white text-2xl font-bold">{stats.totalPlayersSkipped}</p>
              <p className="text-gray-400 text-xs">
                {stats.avgPlayersSkippedPerGame.toFixed(2)} per game
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Times Skipped</p>
              <p className="text-white text-2xl font-bold">{stats.totalTimesSkipped}</p>
              <p className="text-gray-400 text-xs">
                {stats.avgTimesSkippedPerGame.toFixed(2)} per game
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Skip Ratio</p>
              <p className="text-white text-2xl font-bold">
                {stats.totalTimesSkipped > 0
                  ? (stats.totalPlayersSkipped / stats.totalTimesSkipped).toFixed(2)
                  : 'N/A'}
              </p>
              <p className="text-gray-400 text-xs">Given / Received</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Net Skips</p>
              <p
                className={`text-2xl font-bold ${
                  stats.totalPlayersSkipped > stats.totalTimesSkipped
                    ? 'text-green-400'
                    : stats.totalPlayersSkipped < stats.totalTimesSkipped
                    ? 'text-red-400'
                    : 'text-white'
                }`}
              >
                {stats.totalPlayersSkipped > stats.totalTimesSkipped ? '+' : ''}
                {stats.totalPlayersSkipped - stats.totalTimesSkipped}
              </p>
              <p className="text-gray-400 text-xs">Given minus Received</p>
            </div>
          </div>
        </div>

        {/* PIN Stats */}
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">PIN STATISTICS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">PIN Attempts</p>
              <p className="text-white text-2xl font-bold">{stats.totalPinAttempts}</p>
              <p className="text-gray-400 text-xs">Partial hits (1-2)</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">PIN Kickouts</p>
              <p className="text-white text-2xl font-bold">{stats.totalPinKickouts}</p>
              <p className="text-gray-400 text-xs">Reversed opponent</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">PIN Closeouts</p>
              <p className="text-white text-2xl font-bold">{stats.totalPinCloseouts}</p>
              <p className="text-gray-400 text-xs">Winning PIN (3)</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-white text-2xl font-bold">
                {stats.pinSuccessRate.toFixed(1)}%
              </p>
              <p className="text-gray-400 text-xs">
                Closeouts / Total Attempts
              </p>
            </div>
          </div>
        </div>

        {/* KO Stats (if applicable) */}
        {(stats.totalKOPointsGiven > 0 || stats.timesEliminated > 0) && (
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">KO STATISTICS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">KO Points Given</p>
                <p className="text-white text-2xl font-bold">{stats.totalKOPointsGiven}</p>
                <p className="text-gray-400 text-xs">
                  {stats.avgKOPointsPerGame.toFixed(1)} per game
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Eliminations Caused</p>
                <p className="text-white text-2xl font-bold">
                  {stats.totalKOEliminationsCaused}
                </p>
                <p className="text-gray-400 text-xs">Players eliminated</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Times Eliminated</p>
                <p className="text-white text-2xl font-bold">{stats.timesEliminated}</p>
                <p className="text-gray-400 text-xs">Knocked out of games</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">KO Efficiency</p>
                <p className="text-white text-2xl font-bold">
                  {stats.totalKOEliminationsCaused > 0
                    ? (stats.totalKOPointsGiven / stats.totalKOEliminationsCaused).toFixed(1)
                    : 'N/A'}
                </p>
                <p className="text-gray-400 text-xs">Points per elimination</p>
              </div>
            </div>
          </div>
        )}

        {/* Streaks */}
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">STREAKS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Longest Dart Streak</p>
              <p className="text-white text-2xl font-bold">{stats.longestDartStreak}</p>
              <p className="text-gray-400 text-xs">Consecutive scoring darts</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Longest Win Streak</p>
              <p className="text-white text-2xl font-bold">{stats.longestWinStreak}</p>
              <p className="text-gray-400 text-xs">Consecutive wins</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Longest Loss Streak</p>
              <p className="text-white text-2xl font-bold">{stats.longestLossStreak}</p>
              <p className="text-gray-400 text-xs">Consecutive losses</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Current Streak</p>
              <p
                className={`text-2xl font-bold ${
                  stats.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stats.currentStreak.count}
                {stats.currentStreak.type === 'win' ? 'W' : 'L'}
              </p>
              <p className="text-gray-400 text-xs">
                {stats.currentStreak.type === 'win' ? 'Winning' : 'Losing'} streak
              </p>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">EFFICIENCY & ACHIEVEMENTS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Perfect Rounds</p>
              <p className="text-white text-2xl font-bold">{stats.perfectRounds}</p>
              <p className="text-gray-400 text-xs">All 3 darts scored</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Avg Marks/Dart</p>
              <p className="text-white text-2xl font-bold">
                {stats.avgDartsPerMark > 0 ? (1 / stats.avgDartsPerMark).toFixed(2) : '0.00'}
              </p>
              <p className="text-gray-400 text-xs">Higher is better</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Comeback Wins</p>
              <p className="text-white text-2xl font-bold">{stats.comebackWins}</p>
              <p className="text-gray-400 text-xs">Won from behind</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Marks</p>
              <p className="text-white text-2xl font-bold">{stats.totalMarks}</p>
              <p className="text-gray-400 text-xs">All games combined</p>
            </div>
          </div>
        </div>

        {/* Variant Breakdown */}
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">PERFORMANCE BY VARIANT</h3>
          <div className="space-y-3">
            {Object.entries(stats.variantStats)
              .filter(([_, variantStats]) => (variantStats as any).gamesPlayed > 0)
              .map(([variant, variantStats]) => {
                const vStats = variantStats as any;
                const winRate =
                  vStats.gamesPlayed > 0
                    ? (vStats.wins / vStats.gamesPlayed) * 100
                    : 0;

                return (
                  <div key={variant} className="bg-[#2a2a2a] rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-white font-bold capitalize">
                        {variant.replace('-', ' ')}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {vStats.gamesPlayed} games
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-400 text-xs">Wins</p>
                        <p className="text-white font-bold">{vStats.wins}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Win Rate</p>
                        <p className="text-white font-bold">{winRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Avg MPR</p>
                        <p className="text-white font-bold">
                          {vStats.averageMPR.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
