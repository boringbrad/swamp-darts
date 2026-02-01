'use client';

import { useEffect, useState } from 'react';
import { GolfPlayerStats, GolfMatch } from '@/app/types/stats';
import { getUserGolfStats } from '@/app/lib/adminPlayerStats';
import { createClient } from '@/app/lib/supabase/client';
import StatsSummaryCards from '../stats/StatsSummaryCards';
import HoleAverageChart from '../stats/HoleAverageChart';
import ScoreProbabilityHeatmap from '../stats/ScoreProbabilityHeatmap';
import LastVsBestGameChart from '../stats/LastVsBestGameChart';
import ScoresOverGamesChart from '../stats/ScoresOverGamesChart';
import ShotAccuracyPieChart from '../stats/ShotAccuracyPieChart';
import GameHistorySection from '../stats/GameHistorySection';

const supabase = createClient();

interface AdminGolfStatsDisplayProps {
  userId: string;
  playerName: string;
}

export default function AdminGolfStatsDisplay({ userId, playerName }: AdminGolfStatsDisplayProps) {
  const [stats, setStats] = useState<GolfPlayerStats | null>(null);
  const [matches, setMatches] = useState<GolfMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      console.log('AdminGolfStatsDisplay: Loading stats for userId:', userId);

      // Get stats
      const playerStats = await getUserGolfStats(userId);
      console.log('AdminGolfStatsDisplay: playerStats:', playerStats);

      if (playerStats) {
        setStats(playerStats);
        setPlayerId(playerStats.playerId);
      }

      // Get matches for charts
      const { data: matchData, error } = await supabase
        .from('golf_matches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      console.log('AdminGolfStatsDisplay: matchData:', matchData, 'error:', error);

      if (error) throw error;
      if (matchData) {
        const golfMatches: GolfMatch[] = matchData.map(m => m.match_data as GolfMatch);
        console.log('AdminGolfStatsDisplay: golfMatches:', golfMatches);
        setMatches(golfMatches);
      }
    } catch (error) {
      console.error('Error loading golf stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-white text-center py-12">
        <div className="text-2xl font-bold">Loading golf stats...</div>
      </div>
    );
  }

  if (!stats || matches.length === 0) {
    return (
      <div className="bg-[#333333] rounded-lg p-12 text-center">
        <div className="text-white text-2xl font-bold mb-4">No Golf Stats Available</div>
        <div className="text-gray-400 text-lg">
          This player hasn't played any golf games yet.
        </div>
      </div>
    );
  }

  // Get last game and best game
  const lastGame = matches.length > 0 ? matches[matches.length - 1] : null;
  const bestGame = matches.length > 0
    ? matches.reduce((best, match) => {
        // Try to find player by userId first, then playerId
        let playerData = match.players.find((p: any) => p.userId === userId);
        if (!playerData) {
          playerData = match.players.find((p: any) => p.playerId === playerId);
        }
        if (!playerData && match.players.length === 1) {
          playerData = match.players[0];
        }

        let bestPlayerData = best.players.find((p: any) => p.userId === userId);
        if (!bestPlayerData) {
          bestPlayerData = best.players.find((p: any) => p.playerId === playerId);
        }
        if (!bestPlayerData && best.players.length === 1) {
          bestPlayerData = best.players[0];
        }

        if (!playerData || !bestPlayerData) return best;
        return playerData.totalScore < bestPlayerData.totalScore ? match : best;
      })
    : null;

  return (
    <div>
      {/* Player name header */}
      <div className="mb-6">
        <h2 className="text-white text-3xl font-bold text-center">
          {playerName}
        </h2>
      </div>

      {/* Summary cards */}
      <StatsSummaryCards stats={stats} />

      {/* Last vs Best Game */}
      <LastVsBestGameChart lastGame={lastGame} bestGame={bestGame} playerId={playerId} userId={userId} />

      {/* Scores Over Games */}
      <ScoresOverGamesChart matches={matches} playerId={playerId} userId={userId} playerName={playerName} />

      {/* Shot Accuracy Pie Chart */}
      <ShotAccuracyPieChart matches={matches} playerId={playerId} userId={userId} />

      {/* Hole averages */}
      <HoleAverageChart stats={stats} />

      {/* Score probability heatmap */}
      <ScoreProbabilityHeatmap stats={stats} />

      {/* Additional stats */}
      <div className="bg-[#333333] rounded-lg p-6 mb-8">
        <h3 className="text-white text-xl font-bold mb-4">ADDITIONAL STATS</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Tie Breaker Wins</div>
            <div className="text-white text-2xl font-bold">{stats.tieBreakerWins}</div>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Win Rate</div>
            <div className="text-white text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Course-specific stats if available */}
      {stats.courseStats && Object.keys(stats.courseStats).length > 0 && (
        <div className="bg-[#333333] rounded-lg p-6 mb-8">
          <h3 className="text-white text-xl font-bold mb-4">COURSE BREAKDOWN</h3>
          <div className="space-y-3">
            {Object.entries(stats.courseStats).map(([courseName, courseData]) => (
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

      {/* Game History */}
      <GameHistorySection matches={matches} playerId={playerId} userId={userId} />
    </div>
  );
}
