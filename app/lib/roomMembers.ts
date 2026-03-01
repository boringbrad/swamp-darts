/**
 * Room Members — Permanent player pool system.
 *
 * Every user has a permanent room_code on their profile.
 * Friends enter the code to join the host's player pool.
 * Either party can remove the membership at any time.
 */

import { createClient } from './supabase/client';

const supabase = createClient();

export interface RoomMember {
  id: string;
  roomOwnerId: string;
  memberUserId: string;
  displayName: string;
  avatar?: string;
  photoUrl?: string;
  joinedAt: string;
}

export interface JoinedRoom {
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatar?: string;
  ownerPhotoUrl?: string;
  joinedAt: string;
}

function rowToMember(row: any): RoomMember {
  return {
    id: row.id,
    roomOwnerId: row.room_owner_id,
    memberUserId: row.member_user_id,
    displayName: row.display_name,
    avatar: row.avatar ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    joinedAt: row.joined_at,
  };
}

/**
 * Get my permanent room code (displayed on Manage Players).
 */
export async function getMyRoomCode(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('room_code')
    .eq('id', user.id)
    .single();

  return data?.room_code ?? null;
}

/**
 * Get all members who have joined MY room (I am the host/owner).
 */
export async function getMyRoomMembers(): Promise<RoomMember[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_owner_id', user.id)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('getMyRoomMembers error:', error.message);
    return [];
  }

  return (data ?? []).map(rowToMember);
}

/**
 * Remove a member from my room (host action).
 */
export async function removeRoomMember(memberUserId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  await supabase
    .from('room_members')
    .delete()
    .eq('room_owner_id', user.id)
    .eq('member_user_id', memberUserId);
}

/**
 * Join someone's room by entering their room code.
 * Returns success/error and the owner's display name on success.
 */
export async function joinRoomByCode(
  code: string,
  memberProfile: { displayName: string; avatar?: string; photoUrl?: string }
): Promise<{ success: boolean; ownerDisplayName?: string; error?: string }> {
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const user = authSession?.user;
  if (!user) return { success: false, error: 'You must be logged in to join a room.' };

  // Look up the profile with that room code
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('room_code', code.toUpperCase().trim())
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Room code not found. Double-check and try again.' };
  }

  if (profile.id === user.id) {
    return { success: false, error: "That's your own room code!" };
  }

  const { error } = await supabase
    .from('room_members')
    .upsert(
      {
        room_owner_id: profile.id,
        member_user_id: user.id,
        display_name: memberProfile.displayName,
        avatar: memberProfile.avatar ?? null,
        photo_url: memberProfile.photoUrl ?? null,
      },
      { onConflict: 'room_owner_id,member_user_id' }
    );

  if (error) {
    console.error('joinRoomByCode error:', error.message);
    return { success: false, error: 'Failed to join. Please try again.' };
  }

  return { success: true, ownerDisplayName: profile.display_name };
}

/**
 * Get all rooms I have joined (where I am the member, not the owner).
 * Used on the Friends page so I can see and leave rooms I joined.
 *
 * Two-step query: room_members.room_owner_id → auth.users (no FK to profiles),
 * so we fetch owner IDs first, then look up profiles separately.
 */
export async function getMyJoinedRooms(): Promise<JoinedRoom[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  // Step 1: get the room owner IDs and join timestamps
  const { data: memberships, error: membErr } = await supabase
    .from('room_members')
    .select('room_owner_id, joined_at')
    .eq('member_user_id', user.id)
    .order('joined_at', { ascending: true });

  if (membErr || !memberships?.length) {
    if (membErr) console.error('getMyJoinedRooms memberships error:', membErr.message);
    return [];
  }

  const ownerIds = memberships.map(m => m.room_owner_id);

  // Step 2: fetch profiles for those owner IDs
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, display_name, avatar, photo_url')
    .in('id', ownerIds);

  if (profErr) {
    console.error('getMyJoinedRooms profiles error:', profErr.message);
  }

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return memberships.map(m => {
    const p = profileMap.get(m.room_owner_id);
    return {
      ownerId: m.room_owner_id,
      ownerDisplayName: p?.display_name ?? 'Unknown',
      ownerAvatar: p?.avatar ?? undefined,
      ownerPhotoUrl: p?.photo_url ?? undefined,
      joinedAt: m.joined_at,
    };
  });
}

/**
 * Leave a room (member removes themselves from someone else's pool).
 */
export async function leaveRoom(roomOwnerId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  await supabase
    .from('room_members')
    .delete()
    .eq('room_owner_id', roomOwnerId)
    .eq('member_user_id', user.id);
}
