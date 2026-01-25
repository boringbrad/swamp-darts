/**
 * Cricket Statistics Calculation Engine
 * Calculates comprehensive player statistics from saved Cricket matches
 */

import { CricketMatch, CricketPlayerStats } from '../types/stats';
import { CricketVariant } from '../types/game';
import { playerStorage } from './playerStorage';

/**
 * Load all cricket matches from localStorage
 */
export function loadCricketMatches(): CricketMatch[] {
  try {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('cricketMatches');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading cricket matches:', error);
    return [];
  }
}

/**
 * Calculate comprehensive cricket stats for all players or filtered by player/variant
 */
export function calculateCricketStats(
  matches: CricketMatch[],
  filters?: {
    playerId?: string;
    variant?: string;
  }
): CricketPlayerStats[] {
  // Filter matches
  let filteredMatches = matches;

  if (filters?.variant) {
    filteredMatches = filteredMatches.filter(m => m.variant === filters.variant);
  }

  // Group matches by player
  const playerMatchesMap = new Map<string, { player: any; matches: CricketMatch[] }>();

  filteredMatches.forEach(match => {
    match.players.forEach(player => {
      if (filters?.playerId && player.playerId !== filters.playerId) {
        return;
      }

      if (!playerMatchesMap.has(player.playerId)) {
        playerMatchesMap.set(player.playerId, {
          player: player,
          matches: []
        });
      }

      playerMatchesMap.get(player.playerId)!.matches.push(match);
    });
  });

  // Get list of valid player IDs (players that still exist in the system)
  const validPlayerIds = new Set(playerStorage.getAllPlayers().map(p => p.id));

  // Calculate stats for each player, but only if they still exist
  const allStats: CricketPlayerStats[] = [];

  playerMatchesMap.forEach(({ player, matches }) => {
    // Only include stats for players that still exist in the player list
    if (validPlayerIds.has(player.playerId)) {
      const stats = calculatePlayerStats(player.playerId, matches);
      allStats.push(stats);
    }
  });

  // Sort by games played (descending)
  return allStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

/**
 * Calculate stats for a single player across their matches
 */
function calculatePlayerStats(playerId: string, matches: CricketMatch[]): CricketPlayerStats {
  const gamesPlayed = matches.length;
  let wins = 0;
  let losses = 0;
  let ties = 0;

  let totalMPR = 0;
  let bestMPR = 0;
  let totalAccuracy = 0;
  let totalMarks = 0;
  let totalDarts = 0;

  let totalPlayersSkipped = 0;
  let totalTimesSkipped = 0;
  const skipGivenByGame: any[] = [];
  const skipReceivedByGame: any[] = [];

  let totalPinAttempts = 0;
  let totalPinKickouts = 0;
  let totalPinCloseouts = 0;

  let totalKOPointsGiven = 0;
  let totalKOEliminationsCaused = 0;
  let timesEliminated = 0;

  const targetStatsAgg: any = {};
  let longestDartStreak = 0;

  const headToHead: any = {};
  let perfectRounds = 0;
  let comebackWins = 0;

  const variantStats: any = {
    'singles': { gamesPlayed: 0, wins: 0, averageMPR: 0 },
    'tag-team': { gamesPlayed: 0, wins: 0, averageMPR: 0 },
    'triple-threat': { gamesPlayed: 0, wins: 0, averageMPR: 0 },
    'fatal-4-way': { gamesPlayed: 0, wins: 0, averageMPR: 0 },
  };

  // Process each match
  matches.forEach(match => {
    const playerData = match.players.find(p => p.playerId === playerId);
    if (!playerData) return;

    // Win/loss/tie
    if (match.winnerId === playerId) {
      wins++;
    } else if (match.winnerId === null) {
      ties++;
    } else {
      losses++;
    }

    // Performance stats
    totalMPR += playerData.mpr;
    bestMPR = Math.max(bestMPR, playerData.mpr);
    totalAccuracy += playerData.accuracy;
    totalMarks += playerData.totalMarks;
    totalDarts += playerData.totalDarts;

    // Skip stats
    totalPlayersSkipped += playerData.playersSkipped;
    totalTimesSkipped += playerData.timesSkipped;
    skipGivenByGame.push({
      matchId: match.matchId,
      date: match.date,
      count: playerData.playersSkipped
    });
    skipReceivedByGame.push({
      matchId: match.matchId,
      date: match.date,
      count: playerData.timesSkipped
    });

    // PIN stats
    totalPinAttempts += playerData.pinAttempts;
    totalPinKickouts += playerData.pinKickouts;
    totalPinCloseouts += playerData.pinCloseouts;

    // KO stats
    totalKOPointsGiven += playerData.koPointsGiven;
    totalKOEliminationsCaused += playerData.koEliminationsCaused;
    if (playerData.isEliminated) {
      timesEliminated++;
    }

    // Target stats
    Object.entries(playerData.targetStats).forEach(([target, stats]: [string, any]) => {
      if (!targetStatsAgg[target]) {
        targetStatsAgg[target] = {
          dartsThrown: 0,
          marksScored: 0,
          gamesPlayed: 0
        };
      }
      targetStatsAgg[target].dartsThrown += stats.dartsThrown;
      targetStatsAgg[target].marksScored += stats.marksScored;
      targetStatsAgg[target].gamesPlayed++;
    });

    // Streaks
    longestDartStreak = Math.max(longestDartStreak, playerData.longestDartStreak);

    // Perfect rounds (would need to analyze history - simplified for now)
    // TODO: Implement full perfect rounds calculation from history

    // Head-to-head
    match.players.forEach(opponent => {
      if (opponent.playerId === playerId) return;

      if (!headToHead[opponent.playerId]) {
        headToHead[opponent.playerId] = {
          opponentName: opponent.playerName,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          ties: 0
        };
      }

      headToHead[opponent.playerId].gamesPlayed++;

      if (match.winnerId === playerId) {
        headToHead[opponent.playerId].wins++;
      } else if (match.winnerId === null) {
        headToHead[opponent.playerId].ties++;
      } else if (match.winnerId === opponent.playerId) {
        headToHead[opponent.playerId].losses++;
      }
    });

    // Comeback wins (simplified - would need full history analysis)
    // TODO: Implement comeback detection from history

    // Variant stats
    if (variantStats[match.variant]) {
      variantStats[match.variant].gamesPlayed++;
      if (match.winnerId === playerId) {
        variantStats[match.variant].wins++;
      }
      variantStats[match.variant].averageMPR += playerData.mpr;
    }
  });

  // Calculate averages and derived stats
  const averageMPR = gamesPlayed > 0 ? totalMPR / gamesPlayed : 0;
  const averageAccuracy = gamesPlayed > 0 ? totalAccuracy / gamesPlayed : 0;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

  const avgPlayersSkippedPerGame = gamesPlayed > 0 ? totalPlayersSkipped / gamesPlayed : 0;
  const avgTimesSkippedPerGame = gamesPlayed > 0 ? totalTimesSkipped / gamesPlayed : 0;

  const pinSuccessRate = (totalPinAttempts + totalPinCloseouts) > 0
    ? (totalPinCloseouts / (totalPinAttempts + totalPinCloseouts)) * 100
    : 0;
  const avgPinAttemptsPerGame = gamesPlayed > 0 ? totalPinAttempts / gamesPlayed : 0;

  const avgKOPointsPerGame = gamesPlayed > 0 ? totalKOPointsGiven / gamesPlayed : 0;

  // Calculate enhanced marks (traditional marks + skips + KO points + PINs)
  const enhancedMarks = totalMarks + totalPlayersSkipped + totalKOPointsGiven + totalPinCloseouts;
  const avgDartsPerMark = enhancedMarks > 0 ? totalDarts / enhancedMarks : 0;

  // Process target stats
  const targetStats: any = {};
  let favoriteTarget = '';
  let weakestTarget = '';
  let highestAccuracy = 0;
  let lowestAccuracy = 100;

  Object.entries(targetStatsAgg).forEach(([target, agg]: [string, any]) => {
    const accuracy = agg.dartsThrown > 0 ? (agg.marksScored / agg.dartsThrown) * 100 : 0;
    const avgMarksPerGame = agg.gamesPlayed > 0 ? agg.marksScored / agg.gamesPlayed : 0;

    targetStats[target] = {
      dartsThrown: agg.dartsThrown,
      marksScored: agg.marksScored,
      accuracy,
      avgMarksPerGame
    };

    if (accuracy > highestAccuracy) {
      highestAccuracy = accuracy;
      favoriteTarget = target;
    }
    if (accuracy < lowestAccuracy && agg.dartsThrown > 0) {
      lowestAccuracy = accuracy;
      weakestTarget = target;
    }
  });

  // Find biggest rivalry (most competitive matchup)
  let biggestRivalry = null;
  let smallestDifferential = Infinity;

  Object.entries(headToHead).forEach(([opponentId, record]: [string, any]) => {
    if (record.gamesPlayed >= 3) { // Need at least 3 games
      const differential = Math.abs(record.wins - record.losses);
      if (differential < smallestDifferential) {
        smallestDifferential = differential;
        biggestRivalry = {
          opponentId,
          opponentName: record.opponentName,
          gamesPlayed: record.gamesPlayed,
          wins: record.wins,
          losses: record.losses,
          avgPointDifferential: differential / record.gamesPlayed
        };
      }
    }
  });

  // Find best partner (for doubles games)
  const bestPartner = findBestPartner(playerId, matches);

  // Calculate win/loss streaks
  const { longestWinStreak, longestLossStreak, currentStreak } = calculateStreaks(playerId, matches);

  // Calculate variant averages
  Object.keys(variantStats).forEach(variant => {
    if (variantStats[variant].gamesPlayed > 0) {
      variantStats[variant].averageMPR /= variantStats[variant].gamesPlayed;
    }
  });

  const playerName = matches[0]?.players.find(p => p.playerId === playerId)?.playerName || 'Unknown';

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
    averageAccuracy,
    totalMarks,
    totalDarts,
    totalPlayersSkipped,
    totalTimesSkipped,
    avgPlayersSkippedPerGame,
    avgTimesSkippedPerGame,
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
    avgKOPointsPerGame,
    targetStats,
    favoriteTarget,
    weakestTarget,
    longestDartStreak,
    longestWinStreak,
    longestLossStreak,
    currentStreak,
    biggestRivalry,
    bestPartner,
    headToHead,
    avgRoundsToCloseTarget: 0, // TODO: Calculate from history
    perfectRounds,
    avgDartsPerMark,
    comebackWins,
    variantStats
  };
}

/**
 * Helper: Find best partner for tag-team games
 */
function findBestPartner(playerId: string, matches: CricketMatch[]): any {
  const tagTeamMatches = matches.filter(m => m.variant === 'tag-team');
  if (tagTeamMatches.length === 0) return null;

  const partnerStats: any = {};

  tagTeamMatches.forEach(match => {
    const playerData = match.players.find(p => p.playerId === playerId);
    if (!playerData || !playerData.teamId) return;

    // Find partner (same teamId, different playerId)
    const partner = match.players.find(p =>
      p.teamId === playerData.teamId && p.playerId !== playerId
    );

    if (!partner) return;

    if (!partnerStats[partner.playerId]) {
      partnerStats[partner.playerId] = {
        partnerId: partner.playerId,
        partnerName: partner.playerName,
        gamesPlayed: 0,
        wins: 0,
        losses: 0
      };
    }

    partnerStats[partner.playerId].gamesPlayed++;

    if (match.winnerTeamIds?.includes(playerData.teamId)) {
      partnerStats[partner.playerId].wins++;
    } else {
      partnerStats[partner.playerId].losses++;
    }
  });

  // Find partner with highest win rate (min 2 games)
  let bestPartner = null;
  let highestWinRate = 0;

  Object.values(partnerStats).forEach((stats: any) => {
    if (stats.gamesPlayed >= 2) {
      const winRate = (stats.wins / stats.gamesPlayed) * 100;
      if (winRate > highestWinRate) {
        highestWinRate = winRate;
        bestPartner = { ...stats, winRate };
      }
    }
  });

  return bestPartner;
}

/**
 * Helper: Calculate win/loss streaks
 */
function calculateStreaks(playerId: string, matches: CricketMatch[]): any {
  // Sort matches by date
  const sortedMatches = [...matches].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let lastStreakType: 'win' | 'loss' | null = null;

  sortedMatches.forEach(match => {
    if (match.winnerId === playerId) {
      currentWinStreak++;
      currentLossStreak = 0;
      lastStreakType = 'win';
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (match.winnerId !== null) {
      currentLossStreak++;
      currentWinStreak = 0;
      lastStreakType = 'loss';
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else {
      // Tie - break streak
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  });

  return {
    longestWinStreak,
    longestLossStreak,
    currentStreak: {
      type: lastStreakType || 'loss',
      count: lastStreakType === 'win' ? currentWinStreak : currentLossStreak
    }
  };
}

/**
 * Get unique cricket variants from matches (for filtering)
 */
export function getUniqueCricketVariants(matches: CricketMatch[]): CricketVariant[] {
  const variants = new Set(matches.map(m => m.variant));
  return Array.from(variants).sort() as CricketVariant[];
}

/**
 * Get all unique player IDs from matches (for filtering)
 */
export function getUniquePlayers(matches: CricketMatch[]): { id: string; name: string }[] {
  const playerMap = new Map<string, string>();

  matches.forEach(match => {
    match.players.forEach(player => {
      if (!playerMap.has(player.playerId)) {
        playerMap.set(player.playerId, player.playerName);
      }
    });
  });

  return Array.from(playerMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Remove all cricket match data for a deleted player
 * Removes matches where the player was the only participant
 * Removes player data from matches with multiple players
 */
export function cleanupPlayerCricketMatches(playerId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const matches = loadCricketMatches();

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
        let updatedWinnerTeamIds = match.winnerTeamIds;

        if (match.winnerId === playerId && updatedPlayers.length > 0) {
          // Find new winner (highest points)
          const newWinner = updatedPlayers.reduce((best, player) =>
            player.finalPoints > best.finalPoints ? player : best
          );
          updatedWinnerId = newWinner.playerId;
        }

        // For team games, remove team IDs if player was on winning team
        if (match.winnerTeamIds && updatedWinnerTeamIds) {
          const playerTeamId = match.players.find(p => p.playerId === playerId)?.teamId;
          if (playerTeamId && updatedWinnerTeamIds.includes(playerTeamId)) {
            // Recalculate winner team based on remaining players
            const teamScores = new Map<string, number>();
            updatedPlayers.forEach(p => {
              if (p.teamId) {
                teamScores.set(p.teamId, (teamScores.get(p.teamId) || 0) + p.finalPoints);
              }
            });
            const winningTeam = Array.from(teamScores.entries()).reduce((best, [teamId, score]) =>
              score > best[1] ? [teamId, score] : best
            , ['', 0]);
            updatedWinnerTeamIds = [winningTeam[0]];
          }
        }

        return {
          ...match,
          players: updatedPlayers,
          winnerId: updatedWinnerId,
          winnerTeamIds: updatedWinnerTeamIds,
        };
      })
      .filter((match) => match !== null) as CricketMatch[]; // Remove null matches

    // Save cleaned matches back to localStorage
    localStorage.setItem('cricketMatches', JSON.stringify(cleanedMatches));

    console.log(`Cleaned up cricket matches for player ${playerId}. Removed ${matches.length - cleanedMatches.length} matches.`);
  } catch (error) {
    console.error('Error cleaning up cricket matches:', error);
  }
}
