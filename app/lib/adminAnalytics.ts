/**
 * Admin Analytics Functions
 * Fetch and process analytics data for admin dashboard
 */

import { createClient } from './supabase/client';

const supabase = createClient();

// ============================================================================
// ADMIN ACCESS CHECK
// ============================================================================

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.is_admin === true;
  } catch (error) {
    console.error('Error in checkIsAdmin:', error);
    return false;
  }
}

// ============================================================================
// USER ANALYTICS
// ============================================================================

export interface UserActivitySummary {
  totalUsers: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  topUsers: {
    email: string;
    displayName: string;
    totalMatches: number;
    cricketMatches: number;
    golfMatches: number;
    guestsAdded: number;
    lastActivity: string;
  }[];
}

export async function getUserActivitySummary(): Promise<UserActivitySummary> {
  try {
    // Get all user activity
    const { data: users, error } = await supabase
      .from('user_activity_analytics')
      .select('*');

    if (error) throw error;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeUsersLast7Days = users?.filter(u =>
      u.last_activity && new Date(u.last_activity) > sevenDaysAgo
    ).length || 0;

    const activeUsersLast30Days = users?.filter(u =>
      u.last_activity && new Date(u.last_activity) > thirtyDaysAgo
    ).length || 0;

    // Get top users with profile info
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name');

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const topUsers = (users || [])
      .map(u => {
        const profile = profileMap.get(u.user_id);
        return {
          email: profile?.email || u.email || 'Unknown',
          displayName: profile?.display_name || 'Unknown',
          totalMatches: (u.cricket_match_count || 0) + (u.golf_match_count || 0),
          cricketMatches: u.cricket_match_count || 0,
          golfMatches: u.golf_match_count || 0,
          guestsAdded: u.guest_count || 0,
          lastActivity: u.last_activity || 'Never',
        };
      })
      .sort((a, b) => b.totalMatches - a.totalMatches)
      .slice(0, 10);

    return {
      totalUsers: users?.length || 0,
      activeUsersLast7Days,
      activeUsersLast30Days,
      topUsers,
    };
  } catch (error) {
    console.error('Error fetching user activity summary:', error);
    return {
      totalUsers: 0,
      activeUsersLast7Days: 0,
      activeUsersLast30Days: 0,
      topUsers: [],
    };
  }
}

// ============================================================================
// GAME ANALYTICS
// ============================================================================

export interface GameAnalytics {
  totalMatches: number;
  cricketMatches: number;
  golfMatches: number;
  matchesLast7Days: number;
  matchesLast30Days: number;
  cricketModeBreakdown: { mode: string; count: number }[];
  golfModeBreakdown: { mode: string; count: number }[];
  averagePlayersPerGame: number;
}

export async function getGameAnalytics(): Promise<GameAnalytics> {
  try {
    // Get cricket matches
    const { data: cricketMatches, error: cricketError } = await supabase
      .from('cricket_matches')
      .select('game_mode, created_at, players');

    if (cricketError) throw cricketError;

    // Get golf matches
    const { data: golfMatches, error: golfError } = await supabase
      .from('golf_matches')
      .select('game_mode, created_at, players');

    if (golfError) throw golfError;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const cricketLast7 = cricketMatches?.filter(m =>
      new Date(m.created_at) > sevenDaysAgo
    ).length || 0;

    const cricketLast30 = cricketMatches?.filter(m =>
      new Date(m.created_at) > thirtyDaysAgo
    ).length || 0;

    const golfLast7 = golfMatches?.filter(m =>
      new Date(m.created_at) > sevenDaysAgo
    ).length || 0;

    const golfLast30 = golfMatches?.filter(m =>
      new Date(m.created_at) > thirtyDaysAgo
    ).length || 0;

    // Cricket mode breakdown
    const cricketModes = new Map<string, number>();
    cricketMatches?.forEach(m => {
      cricketModes.set(m.game_mode, (cricketModes.get(m.game_mode) || 0) + 1);
    });

    // Golf mode breakdown
    const golfModes = new Map<string, number>();
    golfMatches?.forEach(m => {
      golfModes.set(m.game_mode, (golfModes.get(m.game_mode) || 0) + 1);
    });

    // Calculate average players per game
    const allMatches = [...(cricketMatches || []), ...(golfMatches || [])];
    const totalPlayers = allMatches.reduce((sum, m) => {
      const playerCount = Array.isArray(m.players) ? m.players.length : 0;
      return sum + playerCount;
    }, 0);
    const averagePlayersPerGame = allMatches.length > 0
      ? totalPlayers / allMatches.length
      : 0;

    return {
      totalMatches: (cricketMatches?.length || 0) + (golfMatches?.length || 0),
      cricketMatches: cricketMatches?.length || 0,
      golfMatches: golfMatches?.length || 0,
      matchesLast7Days: cricketLast7 + golfLast7,
      matchesLast30Days: cricketLast30 + golfLast30,
      cricketModeBreakdown: Array.from(cricketModes.entries()).map(([mode, count]) => ({ mode, count })),
      golfModeBreakdown: Array.from(golfModes.entries()).map(([mode, count]) => ({ mode, count })),
      averagePlayersPerGame: Math.round(averagePlayersPerGame * 10) / 10,
    };
  } catch (error) {
    console.error('Error fetching game analytics:', error);
    return {
      totalMatches: 0,
      cricketMatches: 0,
      golfMatches: 0,
      matchesLast7Days: 0,
      matchesLast30Days: 0,
      cricketModeBreakdown: [],
      golfModeBreakdown: [],
      averagePlayersPerGame: 0,
    };
  }
}

// ============================================================================
// GUEST PLAYER ANALYTICS
// ============================================================================

export interface GuestPlayerAnalytics {
  totalGuests: number;
  activeGuests: number; // Guests who have played at least once
  topGuests: {
    name: string;
    addedBy: string;
    matchCount: number;
    created: string;
  }[];
  usersWithMostGuests: {
    displayName: string;
    guestCount: number;
  }[];
}

export async function getGuestPlayerAnalytics(): Promise<GuestPlayerAnalytics> {
  try {
    // Get guest player analytics view
    const { data: guests, error: guestError } = await supabase
      .from('guest_player_analytics')
      .select('*');

    if (guestError) throw guestError;

    // Get profiles for added_by info
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name');

    const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

    // Top guests by match count
    const topGuests = (guests || [])
      .sort((a, b) => b.total_match_count - a.total_match_count)
      .slice(0, 10)
      .map(g => ({
        name: g.name,
        addedBy: profileMap.get(g.added_by_user_id) || 'Unknown',
        matchCount: g.total_match_count || 0,
        created: g.created_at,
      }));

    // Count guests per user
    const guestsByUser = new Map<string, number>();
    guests?.forEach(g => {
      const count = guestsByUser.get(g.added_by_user_id) || 0;
      guestsByUser.set(g.added_by_user_id, count + 1);
    });

    const usersWithMostGuests = Array.from(guestsByUser.entries())
      .map(([userId, count]) => ({
        displayName: profileMap.get(userId) || 'Unknown',
        guestCount: count,
      }))
      .sort((a, b) => b.guestCount - a.guestCount)
      .slice(0, 10);

    const activeGuests = guests?.filter(g => g.total_match_count > 0).length || 0;

    return {
      totalGuests: guests?.length || 0,
      activeGuests,
      topGuests,
      usersWithMostGuests,
    };
  } catch (error) {
    console.error('Error fetching guest player analytics:', error);
    return {
      totalGuests: 0,
      activeGuests: 0,
      topGuests: [],
      usersWithMostGuests: [],
    };
  }
}
