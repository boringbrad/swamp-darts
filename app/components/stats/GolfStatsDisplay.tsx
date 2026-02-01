'use client';

import { useEffect, useState } from 'react';
import { GolfPlayerStats, GolfMatch } from '@/app/types/stats';
import { loadGolfMatches, calculateGolfStats } from '@/app/lib/golfStats';
import { loadGolfMatchesFromSupabase } from '@/app/lib/supabaseSync';
import { createClient } from '@/app/lib/supabase/client';
import StatsSummaryCards from './StatsSummaryCards';
import HoleAverageChart from './HoleAverageChart';
import ScoreProbabilityHeatmap from './ScoreProbabilityHeatmap';
import LastVsBestGameChart from './LastVsBestGameChart';
import ScoresOverGamesChart from './ScoresOverGamesChart';
import ShotAccuracyPieChart from './ShotAccuracyPieChart';
import DualRangeSlider from './DualRangeSlider';
import GameHistorySection from './GameHistorySection';

const supabase = createClient();

interface GolfStatsDisplayProps {
  playerFilter: string; // 'all' or playerId
  courseFilter?: string; // 'all' or course name
  playModeFilter?: string; // 'all', 'practice', 'casual', or 'league'
  matches?: GolfMatch[]; // Optional pre-loaded matches (for FriendStats/VenueStats)
}

export default function GolfStatsDisplay({ playerFilter, courseFilter = 'all', playModeFilter = 'all', matches: providedMatches }: GolfStatsDisplayProps) {
  const [stats, setStats] = useState<GolfPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameRange, setGameRange] = useState<{ start: number; end: number } | null>(null);
  const [allMatches, setAllMatches] = useState<GolfMatch[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Listen for storage changes (e.g., when players are deleted)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'golfMatches' || e.key === 'localPlayers') {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    // Listen for custom event (for same-tab updates)
    const handleCustomRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('statsRefresh', handleCustomRefresh);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('statsRefresh', handleCustomRefresh);
    };
  }, []);

  useEffect(() => {
    const loadStatsData = async () => {
      setLoading(true);

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      let matches: GolfMatch[] = [];

      // Use provided matches if available (from FriendStats/VenueStats)
      if (providedMatches) {
        console.log('Using provided matches:', providedMatches.length);
        matches = providedMatches;
        if (user) {
          setCurrentUserId(user.id);
        }
      } else if (user) {
        // For logged-in users, query Supabase directly by user_id
        console.log('Loading golf matches from Supabase for user:', user.id);
        setCurrentUserId(user.id); // Store userId for filtering playerMatches
        const { data: supabaseMatches, error } = await supabase
          .from('golf_matches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading golf matches:', error);
        } else {
          // Extract match_data from each row
          matches = (supabaseMatches || []).map(m => m.match_data as GolfMatch);
          console.log('Loaded matches from Supabase:', matches.length);
        }
      } else {
        // Fallback to localStorage for non-logged-in users
        console.log('Loading golf matches from localStorage');
        matches = loadGolfMatches();
      }

      setAllMatches(matches);

      // Initialize game range to all games
      if (gameRange === null && matches.length > 0) {
        setGameRange({ start: 0, end: matches.length - 1 });
      }

      // If filtering by specific player, only pass userId if viewing YOUR OWN stats (not friends)
      // When provided matches from FriendStats/VenueStats, don't pass userId
      const filters = {
        playerId: playerFilter !== 'all' ? playerFilter : undefined,
        courseName: courseFilter !== 'all' ? courseFilter : undefined,
        playMode: playModeFilter !== 'all' ? playModeFilter : undefined,
        gameRange: gameRange || undefined,
        // Only pass userId when NOT using provided matches (i.e., viewing your own stats)
        userId: (user && playerFilter !== 'all' && !providedMatches) ? user.id : undefined,
      };

      const calculatedStats = await calculateGolfStats(matches, filters);
      setStats(calculatedStats);
      setLoading(false);
    };

    loadStatsData();
  }, [playerFilter, courseFilter, playModeFilter, gameRange, refreshTrigger, providedMatches]);

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

    // Get player-specific matches for new charts
    // Match by playerId, userId, OR playerName (for cross-device/legacy stats)
    const playerMatches = allMatches.filter(match =>
      match.players.some(p =>
        p.playerId === playerFilter ||
        (currentUserId && (p as any).userId === currentUserId) ||
        p.playerName.toLowerCase() === playerStats.playerName.toLowerCase()
      )
    );

    console.log('[GolfStatsDisplay] Player matches filtered:', {
      allMatchesCount: allMatches.length,
      playerMatchesCount: playerMatches.length,
      playerFilter,
      currentUserId,
      playerName: playerStats.playerName
    });

    // Get last game (most recent - first in array since sorted descending)
    const lastGame = playerMatches.length > 0 ? playerMatches[0] : null;

    // Get best game (lowest score)
    let bestGame: GolfMatch | null = null;
    if (playerMatches.length > 0) {
      let lowestScore = Infinity;

      for (const match of playerMatches) {
        // Try to find player by playerId, userId, or name
        let playerData = match.players.find(p => p.playerId === playerFilter);
        if (!playerData && currentUserId) {
          playerData = match.players.find(p => (p as any).userId === currentUserId);
        }
        if (!playerData) {
          playerData = match.players.find(p => p.playerName.toLowerCase() === playerStats.playerName.toLowerCase());
        }

        if (playerData && playerData.totalScore < lowestScore) {
          lowestScore = playerData.totalScore;
          bestGame = match;
        }
      }
    }

    return (
      <div>
        {/* Player name header */}
        <div className="mb-6">
          <h2 className="text-white text-3xl font-bold text-center">
            {playerStats.playerName}
          </h2>
        </div>

        {/* Game Range Filter */}
        {allMatches.length > 1 && (
          <div className="bg-[#333333] rounded-lg p-6 mb-8">
            <h3 className="text-white text-xl font-bold mb-4">GAME RANGE FILTER</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <DualRangeSlider
                  min={0}
                  max={allMatches.length - 1}
                  minValue={gameRange?.start || 0}
                  maxValue={gameRange?.end || allMatches.length - 1}
                  onChange={(start, end) => setGameRange({ start, end })}
                />
              </div>
              <button
                onClick={() => setGameRange({ start: 0, end: allMatches.length - 1 })}
                className="px-4 py-2 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors flex-shrink-0"
              >
                Reset
              </button>
            </div>
            <div className="text-gray-400 text-sm mt-6 text-center">
              Showing games {(gameRange?.start || 0) + 1} to {(gameRange?.end || allMatches.length - 1) + 1} of {allMatches.length}
            </div>
          </div>
        )}

        {/* Summary cards */}
        <StatsSummaryCards stats={playerStats} />

        {/* Last vs Best Game */}
        <LastVsBestGameChart lastGame={lastGame} bestGame={bestGame} playerId={playerFilter} userId={currentUserId} />

        {/* Scores Over Games */}
        <ScoresOverGamesChart matches={playerMatches} playerId={playerFilter} userId={currentUserId} playerName={playerStats.playerName} />

        {/* Shot Accuracy Pie Chart */}
        <ShotAccuracyPieChart matches={playerMatches} playerId={playerFilter} userId={currentUserId} />

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

        {/* Game History */}
        <GameHistorySection matches={playerMatches} playerId={playerFilter} userId={currentUserId} />
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
