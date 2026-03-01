/**
 * Player Session utilities
 * Manages "game night" sessions: host opens one, friends join from their Friends page.
 */

import { createClient } from './supabase/client';

const supabase = createClient();

export interface PlayerSessionInfo {
  id: string;
  hostUserId: string;
  hostProfile: { displayName?: string; avatar?: string; photoUrl?: string };
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  avatar?: string;
  photoUrl?: string;
  joinedAt: string;
}

/**
 * Create a new open game night session (as host).
 * Closes any previous open session first.
 */
export async function createPlayerSession(
  hostProfile: { displayName?: string; avatar?: string; photoUrl?: string }
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // Close any existing open sessions so there's only ever one active
  await supabase
    .from('player_sessions')
    .update({ status: 'closed' })
    .eq('host_user_id', session.user.id)
    .eq('status', 'open');

  const { data, error } = await supabase
    .from('player_sessions')
    .insert({ host_user_id: session.user.id, host_profile: hostProfile })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating player session:', error);
    return null;
  }
  return data.id;
}

/**
 * Close a game night session (as host).
 */
export async function closePlayerSession(sessionId: string): Promise<void> {
  await supabase
    .from('player_sessions')
    .update({ status: 'closed' })
    .eq('id', sessionId);
}

/**
 * Get the current active session for the logged-in user (as host).
 */
export async function getMyActiveSession(): Promise<PlayerSessionInfo | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('player_sessions')
    .select('*')
    .eq('host_user_id', session.user.id)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    hostUserId: data.host_user_id,
    hostProfile: data.host_profile || {},
    status: data.status,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

/**
 * Get all participants in a session.
 */
export async function getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const { data, error } = await supabase
    .from('player_session_participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });

  if (error || !data) return [];

  return data.map(p => ({
    id: p.id,
    sessionId: p.session_id,
    userId: p.user_id,
    displayName: p.display_name,
    avatar: p.avatar,
    photoUrl: p.photo_url,
    joinedAt: p.joined_at,
  }));
}

/**
 * Remove a specific participant from a session (host action).
 */
export async function removeParticipant(sessionId: string, participantUserId: string): Promise<void> {
  await supabase
    .from('player_session_participants')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', participantUserId);
}

/**
 * Get open sessions hosted by friends.
 * Pass the list of friend user IDs from getFriends().
 */
export async function getFriendSessions(friendUserIds: string[]): Promise<PlayerSessionInfo[]> {
  if (friendUserIds.length === 0) return [];

  const { data, error } = await supabase
    .from('player_sessions')
    .select('*')
    .in('host_user_id', friendUserIds)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString());

  if (error || !data) return [];

  return data.map(s => ({
    id: s.id,
    hostUserId: s.host_user_id,
    hostProfile: s.host_profile || {},
    status: s.status,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
  }));
}

/**
 * Join a game night session as a participant.
 */
export async function joinPlayerSession(
  sessionId: string,
  profile: { displayName: string; avatar?: string; photoUrl?: string }
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { error } = await supabase
    .from('player_session_participants')
    .upsert({
      session_id: sessionId,
      user_id: session.user.id,
      display_name: profile.displayName,
      avatar: profile.avatar,
      photo_url: profile.photoUrl,
    }, { onConflict: 'session_id,user_id' });

  if (error) {
    console.error('Error joining session:', error);
    return false;
  }
  return true;
}

/**
 * Leave a game night session.
 */
export async function leavePlayerSession(sessionId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase
    .from('player_session_participants')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', session.user.id);
}

/**
 * Check which (if any) of the given session IDs the current user has joined.
 * Returns the session_id or null.
 */
export async function getMyJoinedSessionId(sessionIds: string[]): Promise<string | null> {
  if (sessionIds.length === 0) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from('player_session_participants')
    .select('session_id')
    .eq('user_id', session.user.id)
    .in('session_id', sessionIds)
    .maybeSingle();

  return data?.session_id ?? null;
}
