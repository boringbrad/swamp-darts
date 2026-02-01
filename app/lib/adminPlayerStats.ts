/**
 * Admin Player Stats Functions
 * Fetch detailed player statistics and match history for admin view
 */

import { createClient } from './supabase/client';
import { CricketPlayerStats, GolfPlayerStats, GolfMatch } from '../types/stats';

const supabase = createClient();

// ============================================================================
// PLAYER LIST
// ============================================================================

export interface PlayerInfo {
  id: string;
  displayName: string;
  email: string;
  totalMatches: number;
  cricketMatches: number;
  golfMatches: number;
  lastActivity: string;
}

export async function getAllPlayers(): Promise<PlayerInfo[]> {
  try {
    console.log('getAllPlayers: Fetching profiles...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, email');
    console.log('getAllPlayers: profiles:', profiles);

    if (profileError) throw profileError;

    const { data: activityData, error: activityError } = await supabase
      .from('user_activity_analytics')
      .select('*');

    if (activityError) throw activityError;

    const activityMap = new Map(activityData?.map(a => [a.user_id, a]) || []);

    return (profiles || []).map(p => {
      const activity = activityMap.get(p.id);
      return {
        id: p.id,
        displayName: p.display_name,
        email: p.email || 'No email',
        totalMatches: (activity?.cricket_match_count || 0) + (activity?.golf_match_count || 0),
        cricketMatches: activity?.cricket_match_count || 0,
        golfMatches: activity?.golf_match_count || 0,
        lastActivity: activity?.last_activity || 'Never',
      };
    }).sort((a, b) => b.totalMatches - a.totalMatches);
  } catch (error) {
    console.error('Error fetching players:', error);
    return [];
  }
}

// ============================================================================
// MATCH HISTORY FOR SPECIFIC USER
// ============================================================================

export interface MatchHistoryItem {
  matchId: string;
  gameType: 'cricket' | 'golf';
  gameMode: string;
  date: string;
  won: boolean;
  score?: number;
  opponentNames: string[];
}

export async function getUserMatchHistory(userId: string): Promise<MatchHistoryItem[]> {
  try {
    // Get cricket matches
    const { data: cricketMatches, error: cricketError } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (cricketError) throw cricketError;

    // Get golf matches
    const { data: golfMatches, error: golfError } = await supabase
      .from('golf_matches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (golfError) throw golfError;

    const history: MatchHistoryItem[] = [];

    // Process cricket matches
    cricketMatches?.forEach(m => {
      const matchData = m.match_data;
      const userPlayer = matchData.players?.find((p: any) => p.userId === userId);
      const won = matchData.winnerId === userPlayer?.playerId;
      const opponents = matchData.players
        ?.filter((p: any) => p.playerId !== userPlayer?.playerId)
        .map((p: any) => p.playerName) || [];

      history.push({
        matchId: m.match_id,
        gameType: 'cricket',
        gameMode: m.game_mode,
        date: m.created_at,
        won,
        opponentNames: opponents,
      });
    });

    // Process golf matches
    golfMatches?.forEach(m => {
      const matchData = m.match_data;
      const userPlayer = matchData.players?.find((p: any) => p.userId === userId);
      const won = matchData.winnerId === userPlayer?.playerId;
      const opponents = matchData.players
        ?.filter((p: any) => p.playerId !== userPlayer?.playerId)
        .map((p: any) => p.playerName) || [];

      history.push({
        matchId: m.match_id,
        gameType: 'golf',
        gameMode: m.game_mode,
        date: m.created_at,
        won,
        score: userPlayer?.totalScore,
        opponentNames: opponents,
      });
    });

    // Sort by date descending
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching match history:', error);
    return [];
  }
}

// ============================================================================
// PERFORMANCE OVER TIME
// ============================================================================

export interface PerformanceDataPoint {
  date: string;
  matchNumber: number;
  metric: number; // MPR for cricket, score for golf
  won: boolean;
}

export async function getCricketPerformanceOverTime(userId: string): Promise<PerformanceDataPoint[]> {
  try {
    const { data: matches, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return matches?.map((m, idx) => {
      const matchData = m.match_data;
      const userPlayer = matchData.players?.find((p: any) => p.userId === userId);

      return {
        date: m.created_at,
        matchNumber: idx + 1,
        metric: userPlayer?.mpr || 0,
        won: matchData.winnerId === userPlayer?.playerId,
      };
    }) || [];
  } catch (error) {
    console.error('Error fetching cricket performance:', error);
    return [];
  }
}

export async function getGolfPerformanceOverTime(userId: string): Promise<PerformanceDataPoint[]> {
  try {
    const { data: matches, error } = await supabase
      .from('golf_matches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return matches?.map((m, idx) => {
      const matchData = m.match_data;
      const userPlayer = matchData.players?.find((p: any) => p.userId === userId);

      return {
        date: m.created_at,
        matchNumber: idx + 1,
        metric: userPlayer?.totalScore || 0,
        won: matchData.winnerId === userPlayer?.playerId,
      };
    }).filter(dp => dp.metric > 0) || []; // Filter out invalid scores
  } catch (error) {
    console.error('Error fetching golf performance:', error);
    return [];
  }
}

// ============================================================================
// COMPREHENSIVE GOLF STATS FROM SUPABASE
// ============================================================================

export async function getUserGolfStats(userId: string): Promise<GolfPlayerStats | null> {
  try {
    console.log('getUserGolfStats: Fetching for userId:', userId);

    const { data: matches, error } = await supabase
      .from('golf_matches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    console.log('getUserGolfStats: matches:', matches, 'error:', error);

    if (error) throw error;
    if (!matches || matches.length === 0) {
      console.log('getUserGolfStats: No matches found');
      return null;
    }

    // Convert Supabase matches to GolfMatch format
    const golfMatches: GolfMatch[] = matches.map(m => m.match_data as GolfMatch);
    console.log('getUserGolfStats: golfMatches:', golfMatches);

    // Find the player in the matches
    const firstMatch = golfMatches[0];
    console.log('getUserGolfStats: firstMatch.players:', firstMatch.players);

    // Try to find player by userId first
    let userPlayer = firstMatch.players.find((p: any) => p.userId === userId);
    console.log('getUserGolfStats: userPlayer by userId:', userPlayer);

    // If not found by userId, get the user's profile and match by name
    if (!userPlayer) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

      console.log('getUserGolfStats: profile:', profile);

      if (profile) {
        // Find player by matching display name
        userPlayer = firstMatch.players.find((p: any) => p.playerName === profile.display_name);
        console.log('getUserGolfStats: userPlayer by name:', userPlayer);
      }

      // If still not found and there's only one player, use that player
      if (!userPlayer && firstMatch.players.length === 1) {
        userPlayer = firstMatch.players[0];
        console.log('getUserGolfStats: Using single player:', userPlayer);
      }
    }

    if (!userPlayer) {
      console.log('getUserGolfStats: User not found in match players');
      return null;
    }

    // Calculate stats for this specific player across all their matches
    const stats = calculateGolfStatsForPlayer(userPlayer.playerId, userPlayer.playerName, golfMatches, userId);
    console.log('getUserGolfStats: calculated stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching user golf stats:', error);
    return null;
  }
}

function calculateGolfStatsForPlayer(
  playerId: string,
  playerName: string,
  matches: GolfMatch[],
  userId: string
): GolfPlayerStats {
  const scores: number[] = [];
  const holeScores: { [hole: number]: number[] } = {};
  const scoreProbability: { [hole: number]: { [score: number]: number } } = {};
  let tieBreakerWins = 0;
  let wins = 0;
  let validGamesCount = 0;

  // Initialize variant stats tracking
  const variantStats = {
    'stroke-play': {
      gamesPlayed: 0,
      wins: 0,
      totalScore: 0,
      averageScore: 0,
    },
    'match-play': {
      gamesPlayed: 0,
      wins: 0,
      totalPoints: 0,
      averagePoints: 0,
    },
    skins: {
      gamesPlayed: 0,
      wins: 0,
      totalPoints: 0,
      averagePoints: 0,
    },
  };

  // Initialize hole tracking
  for (let i = 1; i <= 18; i++) {
    holeScores[i] = [];
    scoreProbability[i] = {};
  }

  matches.forEach(match => {
    // Try to find player by userId first, then by playerId, then by name
    let player = match.players.find((p: any) => p.userId === userId);
    if (!player) {
      player = match.players.find((p: any) => p.playerId === playerId);
    }
    if (!player) {
      player = match.players.find((p: any) => p.playerName === playerName);
    }
    if (!player) return;

    // Only count games where player was found
    validGamesCount++;

    // Check if this player won (match by playerId since winnerId uses playerId)
    const didWin = match.winnerId === player.playerId;
    if (didWin) {
      wins++;
    }

    // Track variant-specific stats
    const variant = match.variant;
    if (variant === 'stroke-play') {
      variantStats['stroke-play'].gamesPlayed++;
      if (didWin) variantStats['stroke-play'].wins++;
      if (player.totalScore && player.totalScore > 0) {
        variantStats['stroke-play'].totalScore += player.totalScore;
      }
    } else if (variant === 'match-play') {
      variantStats['match-play'].gamesPlayed++;
      if (didWin) variantStats['match-play'].wins++;
      if (player.matchPlayPoints !== undefined) {
        variantStats['match-play'].totalPoints += player.matchPlayPoints;
      }
    } else if (variant === 'skins') {
      variantStats.skins.gamesPlayed++;
      if (didWin) variantStats.skins.wins++;
      if (player.skinsPoints !== undefined) {
        variantStats.skins.totalPoints += player.skinsPoints;
      }
    }

    // Only include valid scores (> 0)
    if (player.totalScore && player.totalScore > 0) {
      scores.push(player.totalScore);
    }

    // Track hole-by-hole performance
    player.holeScores?.forEach((score: number | null, index: number) => {
      if (score === null) return; // Skip null scores

      const holeNumber = index + 1; // Convert 0-based index to 1-based hole number
      if (!holeScores[holeNumber]) holeScores[holeNumber] = [];
      holeScores[holeNumber].push(score);

      // Track score probability
      if (!scoreProbability[holeNumber]) scoreProbability[holeNumber] = {};
      if (!scoreProbability[holeNumber][score]) {
        scoreProbability[holeNumber][score] = 0;
      }
      scoreProbability[holeNumber][score]++;
    });

    // Check for tie breaker win
    if (match.wonByTieBreaker && match.winnerId === player.playerId) {
      tieBreakerWins++;
    }
  });

  const gamesPlayed = validGamesCount;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const bestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const worstScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Calculate hole averages as array (18 holes, index 0-17)
  const holeAveragesArray: number[] = [];
  for (let i = 1; i <= 18; i++) {
    const scores = holeScores[i] || [];
    holeAveragesArray.push(scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
  }

  // Calculate score probability percentages for holeScoreDistribution
  const holeScoreDistribution: { [holeNumber: number]: { [score: number]: number } } = {};
  for (let i = 0; i < 18; i++) {
    const holeNum = i + 1;
    if (scoreProbability[holeNum]) {
      const total = Object.values(scoreProbability[holeNum]).reduce((a, b) => a + b, 0);
      holeScoreDistribution[i] = {};
      Object.keys(scoreProbability[holeNum]).forEach(scoreStr => {
        const score = parseInt(scoreStr);
        holeScoreDistribution[i][score] = (scoreProbability[holeNum][score] / total) * 100;
      });
    } else {
      holeScoreDistribution[i] = {};
    }
  }

  // Course-specific stats
  const courseStats: { [courseName: string]: any } = {};
  matches.forEach(match => {
    // Try to find player by userId first, then by playerId, then by name
    let player = match.players.find((p: any) => p.userId === userId);
    if (!player) {
      player = match.players.find((p: any) => p.playerId === playerId);
    }
    if (!player) {
      player = match.players.find((p: any) => p.playerName === playerName);
    }
    if (!player) return;

    // Only count matches with valid scores
    if (!player.totalScore || player.totalScore <= 0) return;

    if (!courseStats[match.courseName]) {
      courseStats[match.courseName] = {
        gamesPlayed: 0,
        totalScore: 0,
        bestScore: Infinity,
      };
    }
    courseStats[match.courseName].gamesPlayed++;
    courseStats[match.courseName].totalScore += player.totalScore;
    courseStats[match.courseName].bestScore = Math.min(
      courseStats[match.courseName].bestScore,
      player.totalScore
    );
  });

  Object.keys(courseStats).forEach(courseName => {
    const stats = courseStats[courseName];
    stats.averageScore = stats.totalScore / stats.gamesPlayed;
  });

  // Calculate variant averages
  variantStats['stroke-play'].averageScore =
    variantStats['stroke-play'].gamesPlayed > 0
      ? variantStats['stroke-play'].totalScore / variantStats['stroke-play'].gamesPlayed
      : 0;

  variantStats['match-play'].averagePoints =
    variantStats['match-play'].gamesPlayed > 0
      ? variantStats['match-play'].totalPoints / variantStats['match-play'].gamesPlayed
      : 0;

  variantStats.skins.averagePoints =
    variantStats.skins.gamesPlayed > 0
      ? variantStats.skins.totalPoints / variantStats.skins.gamesPlayed
      : 0;

  return {
    playerId,
    playerName,
    gamesPlayed,
    wins,
    winRate,
    averageScore,
    bestScore,
    worstScore,
    holeAverages: holeAveragesArray,
    holeScoreDistribution,
    tieBreakerWins,
    courseStats,
    variantStats: {
      'stroke-play': {
        gamesPlayed: variantStats['stroke-play'].gamesPlayed,
        wins: variantStats['stroke-play'].wins,
        averageScore: variantStats['stroke-play'].averageScore,
      },
      'match-play': {
        gamesPlayed: variantStats['match-play'].gamesPlayed,
        wins: variantStats['match-play'].wins,
        averagePoints: variantStats['match-play'].averagePoints,
      },
      skins: {
        gamesPlayed: variantStats.skins.gamesPlayed,
        wins: variantStats.skins.wins,
        averagePoints: variantStats.skins.averagePoints,
      },
    },
  };
}

// ============================================================================
// COMPREHENSIVE CRICKET STATS FROM SUPABASE
// ============================================================================

export async function getUserCricketStats(userId: string): Promise<CricketPlayerStats | null> {
  try {
    const { data: matches, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!matches || matches.length === 0) return null;

    // Find the player in the first match to get their ID
    const firstMatch = matches[0];
    const userPlayer = firstMatch.match_data.players?.find((p: any) => p.userId === userId);
    if (!userPlayer) return null;

    // Calculate comprehensive cricket stats
    const stats = calculateCricketStatsForPlayer(userPlayer.playerId, userPlayer.playerName, matches, userId);
    return stats;
  } catch (error) {
    console.error('Error fetching user cricket stats:', error);
    return null;
  }
}

function calculateCricketStatsForPlayer(
  playerId: string,
  playerName: string,
  matches: any[],
  userId: string
): CricketPlayerStats {
  let totalDarts = 0;
  let totalMarks = 0;
  let totalMPR = 0;
  let bestMPR = 0;
  let wins = 0;
  let perfectRounds = 0;
  let totalPlayersSkipped = 0;
  let totalTimesSkipped = 0;
  let totalPinAttempts = 0;
  let totalPinKickouts = 0;
  let totalPinCloseouts = 0;
  let totalKOPointsGiven = 0;
  let totalKOEliminationsCaused = 0;
  let timesEliminated = 0;
  let comebackWins = 0;
  let longestDartStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let losses = 0;
  let ties = 0;
  const skipGivenByGame: { matchId: string; date: string; count: number }[] = [];
  const skipReceivedByGame: { matchId: string; date: string; count: number }[] = [];
  const targetStats: { [target: string]: { dartsThrown: number; marksScored: number; accuracy: number; avgMarksPerGame: number } } = {};
  const headToHead: { [opponentId: string]: { opponentName: string; gamesPlayed: number; wins: number; losses: number; ties: number } } = {};

  const variantStats: any = {
    '4-way': { gamesPlayed: 0, wins: 0, totalMPR: 0, averageMPR: 0 },
    'tag-team': { gamesPlayed: 0, wins: 0, totalMPR: 0, averageMPR: 0 },
    knockout: { gamesPlayed: 0, wins: 0, totalMPR: 0, averageMPR: 0 },
  };

  matches.forEach(match => {
    const matchData = match.match_data;
    const player = matchData.players?.find((p: any) => p.userId === userId);
    if (!player) return;

    const gameMode = match.game_mode || '4-way';
    if (!variantStats[gameMode]) {
      variantStats[gameMode] = { gamesPlayed: 0, wins: 0, totalMPR: 0, averageMPR: 0 };
    }

    variantStats[gameMode].gamesPlayed++;
    totalMPR += player.mpr || 0;
    variantStats[gameMode].totalMPR += player.mpr || 0;
    bestMPR = Math.max(bestMPR, player.mpr || 0);

    // Count darts and marks
    player.rounds?.forEach((round: any) => {
      round.throws?.forEach((dart: any) => {
        totalDarts++;
        if (dart.marks > 0) totalMarks++;
        if (round.throws.every((d: any) => d.marks > 0)) perfectRounds++;
      });
    });

    // Win tracking
    const won = matchData.winnerId === player.playerId;
    const isTie = matchData.winnerId === null;
    if (won) {
      wins++;
      variantStats[gameMode].wins++;
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (isTie) {
      ties++;
      currentWinStreak = 0;
      currentLossStreak = 0;
    } else {
      losses++;
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    }

    // Skip stats
    const playersSkippedCount = player.playersSkipped || 0;
    const timesSkippedCount = player.timesSkipped || 0;
    totalPlayersSkipped += playersSkippedCount;
    totalTimesSkipped += timesSkippedCount;

    // Track skip stats by game
    if (playersSkippedCount > 0) {
      skipGivenByGame.push({
        matchId: match.id,
        date: match.created_at,
        count: playersSkippedCount,
      });
    }
    if (timesSkippedCount > 0) {
      skipReceivedByGame.push({
        matchId: match.id,
        date: match.created_at,
        count: timesSkippedCount,
      });
    }

    // Track target stats
    if (player.targetStats) {
      Object.keys(player.targetStats).forEach(target => {
        if (!targetStats[target]) {
          targetStats[target] = {
            dartsThrown: 0,
            marksScored: 0,
            accuracy: 0,
            avgMarksPerGame: 0,
          };
        }
        const stats = player.targetStats[target];
        targetStats[target].dartsThrown += stats.dartsThrown || 0;
        targetStats[target].marksScored += stats.marksScored || 0;
      });
    }

    // Track head-to-head records
    matchData.players?.forEach((opponent: any) => {
      if (opponent.playerId !== playerId && opponent.playerId) {
        if (!headToHead[opponent.playerId]) {
          headToHead[opponent.playerId] = {
            opponentName: opponent.playerName || 'Unknown',
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            ties: 0,
          };
        }
        headToHead[opponent.playerId].gamesPlayed++;
        if (won) headToHead[opponent.playerId].wins++;
        else if (isTie) headToHead[opponent.playerId].ties++;
        else headToHead[opponent.playerId].losses++;
      }
    });

    // PIN stats
    totalPinAttempts += player.pinAttempts || 0;
    totalPinKickouts += player.pinKickouts || 0;
    totalPinCloseouts += player.pinCloseouts || 0;

    // KO stats
    if (gameMode === 'knockout') {
      totalKOPointsGiven += player.koPointsGiven || 0;
      totalKOEliminationsCaused += player.koEliminationsCaused || 0;
      if (player.eliminated) timesEliminated++;
    }
  });

  // Calculate averages
  const gamesPlayed = matches.length;
  const averageMPR = gamesPlayed > 0 ? totalMPR / gamesPlayed : 0;
  const averageAccuracy = totalDarts > 0 ? (totalMarks / totalDarts) * 100 : 0;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
  const pinSuccessRate = totalPinAttempts > 0 ? (totalPinCloseouts / totalPinAttempts) * 100 : 0;
  const avgPinAttemptsPerGame = gamesPlayed > 0 ? totalPinAttempts / gamesPlayed : 0;

  // Calculate variant averages
  Object.keys(variantStats).forEach(variant => {
    const stats = variantStats[variant];
    stats.averageMPR = stats.gamesPlayed > 0 ? stats.totalMPR / stats.gamesPlayed : 0;
  });

  // Calculate target stats
  let favoriteTarget = '';
  let weakestTarget = '';
  let highestAccuracy = 0;
  let lowestAccuracy = 100;

  Object.keys(targetStats).forEach(target => {
    const stats = targetStats[target];
    stats.accuracy = stats.dartsThrown > 0 ? (stats.marksScored / stats.dartsThrown) * 100 : 0;
    stats.avgMarksPerGame = gamesPlayed > 0 ? stats.marksScored / gamesPlayed : 0;

    if (stats.accuracy > highestAccuracy) {
      highestAccuracy = stats.accuracy;
      favoriteTarget = target;
    }
    if (stats.accuracy < lowestAccuracy && stats.dartsThrown > 0) {
      lowestAccuracy = stats.accuracy;
      weakestTarget = target;
    }
  });

  return {
    playerId,
    playerName,
    gamesPlayed,
    wins,
    losses,
    ties,
    winRate,
    averageMPR,
    bestMPR,
    totalDarts,
    totalMarks,
    averageAccuracy,
    avgDartsPerMark: totalMarks > 0 ? totalDarts / totalMarks : 0,
    perfectRounds,
    totalPlayersSkipped,
    totalTimesSkipped,
    avgPlayersSkippedPerGame: gamesPlayed > 0 ? totalPlayersSkipped / gamesPlayed : 0,
    avgTimesSkippedPerGame: gamesPlayed > 0 ? totalTimesSkipped / gamesPlayed : 0,
    skipGivenByGame,
    skipReceivedByGame,
    totalPinAttempts,
    totalPinKickouts,
    totalPinCloseouts,
    pinSuccessRate,
    avgPinAttemptsPerGame,
    totalKOPointsGiven,
    totalKOEliminationsCaused,
    timesEliminated,
    avgKOPointsPerGame: gamesPlayed > 0 ? totalKOPointsGiven / gamesPlayed : 0,
    targetStats,
    favoriteTarget: favoriteTarget || 'None',
    weakestTarget: weakestTarget || 'None',
    comebackWins,
    longestDartStreak,
    longestWinStreak,
    longestLossStreak,
    currentStreak: {
      type: currentWinStreak > 0 ? 'win' : 'loss',
      count: currentWinStreak > 0 ? currentWinStreak : currentLossStreak,
    },
    headToHead,
    avgRoundsToCloseTarget: 0, // TODO: Calculate from match history
    variantStats,
    biggestRivalry: null,
    bestPartner: null,
  };
}
