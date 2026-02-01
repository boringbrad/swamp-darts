/**
 * Friend Activity Tracking
 * Fetches last played game information for friends
 */

import { createClient } from './supabase/client';

const supabase = createClient();

export interface FriendActivity {
  userId: string;
  lastPlayedAt: string | null;
  game: 'golf' | 'cricket' | null;
  venueName: string | null;
}

/**
 * Get the last activity for a list of friends
 */
export async function getFriendsLastActivity(friendUserIds: string[]): Promise<Map<string, FriendActivity>> {
  const activityMap = new Map<string, FriendActivity>();

  if (friendUserIds.length === 0) {
    return activityMap;
  }

  try {
    // Fetch all golf and cricket matches
    const [golfResponse, cricketResponse] = await Promise.all([
      supabase
        .from('golf_matches')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(1000), // Limit to recent matches for performance
      supabase
        .from('cricket_matches')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(1000),
    ]);

    // Process each friend
    for (const friendUserId of friendUserIds) {
      let lastActivity: FriendActivity = {
        userId: friendUserId,
        lastPlayedAt: null,
        game: null,
        venueName: null,
      };

      // Find latest golf match
      let latestGolfMatch: any = null;
      if (golfResponse.data) {
        for (const match of golfResponse.data) {
          if (match.match_data?.players?.some((p: any) =>
            p.userId === friendUserId || p.playerId === friendUserId
          )) {
            latestGolfMatch = match;
            break;
          }
        }
      }

      // Find latest cricket match
      let latestCricketMatch: any = null;
      if (cricketResponse.data) {
        for (const match of cricketResponse.data) {
          if (match.match_data?.players?.some((p: any) =>
            p.userId === friendUserId || p.playerId === friendUserId
          )) {
            latestCricketMatch = match;
            break;
          }
        }
      }

      // Compare timestamps to find the most recent
      const golfTime = latestGolfMatch?.completed_at ? new Date(latestGolfMatch.completed_at).getTime() : 0;
      const cricketTime = latestCricketMatch?.completed_at ? new Date(latestCricketMatch.completed_at).getTime() : 0;

      if (golfTime > 0 || cricketTime > 0) {
        if (golfTime > cricketTime) {
          lastActivity = {
            userId: friendUserId,
            lastPlayedAt: latestGolfMatch.completed_at,
            game: 'golf',
            venueName: latestGolfMatch.venue_name || null,
          };
        } else {
          lastActivity = {
            userId: friendUserId,
            lastPlayedAt: latestCricketMatch.completed_at,
            game: 'cricket',
            venueName: latestCricketMatch.venue_name || null,
          };
        }
      }

      activityMap.set(friendUserId, lastActivity);
    }
  } catch (error) {
    console.error('Error fetching friend activity:', error);
  }

  return activityMap;
}

/**
 * Format a relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
