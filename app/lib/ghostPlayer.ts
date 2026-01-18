/**
 * Ghost Player Utilities
 * Functions for creating and managing ghost players (computer players using best game data)
 */

import { loadCricketMatches } from './cricketStats';
import { loadGolfMatches } from './golfStats';
import { CricketMatch, GolfMatch } from '../types/stats';
import { CricketVariant } from '../types/game';
import { Player } from '../types/game';

/**
 * Get a player's best Cricket game for a specific variant
 */
export function getPlayerBestCricketGame(
  playerId: string,
  variant: CricketVariant
): CricketMatch | null {
  const matches = loadCricketMatches();

  // Filter matches by variant and player
  const playerMatches = matches.filter(match =>
    match.variant === variant &&
    match.players.some(p => p.playerId === playerId)
  );

  if (playerMatches.length === 0) return null;

  // Find the match where this player had the highest MPR
  let bestMatch: CricketMatch | null = null;
  let bestMPR = 0;

  playerMatches.forEach(match => {
    const playerData = match.players.find(p => p.playerId === playerId);
    if (playerData && playerData.mpr > bestMPR) {
      bestMPR = playerData.mpr;
      bestMatch = match;
    }
  });

  return bestMatch;
}

/**
 * Get a player's best Golf game for a specific variant
 */
export function getPlayerBestGolfGame(
  playerId: string,
  variant: 'stroke-play' | 'match-play' | 'skins'
): GolfMatch | null {
  const matches = loadGolfMatches();

  // Filter matches by variant and player
  const playerMatches = matches.filter(match =>
    match.variant === variant &&
    match.players.some(p => p.playerId === playerId)
  );

  if (playerMatches.length === 0) return null;

  // Find the match where this player had the best score
  let bestMatch: GolfMatch | null = null;
  let bestScore = Infinity;

  playerMatches.forEach(match => {
    const playerData = match.players.find(p => p.playerId === playerId);
    if (playerData && playerData.totalScore < bestScore) {
      bestScore = playerData.totalScore;
      bestMatch = match;
    }
  });

  return bestMatch;
}

/**
 * Create a ghost player from an existing player
 */
export function createGhostPlayer(
  basePlayer: Player,
  gameMode: 'cricket' | 'golf',
  variant: CricketVariant | 'stroke-play' | 'match-play' | 'skins'
): Player | null {
  // Check if player has any games in this mode/variant
  let hasGames = false;

  if (gameMode === 'cricket') {
    const bestGame = getPlayerBestCricketGame(basePlayer.id, variant as CricketVariant);
    hasGames = bestGame !== null;
  } else if (gameMode === 'golf') {
    const bestGame = getPlayerBestGolfGame(basePlayer.id, variant as 'stroke-play' | 'match-play' | 'skins');
    hasGames = bestGame !== null;
  }

  if (!hasGames) {
    return null; // No games found for this player in this mode/variant
  }

  // Create ghost player
  return {
    id: `ghost-${basePlayer.id}-${Date.now()}`, // Unique ID for ghost
    name: `👻 ${basePlayer.name}`, // Prefix with ghost emoji
    avatar: basePlayer.avatar,
    photoUrl: basePlayer.photoUrl,
    isGuest: false,
    isGhost: true,
    ghostBasePlayerId: basePlayer.id
  };
}

/**
 * Get the history from a player's best game (for auto-scoring)
 */
export function getGhostPlayerHistory(
  ghostPlayerId: string,
  gameMode: 'cricket' | 'golf',
  variant: CricketVariant | 'stroke-play' | 'match-play' | 'skins',
  ghostBasePlayerId: string
): any[] {
  if (gameMode === 'cricket') {
    const bestGame = getPlayerBestCricketGame(ghostBasePlayerId, variant as CricketVariant);
    if (!bestGame) return [];

    // Find the player's data in the match
    const playerData = bestGame.players.find(p => p.playerId === ghostBasePlayerId);
    if (!playerData) return [];

    // Filter history to only this player's turns
    return bestGame.history.filter((entry: any) => entry.playerId === ghostBasePlayerId);
  } else if (gameMode === 'golf') {
    const bestGame = getPlayerBestGolfGame(ghostBasePlayerId, variant as 'stroke-play' | 'match-play' | 'skins');
    if (!bestGame) return [];

    // For golf, return the hole scores
    const playerData = bestGame.players.find(p => p.playerId === ghostBasePlayerId);
    if (!playerData) return [];

    return playerData.holeScores.map((score, index) => ({
      hole: index + 1,
      score: score
    }));
  }

  return [];
}

/**
 * Check if a player has any games in a specific mode/variant
 */
export function playerHasGames(
  playerId: string,
  gameMode: 'cricket' | 'golf',
  variant: CricketVariant | 'stroke-play' | 'match-play' | 'skins'
): boolean {
  if (gameMode === 'cricket') {
    const bestGame = getPlayerBestCricketGame(playerId, variant as CricketVariant);
    return bestGame !== null;
  } else if (gameMode === 'golf') {
    const bestGame = getPlayerBestGolfGame(playerId, variant as 'stroke-play' | 'match-play' | 'skins');
    return bestGame !== null;
  }
  return false;
}
