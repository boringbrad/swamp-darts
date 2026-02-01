/**
 * Golf Statistics Calculation Engine
 * Calculates player statistics from saved golf matches
 */

import { GolfMatch, GolfPlayerStats } from '../types/stats';
import { playerStorage } from './playerStorage';
import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Load all golf matches from localStorage
 */
export function loadGolfMatches(): GolfMatch[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem('golfMatches');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading golf matches:', error);
    return [];
  }
}

/**
 * Calculate comprehensive golf statistics for all players or a specific player
 */
export async function calculateGolfStats(
  matches: GolfMatch[],
  filters?: {
    playerId?: string;
    courseName?: string;
    playMode?: string;
    gameRange?: { start: number; end: number }; // Game indices (0-based)
    userId?: string; // User ID for matching player data across devices
  }
): Promise<GolfPlayerStats[]> {
  const currentUserId = filters?.userId;
  // Apply filters
  let filteredMatches = matches;

  // Apply game range filter (slice matches array)
  if (filters?.gameRange) {
    const { start, end } = filters.gameRange;
    filteredMatches = filteredMatches.slice(start, end + 1);
  }

  if (filters?.courseName && filters.courseName !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.courseName === filters.courseName);
  }

  if (filters?.playMode && filters.playMode !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.playMode === filters.playMode);
  }

  // Get the filtered player's name for matching (if filtering by specific player)
  let filteredPlayerName: string | undefined;
  if (filters?.playerId && filters.playerId !== 'all') {
    const player = playerStorage.getPlayer(filters.playerId);
    filteredPlayerName = player?.name;
  }

  // Group matches by player
  const playerMatchMap = new Map<string, { name: string; matches: GolfMatch[] }>();

  console.log('[calculateGolfStats] Processing matches:', {
    totalMatches: filteredMatches.length,
    filters,
    currentUserId,
    filteredPlayerName
  });

  filteredMatches.forEach((match, matchIndex) => {
    console.log(`[calculateGolfStats] Match ${matchIndex + 1}:`, {
      players: match.players.map(p => ({
        playerId: p.playerId,
        userId: (p as any).userId,
        playerName: p.playerName
      }))
    });

    match.players.forEach(player => {
      // Apply player filter - match by playerId, userId, OR playerName (for cross-device/legacy stats)
      if (filters?.playerId && filters.playerId !== 'all') {
        const matchesByPlayerId = player.playerId === filters.playerId;
        const matchesByUserId = currentUserId && (player as any).userId === currentUserId;
        const matchesByName = filteredPlayerName &&
          player.playerName.toLowerCase() === filteredPlayerName.toLowerCase();

        console.log('[calculateGolfStats] Checking player:', {
          playerId: player.playerId,
          userId: (player as any).userId,
          playerName: player.playerName,
          matchesByPlayerId,
          matchesByUserId,
          matchesByName,
          willInclude: matchesByPlayerId || matchesByUserId || matchesByName
        });

        if (!matchesByPlayerId && !matchesByUserId && !matchesByName) {
          return;
        }
      }

      // Use a consistent key - prefer the filter's playerId if it matches the user
      const mapKey = (filters?.playerId && filters.playerId !== 'all') ? filters.playerId : player.playerId;

      console.log('[calculateGolfStats] Adding match to playerMatchMap with key:', mapKey);

      if (!playerMatchMap.has(mapKey)) {
        playerMatchMap.set(mapKey, {
          name: player.playerName,
          matches: []
        });
      }
      playerMatchMap.get(mapKey)!.matches.push(match);

      console.log('[calculateGolfStats] Current match count for player:', playerMatchMap.get(mapKey)!.matches.length);
    });
  });

  console.log('[calculateGolfStats] Final playerMatchMap:',
    Array.from(playerMatchMap.entries()).map(([key, data]) => ({
      key,
      name: data.name,
      matchCount: data.matches.length
    }))
  );

  // Get list of valid player IDs (players that still exist in the system)
  const validPlayerIds = new Set(playerStorage.getAllPlayers().map(p => p.id));

  // Calculate stats for each player
  const playerStats: GolfPlayerStats[] = [];

  playerMatchMap.forEach((data, playerId) => {
    // If filtering by a specific player, always include them (cross-device stats)
    // Otherwise, only include players that still exist in the player list
    if (filters?.playerId || validPlayerIds.has(playerId)) {
      const stats = calculatePlayerStats(playerId, data.name, data.matches, currentUserId);
      playerStats.push(stats);
    }
  });

  return playerStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

/**
 * Calculate statistics for a single player
 */
function calculatePlayerStats(
  playerId: string,
  playerName: string,
  matches: GolfMatch[],
  userId?: string
): GolfPlayerStats {
  const gamesPlayed = matches.length;

  // Helper function to check if a match was won by this player (by playerId or userId)
  const isWinner = (match: GolfMatch) => {
    if (match.winnerId === playerId) return true;
    if (userId) {
      const winnerData = match.players.find(p => p.playerId === match.winnerId);
      return winnerData && (winnerData as any).userId === userId;
    }
    return false;
  };

  const wins = matches.filter(isWinner).length;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

  // Calculate score statistics
  const allScores: number[] = [];
  const tieBreakerWins = matches.filter(
    m => isWinner(m) && m.wonByTieBreaker
  ).length;

  // Initialize hole statistics
  const holeScoresArray: number[][] = Array.from({ length: 18 }, () => []);
  const holeScoreDistribution: { [holeNumber: number]: { [score: number]: number } } = {};

  // Course statistics
  const courseStatsMap = new Map<string, { scores: number[]; }>();

  // Variant statistics
  const variantStatsMap = {
    'stroke-play': { games: 0, wins: 0, scores: [] as number[] },
    'match-play': { games: 0, wins: 0, points: [] as number[] },
    'skins': { games: 0, wins: 0, points: [] as number[] },
  };

  matches.forEach(match => {
    // Try to find player by playerId first, then by userId if available
    let playerData = match.players.find(p => p.playerId === playerId);

    // If not found by playerId and userId is available, try matching by userId
    if (!playerData && userId) {
      playerData = match.players.find(p => (p as any).userId === userId);
    }

    if (!playerData) return;

    // Collect scores
    allScores.push(playerData.totalScore);

    // Collect hole scores
    playerData.holeScores.forEach((score, holeIndex) => {
      if (score !== null) {
        holeScoresArray[holeIndex].push(score);
      }
    });

    // Course stats
    if (!courseStatsMap.has(match.courseName)) {
      courseStatsMap.set(match.courseName, { scores: [] });
    }
    courseStatsMap.get(match.courseName)!.scores.push(playerData.totalScore);

    // Variant stats
    const variant = match.variant;
    variantStatsMap[variant].games++;
    if (isWinner(match)) {
      variantStatsMap[variant].wins++;
    }

    if (variant === 'stroke-play') {
      variantStatsMap[variant].scores.push(playerData.totalScore);
    } else if (variant === 'match-play' && playerData.matchPlayPoints !== undefined) {
      variantStatsMap[variant].points.push(playerData.matchPlayPoints);
    } else if (variant === 'skins' && playerData.skinsPoints !== undefined) {
      variantStatsMap[variant].points.push(playerData.skinsPoints);
    }
  });

  // Calculate averages and distributions
  const averageScore = allScores.length > 0
    ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
    : 0;
  const bestScore = allScores.length > 0 ? Math.min(...allScores) : 0;
  const worstScore = allScores.length > 0 ? Math.max(...allScores) : 0;

  // Calculate hole averages
  const holeAverages = holeScoresArray.map(scores =>
    scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0
  );

  // Calculate hole score distributions (percentage for each score on each hole)
  holeScoresArray.forEach((scores, holeIndex) => {
    if (scores.length === 0) return;

    const distribution: { [score: number]: number } = {};
    const total = scores.length;

    scores.forEach(score => {
      distribution[score] = (distribution[score] || 0) + 1;
    });

    // Convert to percentages
    Object.keys(distribution).forEach(scoreKey => {
      const score = parseInt(scoreKey);
      distribution[score] = (distribution[score] / total) * 100;
    });

    holeScoreDistribution[holeIndex] = distribution;
  });

  // Calculate course stats
  const courseStats: { [courseName: string]: { gamesPlayed: number; averageScore: number; bestScore: number } } = {};
  courseStatsMap.forEach((data, courseName) => {
    courseStats[courseName] = {
      gamesPlayed: data.scores.length,
      averageScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
      bestScore: Math.min(...data.scores),
    };
  });

  return {
    playerId,
    playerName,
    gamesPlayed,
    wins,
    winRate,
    averageScore,
    bestScore,
    worstScore,
    tieBreakerWins,
    holeAverages,
    holeScoreDistribution,
    courseStats,
    variantStats: {
      'stroke-play': {
        gamesPlayed: variantStatsMap['stroke-play'].games,
        wins: variantStatsMap['stroke-play'].wins,
        averageScore: variantStatsMap['stroke-play'].scores.length > 0
          ? variantStatsMap['stroke-play'].scores.reduce((sum, s) => sum + s, 0) / variantStatsMap['stroke-play'].scores.length
          : 0,
      },
      'match-play': {
        gamesPlayed: variantStatsMap['match-play'].games,
        wins: variantStatsMap['match-play'].wins,
        averagePoints: variantStatsMap['match-play'].points.length > 0
          ? variantStatsMap['match-play'].points.reduce((sum, s) => sum + s, 0) / variantStatsMap['match-play'].points.length
          : 0,
      },
      'skins': {
        gamesPlayed: variantStatsMap['skins'].games,
        wins: variantStatsMap['skins'].wins,
        averagePoints: variantStatsMap['skins'].points.length > 0
          ? variantStatsMap['skins'].points.reduce((sum, s) => sum + s, 0) / variantStatsMap['skins'].points.length
          : 0,
      },
    },
  };
}

/**
 * Get all unique course names from matches
 */
export function getUniqueCourseNames(matches: GolfMatch[]): string[] {
  const courseNames = new Set(matches.map(m => m.courseName));
  return Array.from(courseNames).sort();
}

/**
 * Get all unique player IDs and names from matches
 */
export function getUniquePlayers(matches: GolfMatch[]): { id: string; name: string }[] {
  const playerMap = new Map<string, string>();

  matches.forEach(match => {
    match.players.forEach(player => {
      if (!playerMap.has(player.playerId)) {
        playerMap.set(player.playerId, player.playerName);
      }
    });
  });

  return Array.from(playerMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get the course record (best score) for a specific course
 * Returns string like "PLAYER NAME (51)" or "NO RECORD" if no matches
 */
export async function getCourseRecord(courseName: string): Promise<string> {
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  let matches: GolfMatch[] = [];

  if (user) {
    // Load from Supabase for logged-in users
    const { data: supabaseMatches, error } = await supabase
      .from('golf_matches')
      .select('*')
      .eq('user_id', user.id);

    if (!error && supabaseMatches) {
      matches = supabaseMatches.map(m => m.match_data as GolfMatch);
    }
  } else {
    // Fallback to localStorage
    matches = loadGolfMatches();
  }

  // Filter matches for this specific course
  const courseMatches = matches.filter(m => m.courseName === courseName);

  if (courseMatches.length === 0) {
    return 'NO RECORD';
  }

  // Find the best (lowest) score across all matches
  let bestScore = Infinity;
  let bestPlayerName = '';

  courseMatches.forEach(match => {
    match.players.forEach(player => {
      if (player.totalScore < bestScore) {
        bestScore = player.totalScore;
        bestPlayerName = player.playerName;
      }
    });
  });

  return `${bestPlayerName} (${bestScore})`;
}

/**
 * Remove all golf match data for a deleted player
 * Removes matches where the player was the only participant
 * Removes player data from matches with multiple players
 */
export function cleanupPlayerGolfMatches(playerId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const matches = loadGolfMatches();

    // Filter out matches where player participated and remove player data from multi-player matches
    const cleanedMatches = matches
      .map(match => {
        // If this player is in the match, remove their data
        const updatedPlayers = match.players.filter(p => p.playerId !== playerId);

        // If no players remain after filtering, this match will be removed
        if (updatedPlayers.length === 0) {
          return null;
        }

        // If players remain, update the match
        // Also check if the deleted player was the winner - if so, recalculate winner
        let updatedWinnerId = match.winnerId;
        let updatedWonByTieBreaker = match.wonByTieBreaker;

        if (match.winnerId === playerId && updatedPlayers.length > 0) {
          // Find new winner (lowest score)
          const newWinner = updatedPlayers.reduce((best, player) =>
            player.totalScore < best.totalScore ? player : best
          );
          updatedWinnerId = newWinner.playerId;
          updatedWonByTieBreaker = false; // Reset tie breaker flag since winner changed
        }

        return {
          ...match,
          players: updatedPlayers,
          winnerId: updatedWinnerId,
          wonByTieBreaker: updatedWonByTieBreaker,
        };
      })
      .filter((match): match is GolfMatch => match !== null); // Remove null matches

    // Save cleaned matches back to localStorage
    localStorage.setItem('golfMatches', JSON.stringify(cleanedMatches));

    console.log(`Cleaned up golf matches for player ${playerId}. Removed ${matches.length - cleanedMatches.length} matches.`);
  } catch (error) {
    console.error('Error cleaning up golf matches:', error);
  }
}
