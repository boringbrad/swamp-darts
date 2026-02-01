/**
 * Ghost Player Utilities
 * Functions for creating and managing ghost players (computer players using best game data)
 */

import { loadCricketMatches } from './cricketStats';
import { loadGolfMatches } from './golfStats';
import { CricketMatch, GolfMatch } from '../types/stats';
import { CricketVariant } from '../types/game';
import { Player } from '../types/game';
import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Get a player's best Cricket game for a specific variant
 */
export async function getPlayerBestCricketGame(
  playerId: string,
  variant: CricketVariant,
  userId?: string
): Promise<CricketMatch | null> {
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  let matches: any[] = [];

  if (user) {
    // Load from Supabase for logged-in users
    const { data: supabaseMatches, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('user_id', user.id);

    if (!error && supabaseMatches) {
      matches = supabaseMatches.map(m => m.match_data);
    }
  } else {
    // Fallback to localStorage
    matches = loadCricketMatches();
  }

  // Filter matches by variant and player (match by playerId OR userId)
  const playerMatches = matches.filter(match =>
    match.variant === variant &&
    match.players.some((p: any) =>
      p.playerId === playerId ||
      (userId && p.userId === userId)
    )
  );

  if (playerMatches.length === 0) return null;

  // Find the match where this player had the highest MPR
  let bestMatch: CricketMatch | null = null;
  let bestMPR = 0;

  playerMatches.forEach(match => {
    let playerData = match.players.find((p: any) => p.playerId === playerId);
    if (!playerData && userId) {
      playerData = match.players.find((p: any) => p.userId === userId);
    }

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
export async function getPlayerBestGolfGame(
  playerId: string,
  variant: 'stroke-play' | 'match-play' | 'skins',
  userId?: string
): Promise<GolfMatch | null> {
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

  // Filter matches by variant and player (match by playerId OR userId)
  const playerMatches = matches.filter(match =>
    match.variant === variant &&
    match.players.some(p =>
      p.playerId === playerId ||
      (userId && (p as any).userId === userId)
    )
  );

  if (playerMatches.length === 0) return null;

  // Find the match where this player had the best score
  let bestMatch: GolfMatch | null = null;
  let bestScore = Infinity;

  playerMatches.forEach(match => {
    let playerData = match.players.find(p => p.playerId === playerId);
    if (!playerData && userId) {
      playerData = match.players.find(p => (p as any).userId === userId);
    }

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
export async function createGhostPlayer(
  basePlayer: Player,
  gameMode: 'cricket' | 'golf',
  variant: CricketVariant | 'stroke-play' | 'match-play' | 'skins',
  userId?: string
): Promise<Player | null> {
  // Check if player has any games in this mode/variant
  let hasGames = false;

  if (gameMode === 'cricket') {
    const bestGame = await getPlayerBestCricketGame(basePlayer.id, variant as CricketVariant, userId);
    hasGames = bestGame !== null;
  } else if (gameMode === 'golf') {
    const bestGame = await getPlayerBestGolfGame(basePlayer.id, variant as 'stroke-play' | 'match-play' | 'skins', userId);
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
export async function getGhostPlayerHistory(
  ghostPlayerId: string,
  gameMode: 'cricket' | 'golf',
  variant: CricketVariant | 'stroke-play' | 'match-play' | 'skins',
  ghostBasePlayerId: string,
  userId?: string
): Promise<any[]> {
  if (gameMode === 'cricket') {
    const bestGame = await getPlayerBestCricketGame(ghostBasePlayerId, variant as CricketVariant, userId);
    if (!bestGame) return [];

    // Find the player's data in the match (match by playerId OR userId)
    let playerData = bestGame.players.find(p => p.playerId === ghostBasePlayerId);
    if (!playerData && userId) {
      playerData = bestGame.players.find((p: any) => p.userId === userId);
    }
    if (!playerData) return [];

    // Filter history to only this player's turns
    return bestGame.history.filter((entry: any) => entry.playerId === ghostBasePlayerId);
  } else if (gameMode === 'golf') {
    const bestGame = await getPlayerBestGolfGame(ghostBasePlayerId, variant as 'stroke-play' | 'match-play' | 'skins', userId);
    if (!bestGame) return [];

    // For golf, return the hole scores (match by playerId OR userId)
    let playerData = bestGame.players.find(p => p.playerId === ghostBasePlayerId);
    if (!playerData && userId) {
      playerData = bestGame.players.find(p => (p as any).userId === userId);
    }
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
export async function playerHasGames(
  playerId: string,
  gameMode: 'cricket' | 'golf',
  variant: CricketVariant | 'stroke-play' | 'match-play' | 'skins',
  userId?: string
): Promise<boolean> {
  if (gameMode === 'cricket') {
    const bestGame = await getPlayerBestCricketGame(playerId, variant as CricketVariant, userId);
    return bestGame !== null;
  } else if (gameMode === 'golf') {
    const bestGame = await getPlayerBestGolfGame(playerId, variant as 'stroke-play' | 'match-play' | 'skins', userId);
    return bestGame !== null;
  }
  return false;
}
