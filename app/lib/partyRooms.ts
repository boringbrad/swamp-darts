import { createClient } from './supabase/client';
import { OnlineGameSettings } from './sessions';

const supabase = createClient();

export interface PartyRoom {
  id: string;
  roomCode: string;
  hostUserId: string;
  status: 'open' | 'closed';
  currentSessionId: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface PartyMember {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  avatar: string;
  photoUrl: string | null;
  isSittingOut: boolean;
  joinedAt: string;
  leftAt: string | null;
}

function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatRoom(r: any): PartyRoom {
  return {
    id: r.id,
    roomCode: r.room_code,
    hostUserId: r.host_user_id,
    status: r.status,
    currentSessionId: r.current_session_id ?? null,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

function formatMember(m: any): PartyMember {
  return {
    id: m.id,
    roomId: m.room_id,
    userId: m.user_id,
    displayName: m.display_name,
    avatar: m.avatar || 'avatar-1',
    photoUrl: m.photo_url ?? null,
    isSittingOut: m.is_sitting_out ?? false,
    joinedAt: m.joined_at,
    leftAt: m.left_at ?? null,
  };
}

/**
 * Create a new party room and join as host.
 */
export async function createPartyRoom(): Promise<{
  success: boolean;
  room?: PartyRoom;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar, photo_url')
      .eq('id', user.id)
      .single();

    const roomCode = generateRoomCode();

    const { data: room, error } = await supabase
      .from('party_rooms')
      .insert({ room_code: roomCode, host_user_id: user.id })
      .select()
      .single();

    if (error || !room) return { success: false, error: error?.message || 'Failed to create room' };

    // Host joins as first member
    const { error: memberError } = await supabase
      .from('party_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        display_name: profile?.display_name || 'Host',
        avatar: profile?.avatar || 'avatar-1',
        photo_url: profile?.photo_url || null,
      });

    if (memberError) return { success: false, error: memberError.message };

    return { success: true, room: formatRoom(room) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create party room' };
  }
}

/**
 * Join an existing party room by room code.
 */
export async function joinPartyRoom(roomCode: string): Promise<{
  success: boolean;
  roomId?: string;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: room } = await supabase
      .from('party_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase().trim())
      .eq('status', 'open')
      .maybeSingle();

    if (!room) return { success: false, error: 'Room not found or already closed' };
    if (new Date(room.expires_at) < new Date()) return { success: false, error: 'Room has expired' };

    // Check capacity (max 4 active members)
    const { data: activeMembers } = await supabase
      .from('party_members')
      .select('id, user_id')
      .eq('room_id', room.id)
      .is('left_at', null);

    const count = activeMembers?.length ?? 0;

    // Already a member?
    const existing = activeMembers?.find(m => m.user_id === user.id);
    if (existing) return { success: true, roomId: room.id };

    if (count >= 4) return { success: false, error: 'Room is full (4/4)' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar, photo_url')
      .eq('id', user.id)
      .single();

    // Check if user has an old left record and reactivate it
    const { data: oldRecord } = await supabase
      .from('party_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .not('left_at', 'is', null)
      .maybeSingle();

    if (oldRecord) {
      await supabase
        .from('party_members')
        .update({ left_at: null, joined_at: new Date().toISOString() })
        .eq('id', oldRecord.id);
    } else {
      const { error } = await supabase
        .from('party_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          display_name: profile?.display_name || 'Player',
          avatar: profile?.avatar || 'avatar-1',
          photo_url: profile?.photo_url || null,
        });
      if (error) return { success: false, error: error.message };
    }

    return { success: true, roomId: room.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to join party room' };
  }
}

/**
 * Leave a party room. If the host leaves, the room is closed.
 */
export async function leavePartyRoom(roomId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date().toISOString();

  await supabase
    .from('party_members')
    .update({ left_at: now })
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .is('left_at', null);

  // Check if this user is the host — if so, close the room
  const { data: room } = await supabase
    .from('party_rooms')
    .select('host_user_id')
    .eq('id', roomId)
    .maybeSingle();

  if (room?.host_user_id === user.id) {
    // Mark all other members as left and close the room
    await supabase
      .from('party_members')
      .update({ left_at: now })
      .eq('room_id', roomId)
      .is('left_at', null);

    await supabase
      .from('party_rooms')
      .update({ status: 'closed' })
      .eq('id', roomId);
  }
}

/**
 * Host kicks a member from the party room.
 */
export async function kickPartyMember(roomId: string, userId: string): Promise<void> {
  await supabase
    .from('party_members')
    .update({ left_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('left_at', null);
}

/**
 * Toggle a member's sitting-out status.
 */
export async function setSittingOut(roomId: string, userId: string, sittingOut: boolean): Promise<void> {
  await supabase
    .from('party_members')
    .update({ is_sitting_out: sittingOut })
    .eq('room_id', roomId)
    .eq('user_id', userId);
}

/**
 * Host starts a game within the party room.
 * Creates a game_sessions row for the two active players.
 * Returns the new session id.
 */
export async function startPartyGame(
  roomId: string,
  settings: OnlineGameSettings,
  hostPlayerId: string,
  guestPlayerId: string,
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Generate unique room code for the session
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let roomCode = '';
    for (let i = 0; i < 6; i++) roomCode += chars[Math.floor(Math.random() * chars.length)];

    // Embed partyRoomId so game page can navigate back after game ends
    const gameSettings: OnlineGameSettings & { partyRoomId: string } = {
      ...settings,
      partyRoomId: roomId,
    };

    // host_user_id must always be auth.uid() to satisfy RLS INSERT policy.
    // The actual "player 1" slot is tracked via session_participants.
    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({
        room_code: roomCode,
        host_user_id: user.id,
        game_mode: settings.gameType,
        max_participants: 2,
        game_settings: gameSettings,
        status: 'in_game',
      })
      .select()
      .single();

    if (error || !session) return { success: false, error: error?.message || 'Failed to create game' };

    // Add both participants
    await supabase.from('session_participants').insert([
      { session_id: session.id, user_id: hostPlayerId, is_host: true },
      { session_id: session.id, user_id: guestPlayerId, is_host: false },
    ]);

    // Update party room to point at this session
    await supabase
      .from('party_rooms')
      .update({ current_session_id: session.id })
      .eq('id', roomId);

    return { success: true, sessionId: session.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to start game' };
  }
}

/**
 * Clear current_session_id on the party room (called after a game completes).
 */
export async function clearPartyGameSession(roomId: string): Promise<void> {
  await supabase
    .from('party_rooms')
    .update({ current_session_id: null })
    .eq('id', roomId);
}

/**
 * Load a party room by ID.
 */
export async function getPartyRoom(roomId: string): Promise<PartyRoom | null> {
  const { data } = await supabase
    .from('party_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  return data ? formatRoom(data) : null;
}

/**
 * Load active members of a party room.
 */
export async function getPartyMembers(roomId: string): Promise<PartyMember[]> {
  const { data } = await supabase
    .from('party_members')
    .select('*')
    .eq('room_id', roomId)
    .is('left_at', null)
    .order('joined_at', { ascending: true });
  return (data || []).map(formatMember);
}
