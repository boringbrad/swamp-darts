/**
 * Golf Statistics Calculation Engine
 * Calculates player statistics from saved golf matches
 */

import { GolfMatch, GolfPlayerStats } from '../types/stats';

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
export function calculateGolfStats(
  matches: GolfMatch[],
  filters?: {
    playerId?: string;
    courseName?: string;
    playMode?: string;
  }
): GolfPlayerStats[] {
  // Apply filters
  let filteredMatches = matches;

  if (filters?.courseName && filters.courseName !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.courseName === filters.courseName);
  }

  if (filters?.playMode && filters.playMode !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.playMode === filters.playMode);
  }

  // Group matches by player
  const playerMatchMap = new Map<string, { name: string; matches: GolfMatch[] }>();

  filteredMatches.forEach(match => {
    match.players.forEach(player => {
      // Apply player filter
      if (filters?.playerId && filters.playerId !== 'all' && player.playerId !== filters.playerId) {
        return;
      }

      if (!playerMatchMap.has(player.playerId)) {
        playerMatchMap.set(player.playerId, {
          name: player.playerName,
          matches: []
        });
      }
      playerMatchMap.get(player.playerId)!.matches.push(match);
    });
  });

  // Calculate stats for each player
  const playerStats: GolfPlayerStats[] = [];

  playerMatchMap.forEach((data, playerId) => {
    const stats = calculatePlayerStats(playerId, data.name, data.matches);
    playerStats.push(stats);
  });

  return playerStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

/**
 * Calculate statistics for a single player
 */
function calculatePlayerStats(
  playerId: string,
  playerName: string,
  matches: GolfMatch[]
): GolfPlayerStats {
  const gamesPlayed = matches.length;
  const wins = matches.filter(m => m.winnerId === playerId).length;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

  // Calculate score statistics
  const allScores: number[] = [];
  const tieBreakerWins = matches.filter(
    m => m.winnerId === playerId && m.wonByTieBreaker
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
    const playerData = match.players.find(p => p.playerId === playerId);
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
    if (match.winnerId === playerId) {
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
export function getCourseRecord(courseName: string): string {
  const matches = loadGolfMatches();

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
