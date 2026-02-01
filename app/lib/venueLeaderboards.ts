/**
 * Venue Leaderboards
 * Functions for fetching and calculating venue-wide and board-specific leaderboards
 */

import { createClient } from './supabase/client';

const supabase = createClient();

// ============================================================================
// Types
// ============================================================================

export interface GolfLeaderboardEntry {
  playerName: string;
  playerId?: string;
  avatar?: string;
  photoUrl?: string;
  bestScore: number;
  averageScore: number;
  totalGames: number;
  totalWins: number;
  holesInOne: number;
}

export interface CricketLeaderboardEntry {
  playerName: string;
  playerId?: string;
  avatar?: string;
  photoUrl?: string;
  totalGames: number;
  totalWins: number;
  winRate: number;
  averageScore: number;
}

export interface BoardLeaderboard {
  boardId: string;
  boardName: string;
  golf: GolfLeaderboardEntry[];
  totalGames: number;
}

export interface VenueLeaderboards {
  venueWide: {
    golf: GolfLeaderboardEntry[];
    cricket: CricketLeaderboardEntry[];
  };
  byBoard: BoardLeaderboard[];
}

// ============================================================================
// Golf Leaderboards
// ============================================================================

/**
 * Get golf leaderboard for a specific venue and optional board
 */
export async function getGolfLeaderboard(
  venueId: string,
  boardId?: string
): Promise<GolfLeaderboardEntry[]> {
  try {
    console.log('[getGolfLeaderboard] Fetching for venue:', venueId, 'board:', boardId);

    // Build query
    let query = supabase
      .from('golf_matches')
      .select('*')
      .eq('venue_id', venueId);

    // Filter by board if specified
    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Error fetching golf matches:', error);
      return [];
    }

    if (!matches || matches.length === 0) {
      console.log('[getGolfLeaderboard] No matches found');
      return [];
    }

    console.log(`[getGolfLeaderboard] Found ${matches.length} matches`);
    console.log('[getGolfLeaderboard] Sample match data:', JSON.stringify(matches[0]?.match_data, null, 2));

    // Calculate stats per player
    const playerStats = new Map<string, {
      name: string;
      playerId?: string;
      avatar?: string;
      photoUrl?: string;
      scores: number[];
      wins: number;
      holesInOne: number;
    }>();

    matches.forEach(match => {
      const matchData = match.match_data;
      if (!matchData || !matchData.players) return;

      console.log('[getGolfLeaderboard] Processing match with players:', matchData.players.map((p: any) => ({
        id: p.id,
        playerId: p.playerId,
        name: p.name,
        playerName: p.playerName,
        avatar: p.avatar,
        photoUrl: p.photoUrl
      })));

      matchData.players.forEach((player: any) => {
        // Use the correct property names: playerId and playerName
        const playerKey = player.playerId || player.id || player.playerName || player.name;
        const playerName = player.playerName || player.name || 'Unknown';

        if (!playerStats.has(playerKey)) {
          playerStats.set(playerKey, {
            name: playerName,
            playerId: player.playerId || player.id,
            avatar: player.avatar,
            photoUrl: player.photoUrl,
            scores: [],
            wins: 0,
            holesInOne: 0,
          });
        }

        const stats = playerStats.get(playerKey)!;

        // Add score
        if (typeof player.totalScore === 'number') {
          stats.scores.push(player.totalScore);
        }

        // Count wins
        if (player.won === true || player.isWinner === true) {
          stats.wins++;
        }

        // Count holes in one
        if (player.holeScores && Array.isArray(player.holeScores)) {
          const hioCount = player.holeScores.filter((score: number) => score === 1).length;
          stats.holesInOne += hioCount;
        }
      });
    });

    // Convert to leaderboard entries
    const leaderboard: GolfLeaderboardEntry[] = Array.from(playerStats.entries())
      .map(([_, stats]) => ({
        playerName: stats.name,
        playerId: stats.playerId,
        avatar: stats.avatar,
        photoUrl: stats.photoUrl,
        bestScore: stats.scores.length > 0 ? Math.min(...stats.scores) : 999,
        averageScore: stats.scores.length > 0
          ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length * 10) / 10
          : 0,
        totalGames: stats.scores.length,
        totalWins: stats.wins,
        holesInOne: stats.holesInOne,
      }))
      .filter(entry => entry.totalGames > 0)
      .sort((a, b) => a.bestScore - b.bestScore); // Sort by best score (lowest first)

    console.log(`[getGolfLeaderboard] Calculated stats for ${leaderboard.length} players`);
    return leaderboard;
  } catch (error) {
    console.error('Unexpected error in getGolfLeaderboard:', error);
    return [];
  }
}

// ============================================================================
// Cricket Leaderboards
// ============================================================================

/**
 * Get cricket leaderboard for a specific venue
 */
export async function getCricketLeaderboard(
  venueId: string
): Promise<CricketLeaderboardEntry[]> {
  try {
    console.log('[getCricketLeaderboard] Fetching for venue:', venueId);

    const { data: matches, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('venue_id', venueId);

    if (error) {
      console.error('Error fetching cricket matches:', error);
      return [];
    }

    if (!matches || matches.length === 0) {
      console.log('[getCricketLeaderboard] No matches found');
      return [];
    }

    console.log(`[getCricketLeaderboard] Found ${matches.length} matches`);

    // Calculate stats per player
    const playerStats = new Map<string, {
      name: string;
      playerId?: string;
      avatar?: string;
      photoUrl?: string;
      games: number;
      wins: number;
      totalScore: number;
    }>();

    matches.forEach(match => {
      const matchData = match.match_data;
      if (!matchData || !matchData.players) return;

      matchData.players.forEach((player: any) => {
        // Use the correct property names: playerId and playerName
        const playerKey = player.playerId || player.id || player.playerName || player.name;
        const playerName = player.playerName || player.name || 'Unknown';

        if (!playerStats.has(playerKey)) {
          playerStats.set(playerKey, {
            name: playerName,
            playerId: player.playerId || player.id,
            avatar: player.avatar,
            photoUrl: player.photoUrl,
            games: 0,
            wins: 0,
            totalScore: 0,
          });
        }

        const stats = playerStats.get(playerKey)!;
        stats.games++;

        // Count wins
        if (player.won === true || player.isWinner === true) {
          stats.wins++;
        }

        // Add score (for cricket, lower is better - it's points remaining)
        if (typeof player.score === 'number') {
          stats.totalScore += player.score;
        }
      });
    });

    // Convert to leaderboard entries
    const leaderboard: CricketLeaderboardEntry[] = Array.from(playerStats.entries())
      .map(([_, stats]) => ({
        playerName: stats.name,
        playerId: stats.playerId,
        avatar: stats.avatar,
        photoUrl: stats.photoUrl,
        totalGames: stats.games,
        totalWins: stats.wins,
        winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0,
        averageScore: stats.games > 0
          ? Math.round(stats.totalScore / stats.games * 10) / 10
          : 0,
      }))
      .filter(entry => entry.totalGames > 0)
      .sort((a, b) => b.winRate - a.winRate); // Sort by win rate (highest first)

    console.log(`[getCricketLeaderboard] Calculated stats for ${leaderboard.length} players`);
    return leaderboard;
  } catch (error) {
    console.error('Unexpected error in getCricketLeaderboard:', error);
    return [];
  }
}

// ============================================================================
// Venue-Wide Leaderboards
// ============================================================================

/**
 * Get all leaderboards for a venue (venue-wide + per board)
 */
export async function getVenueLeaderboards(venueId: string): Promise<VenueLeaderboards> {
  try {
    console.log('[getVenueLeaderboards] Fetching leaderboards for venue:', venueId);

    // Fetch venue-wide leaderboards
    const [venueGolf, venueCricket] = await Promise.all([
      getGolfLeaderboard(venueId),
      getCricketLeaderboard(venueId),
    ]);

    // Fetch all boards for this venue
    const { data: boards, error: boardsError } = await supabase
      .from('venue_boards')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('board_order', { ascending: true });

    if (boardsError) {
      console.error('Error fetching boards:', boardsError);
    }

    // Fetch leaderboards for each board
    const byBoard: BoardLeaderboard[] = [];

    if (boards && boards.length > 0) {
      for (const board of boards) {
        const boardGolf = await getGolfLeaderboard(venueId, board.id);

        // Count total games for this board
        const totalGames = boardGolf.reduce((sum, entry) => sum + entry.totalGames, 0);

        byBoard.push({
          boardId: board.id,
          boardName: board.board_name,
          golf: boardGolf,
          totalGames,
        });
      }
    }

    console.log('[getVenueLeaderboards] Completed fetching all leaderboards');

    return {
      venueWide: {
        golf: venueGolf,
        cricket: venueCricket,
      },
      byBoard,
    };
  } catch (error) {
    console.error('Unexpected error in getVenueLeaderboards:', error);
    return {
      venueWide: {
        golf: [],
        cricket: [],
      },
      byBoard: [],
    };
  }
}
