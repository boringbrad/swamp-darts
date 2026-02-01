/**
 * Session Stats Utilities
 * Functions for syncing match stats to all session participants
 */

import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Sync stats to all participants in a session
 * This is called after the host completes a game
 */
export async function syncStatsToParticipants(
  sessionId: string,
  matchId: string,
  matchTable: 'cricket_matches' | 'golf_matches'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all authenticated participants (not guests)
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('id, user_id')
      .eq('session_id', sessionId)
      .not('user_id', 'is', null)
      .is('left_at', null);

    if (participantsError) {
      return { success: false, error: participantsError.message };
    }

    if (!participants || participants.length === 0) {
      return { success: true }; // No participants to sync
    }

    // Create session_match_results entries for all participants
    const results = participants.map(p => ({
      session_id: sessionId,
      participant_id: p.id,
      match_table: matchTable,
      match_id: matchId,
    }));

    const { error: insertError } = await supabase
      .from('session_match_results')
      .insert(results);

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to sync stats' };
  }
}

/**
 * Check for unsynced matches for the current user
 * Call this when user comes back online or loads their profile
 */
export async function checkUnsyncedMatches(): Promise<{
  unsyncedCount: number;
  matches: any[];
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { unsyncedCount: 0, matches: [] };
    }

    // Find session_match_results where user was a participant
    const { data: results, error } = await supabase
      .from('session_match_results')
      .select(`
        *,
        participant:session_participants!inner(user_id),
        session:game_sessions(game_mode, host_user_id)
      `)
      .eq('session_participants.user_id', user.id);

    if (error) {
      console.error('Error checking unsynced matches:', error);
      return { unsyncedCount: 0, matches: [] };
    }

    return {
      unsyncedCount: results?.length || 0,
      matches: results || []
    };
  } catch (error) {
    console.error('Unexpected error checking unsynced matches:', error);
    return { unsyncedCount: 0, matches: [] };
  }
}

/**
 * Get session match results for a specific session
 */
export async function getSessionMatchResults(sessionId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('session_match_results')
      .select(`
        *,
        participant:session_participants(
          user_id,
          guest_name,
          profile:profiles(username, display_name)
        )
      `)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error getting session match results:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error getting session match results:', error);
    return [];
  }
}
