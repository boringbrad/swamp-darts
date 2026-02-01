import { createClient } from './supabase/client';

const supabase = createClient();

export interface GameSession {
  id: string;
  roomCode: string;
  hostUserId: string;
  gameMode: string | null;
  status: 'lobby' | 'in_game' | 'completed' | 'expired';
  maxParticipants: number | null;
  gameId: string | null;
  gamesPlayed: number;
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string | null;
  guestName: string | null;
  guestAvatar: string | null;
  isHost: boolean;
  joinedAt: string;
  leftAt: string | null;
  // Joined from profiles
  username?: string;
  displayName?: string;
  avatar?: string;
  photoUrl?: string;
}

/**
 * Create a new game session (no game mode - just a room)
 */
export async function createSession(): Promise<{
  success: boolean;
  session?: GameSession;
  error?: string
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if user already has an active session
    const existingSession = await getUserActiveSession();
    if (existingSession) {
      return { success: false, error: 'You are already in a session. Please leave it first.' };
    }

    // Get user profile to check account type
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single();

    const maxParticipants = profile?.account_type === 'venue' ? null : 4;

    // Generate unique room code
    let roomCode = '';
    let attempts = 0;
    while (attempts < 5) {
      roomCode = generateRoomCode();
      const { data: existing } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (!existing) break;
      attempts++;
    }

    if (attempts >= 5) {
      return { success: false, error: 'Failed to generate unique room code' };
    }

    // Create session
    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({
        room_code: roomCode,
        host_user_id: user.id,
        max_participants: maxParticipants,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Add host as first participant
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: session.id,
        user_id: user.id,
        is_host: true,
      });

    if (participantError) {
      return { success: false, error: participantError.message };
    }

    return { success: true, session: formatSession(session) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to create session' };
  }
}

/**
 * Join an existing session
 */
export async function joinSession(
  roomCode: string,
  guestData?: { name: string; avatar: string }
): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return { success: false, error: 'Session not found' };
    }

    // Validate session is joinable
    const validation = await canJoinSession(session.id);
    if (!validation.canJoin) {
      return { success: false, error: validation.reason };
    }

    // Add participant
    const participantData: any = {
      session_id: session.id,
      is_host: false,
    };

    if (user) {
      participantData.user_id = user.id;

      // Check if user has any participant record (active or left) for this session
      const { data: existingParticipants } = await supabase
        .from('session_participants')
        .select('id, left_at')
        .eq('session_id', session.id)
        .eq('user_id', user.id);

      if (existingParticipants && existingParticipants.length > 0) {
        // If user has active participant record, they're already in the session
        const activeParticipant = existingParticipants.find(p => !p.left_at);
        if (activeParticipant) {
          return { success: true, sessionId: session.id }; // Already joined, return success
        }

        // If user has old participant records (with left_at), reactivate the first one
        const { error: updateError } = await supabase
          .from('session_participants')
          .update({ left_at: null, joined_at: new Date().toISOString() })
          .eq('id', existingParticipants[0].id);

        if (updateError) return { success: false, error: updateError.message };
        return { success: true, sessionId: session.id };
      }
    } else if (guestData) {
      participantData.guest_name = guestData.name;
      participantData.guest_avatar = guestData.avatar;
    } else {
      return { success: false, error: 'Must be authenticated or provide guest data' };
    }

    // No existing participant record, create a new one
    const { error } = await supabase
      .from('session_participants')
      .insert(participantData);

    if (error) return { success: false, error: error.message };

    return { success: true, sessionId: session.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to join session' };
  }
}

/**
 * Leave a session
 */
export async function leaveSession(sessionId: string): Promise<{
  success: boolean;
  error?: string
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Find ALL participant records for this user in this session (handles duplicates)
    const { data: participants } = await supabase
      .from('session_participants')
      .select('*, session:game_sessions(host_user_id, status)')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .is('left_at', null);

    if (!participants || participants.length === 0) {
      // Not in this session - but let's forcefully clear their sessionId anyway
      return { success: true }; // Changed from error to success to allow UI cleanup
    }

    const now = new Date().toISOString();
    const isHost = participants.some(p => p.is_host);

    // Mark ALL participant records for this user in ALL sessions as left (handles duplicates and old sessions)
    // This ensures the user can cleanly create a new session
    const { error } = await supabase
      .from('session_participants')
      .update({ left_at: now })
      .eq('user_id', user.id)
      .is('left_at', null);

    if (error) return { success: false, error: error.message };

    // If host leaves, expire the session and kick all other participants
    const session = Array.isArray(participants[0].session) ? participants[0].session[0] : participants[0].session;
    if (isHost && session?.status === 'lobby') {
      // Mark all OTHER users' participants as left
      await supabase
        .from('session_participants')
        .update({ left_at: now })
        .eq('session_id', sessionId)
        .neq('user_id', user.id)
        .is('left_at', null);

      // Expire the session
      await supabase
        .from('game_sessions')
        .update({ status: 'expired' })
        .eq('id', sessionId);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to leave session' };
  }
}

/**
 * Get session details
 */
export async function getSession(sessionId: string): Promise<GameSession | null> {
  const { data } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  return data ? formatSession(data) : null;
}

/**
 * Get all participants in a session
 */
export async function getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const { data } = await supabase
    .from('session_participants')
    .select(`
      *,
      profile:profiles(username, display_name, avatar, photo_url)
    `)
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });

  if (!data) return [];

  return data.map(p => ({
    id: p.id,
    sessionId: p.session_id,
    userId: p.user_id,
    guestName: p.guest_name,
    guestAvatar: p.guest_avatar,
    isHost: p.is_host,
    joinedAt: p.joined_at,
    leftAt: p.left_at,
    username: p.profile?.username,
    displayName: p.profile?.display_name,
    avatar: p.profile?.avatar,
    photoUrl: p.profile?.photo_url,
  }));
}

/**
 * Check if a session can be joined
 */
export async function canJoinSession(sessionId: string): Promise<{
  canJoin: boolean;
  reason?: string
}> {
  // Check session status
  const { data: session } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return { canJoin: false, reason: 'Session not found' };
  }

  if (session.status !== 'lobby') {
    return { canJoin: false, reason: 'Session has already started' };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { canJoin: false, reason: 'Session has expired' };
  }

  // Check participant limit
  if (session.max_participants) {
    const { count } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .is('left_at', null);

    if (count && count >= session.max_participants) {
      return { canJoin: false, reason: 'Session is full' };
    }
  }

  return { canJoin: true };
}

/**
 * Record that a game was completed in this session
 * Increments games_played counter
 */
export async function recordGamePlayed(sessionId: string): Promise<{
  success: boolean;
  error?: string
}> {
  try {
    const { error } = await supabase.rpc('increment_games_played', {
      p_session_id: sessionId
    });

    if (error) {
      // If RPC doesn't exist, do it manually
      const { data: session } = await supabase
        .from('game_sessions')
        .select('games_played')
        .eq('id', sessionId)
        .single();

      if (session) {
        await supabase
          .from('game_sessions')
          .update({ games_played: (session.games_played || 0) + 1 })
          .eq('id', sessionId);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to record game' };
  }
}

/**
 * Link a completed match to session participants who actually played
 */
export async function linkMatchToSession(
  sessionId: string,
  matchId: string,
  matchTable: 'cricket_matches' | 'golf_matches',
  playerIds: string[] // IDs of players who actually played (user IDs or guest IDs)
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get participants who match the player IDs
    const { data: participants } = await supabase
      .from('session_participants')
      .select('id, user_id, guest_name')
      .eq('session_id', sessionId)
      .is('left_at', null);

    if (!participants) {
      return { success: false, error: 'No participants found' };
    }

    // Create match results for participants who played
    const results = participants
      .filter(p => {
        // Match by user_id or guest_name
        return playerIds.includes(p.user_id || '') || playerIds.includes(p.guest_name || '');
      })
      .map(p => ({
        session_id: sessionId,
        participant_id: p.id,
        match_table: matchTable,
        match_id: matchId,
        player_id: p.user_id || p.guest_name,
        player_name: p.guest_name || undefined,
      }));

    if (results.length > 0) {
      await supabase
        .from('session_match_results')
        .insert(results);
    }

    // Increment games played
    await recordGamePlayed(sessionId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to link match' };
  }
}

/**
 * Validate a room code exists
 */
export async function validateRoomCode(roomCode: string): Promise<{
  valid: boolean;
  sessionId?: string;
  error?: string
}> {
  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, status, expires_at')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (!session) {
    return { valid: false, error: 'Invalid room code' };
  }

  if (session.status !== 'lobby') {
    return { valid: false, error: 'Session has already started' };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { valid: false, error: 'Session has expired' };
  }

  return { valid: true, sessionId: session.id };
}

/**
 * Expire old sessions that have passed their expiration time
 * This is a client-side wrapper for the database function
 */
export async function expireOldSessions(): Promise<void> {
  try {
    // Call the database function to expire old sessions
    await supabase.rpc('expire_old_game_sessions');
  } catch (error) {
    console.error('Failed to expire old sessions:', error);
  }
}

/**
 * Get user's active session (they can only be in one at a time)
 */
export async function getUserActiveSession(): Promise<GameSession | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if user is in any active session (only fetch one, only lobby status)
  const { data: participants } = await supabase
    .from('session_participants')
    .select('session:game_sessions!inner(*)')
    .eq('user_id', user.id)
    .is('left_at', null)
    .eq('session.status', 'lobby')
    .limit(1)
    .maybeSingle();

  if (!participants || !participants.session) return null;

  const session = formatSession(participants.session);

  // Filter out expired sessions in JavaScript
  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return session;
}

/**
 * Leave the user's active session (used for logout cleanup)
 */
export async function leaveActiveSession(): Promise<{
  success: boolean;
  error?: string
}> {
  try {
    const activeSession = await getUserActiveSession();
    if (!activeSession) {
      return { success: true }; // Not in a session, nothing to leave
    }

    return await leaveSession(activeSession.id);
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to leave active session' };
  }
}

// Helper functions

function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatSession(data: any): GameSession {
  return {
    id: data.id,
    roomCode: data.room_code,
    hostUserId: data.host_user_id,
    gameMode: data.game_mode,
    status: data.status,
    maxParticipants: data.max_participants,
    gameId: data.game_id,
    gamesPlayed: data.games_played || 0,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}
