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
 * Search for users by username, display name, or email
 */
export async function searchUsers(query: string): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, email, avatar, photo_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', user.id) // Don't include current user
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data || [];
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

    if (!data) return [];

    // Get profile info for each friend
    const friends: Friend[] = [];
    for (const friendship of data) {
      const friendUserId = friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar, photo_url, last_seen_at')
        .eq('id', friendUserId)
        .single();

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

    if (!data) return [];

    // Get profile info for each requester
    const requests: FriendRequest[] = [];
    for (const friendship of data) {
      const requesterId = friendship.requested_by;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar, photo_url')
        .eq('id', requesterId)
        .single();

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

    if (!data) return [];

    // Get profile info for each recipient
    const requests: Friend[] = [];
    for (const friendship of data) {
      const recipientId = friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar, photo_url')
        .eq('id', recipientId)
        .single();

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
