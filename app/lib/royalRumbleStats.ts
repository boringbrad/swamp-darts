/**
 * Royal Rumble Statistics Calculation Engine
 * Calculates comprehensive player statistics from saved Royal Rumble matches
 */

import { RoyalRumbleMatch, RoyalRumblePlayerStats } from '../types/royalRumble';

/**
 * Load all Royal Rumble matches from localStorage
 */
export function loadRoyalRumbleMatches(): RoyalRumbleMatch[] {
  try {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('royalRumbleMatches');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading Royal Rumble matches:', error);
    return [];
  }
}

/**
 * Calculate comprehensive Royal Rumble stats for all players or filtered by player
 */
export function calculateRoyalRumbleStats(
  matches: RoyalRumbleMatch[],
  filters?: {
    playerId?: string;
  }
): RoyalRumblePlayerStats[] {
  // Filter matches
  let filteredMatches = matches;

  // Group matches by player
  const playerMatchesMap = new Map<string, { player: any; matches: RoyalRumbleMatch[] }>();

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

  // Calculate stats for each player
  const allStats: RoyalRumblePlayerStats[] = [];

  playerMatchesMap.forEach(({ player, matches }) => {
    const stats = calculatePlayerStats(player.playerId, matches);
    allStats.push(stats);
  });

  // Sort by games played (descending)
  return allStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

/**
 * Calculate stats for a single player across their matches
 */
function calculatePlayerStats(playerId: string, matches: RoyalRumbleMatch[]): RoyalRumblePlayerStats {
  const gamesPlayed = matches.length;
  let wins = 0;

  let totalAccuracy = 0;
  let bestAccuracy = 0;
  let totalStrikesDealt = 0;
  let totalHealingReceived = 0;
  let totalEliminations = 0;

  let timesEliminated = 0;
  let totalFinishPosition = 0;
  let survivalCount = 0; // Made it to final 2

  let totalEntryNumber = 0;
  const winsByEntryPosition = {
    early: 0,   // 1-5
    middle: 0,  // 6-15
    late: 0     // 16-20
  };

  const numberStatsAgg: Record<number, {
    gamesPlayed: number;
    wins: number;
    totalAccuracy: number;
  }> = {};

  // Process each match
  matches.forEach(match => {
    const playerData = match.players.find(p => p.playerId === playerId);
    if (!playerData) return;

    // Win/loss
    if (match.winnerId === playerId) {
      wins++;

      // Track wins by entry position
      if (playerData.entryNumber <= 5) {
        winsByEntryPosition.early++;
      } else if (playerData.entryNumber <= 15) {
        winsByEntryPosition.middle++;
      } else {
        winsByEntryPosition.late++;
      }
    }

    // Performance stats
    totalAccuracy += playerData.accuracy;
    bestAccuracy = Math.max(bestAccuracy, playerData.accuracy);
    totalStrikesDealt += playerData.strikesDealt;
    totalHealingReceived += playerData.healingReceived;
    totalEliminations += playerData.eliminationsCaused;

    // Survival stats
    if (playerData.wasEliminated) {
      timesEliminated++;
    }

    // Calculate finish position (1 = winner, 2 = last eliminated, etc.)
    const finishPosition = playerData.wasEliminated
      ? (match.players.filter(p => p.wasEliminated).length - (playerData.eliminationOrder || 0) + 2)
      : 1; // Winner
    totalFinishPosition += finishPosition;

    // Check if made it to final 2
    if (finishPosition <= 2) {
      survivalCount++;
    }

    // Entry stats
    totalEntryNumber += playerData.entryNumber;

    // Number stats
    const koNumber = playerData.koNumber;
    if (!numberStatsAgg[koNumber]) {
      numberStatsAgg[koNumber] = {
        gamesPlayed: 0,
        wins: 0,
        totalAccuracy: 0
      };
    }
    numberStatsAgg[koNumber].gamesPlayed++;
    if (match.winnerId === playerId) {
      numberStatsAgg[koNumber].wins++;
    }
    numberStatsAgg[koNumber].totalAccuracy += playerData.accuracy;
  });

  // Calculate averages
  const averageAccuracy = gamesPlayed > 0 ? totalAccuracy / gamesPlayed : 0;
  const averageStrikesDealt = gamesPlayed > 0 ? totalStrikesDealt / gamesPlayed : 0;
  const averageHealingReceived = gamesPlayed > 0 ? totalHealingReceived / gamesPlayed : 0;
  const avgEliminationsPerGame = gamesPlayed > 0 ? totalEliminations / gamesPlayed : 0;
  const averageFinishPosition = gamesPlayed > 0 ? totalFinishPosition / gamesPlayed : 0;
  const survivalRate = gamesPlayed > 0 ? (survivalCount / gamesPlayed) * 100 : 0;
  const averageEntryNumber = gamesPlayed > 0 ? totalEntryNumber / gamesPlayed : 0;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

  // Process number stats
  const numberStats: Record<number, {
    gamesPlayed: number;
    wins: number;
    averageAccuracy: number;
  }> = {};

  Object.entries(numberStatsAgg).forEach(([number, agg]) => {
    numberStats[parseInt(number)] = {
      gamesPlayed: agg.gamesPlayed,
      wins: agg.wins,
      averageAccuracy: agg.gamesPlayed > 0 ? agg.totalAccuracy / agg.gamesPlayed : 0
    };
  });

  const playerName = matches[0]?.players.find(p => p.playerId === playerId)?.playerName || 'Unknown';

  return {
    playerId,
    playerName,
    gamesPlayed,
    wins,
    winRate,
    averageAccuracy,
    bestAccuracy,
    averageStrikesDealt,
    averageHealingReceived,
    totalEliminations,
    avgEliminationsPerGame,
    timesEliminated,
    averageFinishPosition,
    survivalRate,
    averageEntryNumber,
    winsByEntryPosition,
    numberStats
  };
}

/**
 * Get all unique player IDs from matches (for filtering)
 */
export function getUniquePlayers(matches: RoyalRumbleMatch[]): { id: string; name: string }[] {
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
