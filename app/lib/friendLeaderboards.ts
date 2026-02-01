/**
 * Friend Leaderboards
 * Functions for fetching and calculating leaderboards for you and your friends
 */

import { createClient } from './supabase/client';
import { getFriends } from './friends';

const supabase = createClient();

// ============================================================================
// Types
// ============================================================================

export interface FriendGolfStats {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  photoUrl?: string;
  isOnline: boolean;
  bestScore: number;
  averageScore: number;
  totalGames: number;
  totalWins: number;
  holesInOne: number;
}

export interface FriendCricketStats {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  photoUrl?: string;
  isOnline: boolean;
  totalGames: number;
  totalWins: number;
  winRate: number;
}

// ============================================================================
// Friend Golf Leaderboards
// ============================================================================

/**
 * Get golf stats for current user and all their friends
 */
export async function getFriendGolfLeaderboard(timePeriod: 'all-time' | 'month' | 'week' = 'all-time'): Promise<FriendGolfStats[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[getFriendGolfLeaderboard] Not authenticated');
      return [];
    }

    // Get list of friends
    const friends = await getFriends();
    const friendUserIds = friends.map(f => f.userId);

    // Include current user in the list
    const allUserIds = [user.id, ...friendUserIds];

    console.log(`[getFriendGolfLeaderboard] Fetching stats for ${allUserIds.length} users, period: ${timePeriod}`);
    console.log('[getFriendGolfLeaderboard] User IDs:', allUserIds);
    console.log('[getFriendGolfLeaderboard] Current user ID:', user.id);
    console.log('[getFriendGolfLeaderboard] Friend IDs:', friendUserIds);

    // Calculate date filter based on time period
    let dateFilter: string | undefined;
    const now = new Date();
    if (timePeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = weekAgo.toISOString();
    } else if (timePeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = monthAgo.toISOString();
    }

    // Fetch all golf matches for these users
    let query = supabase
      .from('golf_matches')
      .select('*')
      .in('user_id', allUserIds);

    // Apply date filter if not all-time
    if (dateFilter) {
      query = query.gte('completed_at', dateFilter);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('[getFriendGolfLeaderboard] Error fetching golf matches:', error);
      return [];
    }

    console.log('[getFriendGolfLeaderboard] Query result:', {
      matchCount: matches?.length || 0,
      userIds: allUserIds,
      dateFilter,
      sampleMatch: matches?.[0]
    });

    // Log unique user_ids in the returned matches
    const matchUserIds = [...new Set(matches?.map(m => m.user_id) || [])];
    console.log('[getFriendGolfLeaderboard] Unique user_ids in matches:', matchUserIds);

    if (!matches || matches.length === 0) {
      console.log('[getFriendGolfLeaderboard] No matches found for users:', allUserIds);
      return [];
    }

    console.log(`[getFriendGolfLeaderboard] Found ${matches.length} matches`);

    // Calculate stats per user
    const userStats = new Map<string, {
      scores: number[];
      wins: number;
      holesInOne: number;
    }>();

    matches.forEach(match => {
      const matchData = match.match_data;

      if (!matchData || !matchData.players) return;

      // Iterate through all players in the match
      matchData.players.forEach((player: any) => {
        // Determine which friend this player is
        const playerUserId = player.userId || player.playerId || player.id;

        // Only track stats for players who are in our friends list
        if (!playerUserId || !allUserIds.includes(playerUserId)) return;

        // Initialize stats for this friend if needed
        if (!userStats.has(playerUserId)) {
          userStats.set(playerUserId, {
            scores: [],
            wins: 0,
            holesInOne: 0,
          });
        }

        const stats = userStats.get(playerUserId)!;

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

    // Fetch profile data for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar, photo_url')
      .in('id', allUserIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    // Build leaderboard
    const leaderboard: FriendGolfStats[] = (profiles || [])
      .map(profile => {
        const stats = userStats.get(profile.id);

        return {
          userId: profile.id,
          username: profile.username || 'Unknown',
          displayName: profile.display_name || profile.username || 'Unknown',
          avatar: profile.avatar,
          photoUrl: profile.photo_url,
          isOnline: false,
          bestScore: stats && stats.scores.length > 0 ? Math.min(...stats.scores) : 999,
          averageScore: stats && stats.scores.length > 0
            ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length * 10) / 10
            : 0,
          totalGames: stats?.scores.length || 0,
          totalWins: stats?.wins || 0,
          holesInOne: stats?.holesInOne || 0,
        };
      })
      .filter(entry => entry.totalGames > 0)
      .sort((a, b) => a.bestScore - b.bestScore); // Sort by best score (lowest first)

    console.log(`[getFriendGolfLeaderboard] Calculated stats for ${leaderboard.length} players`);
    return leaderboard;
  } catch (error) {
    console.error('Unexpected error in getFriendGolfLeaderboard:', error);
    return [];
  }
}

// ============================================================================
// Friend Cricket Leaderboards
// ============================================================================

/**
 * Get cricket stats for current user and all their friends
 */
export async function getFriendCricketLeaderboard(timePeriod: 'all-time' | 'month' | 'week' = 'all-time'): Promise<FriendCricketStats[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[getFriendCricketLeaderboard] Not authenticated');
      return [];
    }

    // Get list of friends
    const friends = await getFriends();
    const friendUserIds = friends.map(f => f.userId);

    // Include current user in the list
    const allUserIds = [user.id, ...friendUserIds];

    console.log(`[getFriendCricketLeaderboard] Fetching stats for ${allUserIds.length} users, period: ${timePeriod}`);

    // Calculate date filter based on time period
    let dateFilter: string | undefined;
    const now = new Date();
    if (timePeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = weekAgo.toISOString();
    } else if (timePeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = monthAgo.toISOString();
    }

    // Fetch all cricket matches for these users
    let query = supabase
      .from('cricket_matches')
      .select('*')
      .in('user_id', allUserIds);

    // Apply date filter if not all-time
    if (dateFilter) {
      query = query.gte('completed_at', dateFilter);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Error fetching cricket matches:', error);
      return [];
    }

    if (!matches || matches.length === 0) {
      console.log('[getFriendCricketLeaderboard] No matches found');
      return [];
    }

    console.log(`[getFriendCricketLeaderboard] Found ${matches.length} matches`);

    // Calculate stats per user
    const userStats = new Map<string, {
      games: number;
      wins: number;
    }>();

    matches.forEach(match => {
      const matchData = match.match_data;

      if (!matchData || !matchData.players) return;

      // Iterate through all players in the match
      matchData.players.forEach((player: any) => {
        // Determine which friend this player is
        const playerUserId = player.userId || player.playerId || player.id;

        // Only track stats for players who are in our friends list
        if (!playerUserId || !allUserIds.includes(playerUserId)) return;

        // Initialize stats for this friend if needed
        if (!userStats.has(playerUserId)) {
          userStats.set(playerUserId, {
            games: 0,
            wins: 0,
          });
        }

        const stats = userStats.get(playerUserId)!;

        // Count game
        stats.games++;

        // Count wins
        if (player.won === true || player.isWinner === true) {
          stats.wins++;
        }
      });
    });

    // Fetch profile data for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar, photo_url')
      .in('id', allUserIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    // Build leaderboard
    const leaderboard: FriendCricketStats[] = (profiles || [])
      .map(profile => {
        const stats = userStats.get(profile.id);

        return {
          userId: profile.id,
          username: profile.username || 'Unknown',
          displayName: profile.display_name || profile.username || 'Unknown',
          avatar: profile.avatar,
          photoUrl: profile.photo_url,
          isOnline: false,
          totalGames: stats?.games || 0,
          totalWins: stats?.wins || 0,
          winRate: stats && stats.games > 0
            ? Math.round((stats.wins / stats.games) * 100)
            : 0,
        };
      })
      .filter(entry => entry.totalGames > 0)
      .sort((a, b) => b.winRate - a.winRate); // Sort by win rate (highest first)

    console.log(`[getFriendCricketLeaderboard] Calculated stats for ${leaderboard.length} players`);
    return leaderboard;
  } catch (error) {
    console.error('Unexpected error in getFriendCricketLeaderboard:', error);
    return [];
  }
}
