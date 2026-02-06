/**
 * Friend Management Utilities
 * Handles friend requests, acceptance, and friend lists
 */

import { createClient } from './supabase/client';

const supabase = createClient();

export interface Friend {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  photoUrl?: string;
  status: 'pending' | 'accepted';
  friendshipId: string;
  requestedBy: string;
  createdAt: string;
  isOnline?: boolean;
  lastSeenAt?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatar?: string;
  fromPhotoUrl?: string;
  createdAt: string;
}

/**
 * Search for users by username or display name
 * Privacy-compliant: Only allows partial matching on username/display_name
 * For email, requires EXACT match and doesn't expose email in results
 */
export async function searchUsers(query: string): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Check if query looks like an email (contains @)
    const isEmailQuery = query.includes('@');

    if (isEmailQuery) {
      // For email queries, only allow EXACT match for privacy
      // Don't expose the email in results - only show if exact match found
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar, photo_url')
        .eq('email', query) // Exact match only
        .neq('id', user.id)
        .limit(1);

      if (error) {
        console.error('Error searching users by email:', error);
        return [];
      }

      // Return without email field to protect privacy
      return data || [];
    } else {
      // For non-email queries, search username and display_name with partial matching
      // Don't include email field to prevent email harvesting
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar, photo_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', user.id)
        .limit(20);

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return data || [];
    }
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${targetUserId}),and(user_id_1.eq.${targetUserId},user_id_2.eq.${user.id})`)
      .single();

    if (existing) {
      return { success: false, error: 'Friend request already exists' };
    }

    // Create friendship record (always put smaller UUID first for consistency)
    const [userId1, userId2] = [user.id, targetUserId].sort();

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
        status: 'pending',
        requested_by: user.id
      });

    if (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendFriendRequest:', error);
    return { success: false, error: 'Failed to send friend request' };
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in acceptFriendRequest:', error);
    return { success: false, error: 'Failed to accept friend request' };
  }
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(friendshipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined' })
      .eq('id', friendshipId);

    if (error) {
      console.error('Error declining friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in declineFriendRequest:', error);
    return { success: false, error: 'Failed to decline friend request' };
  }
}

/**
 * Remove a friend (delete friendship)
 */
export async function removeFriend(friendshipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeFriend:', error);
    return { success: false, error: 'Failed to remove friend' };
  }
}

/**
 * Get all friends (accepted friendships)
 */
export async function getFriends(): Promise<Friend[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id_1,
        user_id_2,
        status,
        requested_by,
        created_at
      `)
      .eq('status', 'accepted')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Get all friend user IDs in one pass
    const friendUserIds = data.map(friendship =>
      friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1
    );

    // Fetch all profiles in a single query
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar, photo_url, last_seen_at')
      .in('id', friendUserIds);

    if (profilesError) {
      console.error('Error fetching friend profiles:', profilesError);
      return [];
    }

    if (!profiles) return [];

    // Create a map of userId -> profile for quick lookup
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Build friends array
    const friends: Friend[] = [];
    for (const friendship of data) {
      const friendUserId = friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1;
      const profile = profileMap.get(friendUserId);

      if (profile) {
        friends.push({
          id: friendship.id,
          userId: friendUserId,
          username: profile.username,
          displayName: profile.display_name,
          avatar: profile.avatar,
          photoUrl: profile.photo_url,
          status: 'accepted',
          friendshipId: friendship.id,
          requestedBy: friendship.requested_by,
          createdAt: friendship.created_at,
          lastSeenAt: profile.last_seen_at,
          isOnline: isUserOnline(profile.last_seen_at)
        });
      }
    }

    return friends;
  } catch (error) {
    console.error('Error in getFriends:', error);
    return [];
  }
}

/**
 * Get pending friend requests (received)
 */
export async function getFriendRequests(): Promise<FriendRequest[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'pending')
      .neq('requested_by', user.id) // Only requests we received
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Get all requester IDs
    const requesterIds = data.map(friendship => friendship.requested_by);

    // Fetch all profiles in a single query
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar, photo_url')
      .in('id', requesterIds);

    if (profilesError) {
      console.error('Error fetching requester profiles:', profilesError);
      return [];
    }

    if (!profiles) return [];

    // Create a map of userId -> profile for quick lookup
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Build requests array
    const requests: FriendRequest[] = [];
    for (const friendship of data) {
      const requesterId = friendship.requested_by;
      const profile = profileMap.get(requesterId);

      if (profile) {
        requests.push({
          id: friendship.id,
          fromUserId: requesterId,
          fromUsername: profile.username,
          fromDisplayName: profile.display_name,
          fromAvatar: profile.avatar,
          fromPhotoUrl: profile.photo_url,
          createdAt: friendship.created_at
        });
      }
    }

    return requests;
  } catch (error) {
    console.error('Error in getFriendRequests:', error);
    return [];
  }
}

/**
 * Get sent friend requests (pending requests we sent)
 */
export async function getSentFriendRequests(): Promise<Friend[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'pending')
      .eq('requested_by', user.id); // Only requests we sent

    if (error) {
      console.error('Error fetching sent friend requests:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Get all recipient IDs
    const recipientIds = data.map(friendship =>
      friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1
    );

    // Fetch all profiles in a single query
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar, photo_url')
      .in('id', recipientIds);

    if (profilesError) {
      console.error('Error fetching recipient profiles:', profilesError);
      return [];
    }

    if (!profiles) return [];

    // Create a map of userId -> profile for quick lookup
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Build requests array
    const requests: Friend[] = [];
    for (const friendship of data) {
      const recipientId = friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1;
      const profile = profileMap.get(recipientId);

      if (profile) {
        requests.push({
          id: friendship.id,
          userId: recipientId,
          username: profile.username,
          displayName: profile.display_name,
          avatar: profile.avatar,
          photoUrl: profile.photo_url,
          status: 'pending',
          friendshipId: friendship.id,
          requestedBy: friendship.requested_by,
          createdAt: friendship.created_at
        });
      }
    }

    return requests;
  } catch (error) {
    console.error('Error in getSentFriendRequests:', error);
    return [];
  }
}

/**
 * Update user's last seen timestamp for online status tracking
 */
export async function updateUserPresence(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch (error) {
    console.error('Error updating user presence:', error);
  }
}

/**
 * Check if a user is online based on their last_seen_at timestamp
 * A user is considered online if they've been active within the last 5 minutes
 */
export function isUserOnline(lastSeenAt?: string): boolean {
  if (!lastSeenAt) return false;

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  return lastSeen >= fiveMinutesAgo;
}
