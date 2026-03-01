/**
 * Supabase Sync Utilities
 * Functions for syncing guest players and match data to Supabase
 * Enables admin analytics and cross-device stat syncing
 */

import { createClient } from './supabase/client';
import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from './offlineQueue';

const supabase = createClient();

// ============================================================================
// GUEST PLAYER SYNC
// ============================================================================

export interface GuestPlayerData {
  id: string;
  name: string;
  avatar: string;
  photoUrl?: string;
}

/**
 * Sync a guest player to Supabase
 * Called when a user adds a guest player
 */
export async function syncGuestPlayer(guestData: GuestPlayerData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No authenticated user, skipping guest player sync');
      return;
    }

    const { error } = await supabase
      .from('guest_players')
      .upsert({
        id: guestData.id,
        name: guestData.name,
        avatar: guestData.avatar,
        photo_url: guestData.photoUrl || null,
        added_by_user_id: user.id,
      }, {
        onConflict: 'id',
      });

    if (error) {
      console.error('Error syncing guest player:', error);
    } else {
      console.log('Guest player synced to Supabase:', guestData.name);
    }
  } catch (error) {
    console.error('Unexpected error syncing guest player:', error);
  }
}

/**
 * Load all guest players for current user from Supabase
 */
export async function loadGuestPlayersFromSupabase(): Promise<GuestPlayerData[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('guest_players')
      .select('*')
      .eq('added_by_user_id', user.id);

    if (error) {
      console.error('Error loading guest players:', error);
      return [];
    }

    return (data || []).map(gp => ({
      id: gp.id,
      name: gp.name,
      avatar: gp.avatar,
      photoUrl: gp.photo_url,
    }));
  } catch (error) {
    console.error('Unexpected error loading guest players:', error);
    return [];
  }
}

/**
 * Delete a guest player from Supabase
 */
export async function deleteGuestPlayerFromSupabase(guestId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('guest_players')
      .delete()
      .eq('id', guestId);

    if (error) {
      console.error('Error deleting guest player:', error);
    } else {
      console.log('Guest player deleted from Supabase:', guestId);
    }
  } catch (error) {
    console.error('Unexpected error deleting guest player:', error);
  }
}

// ============================================================================
// CRICKET MATCH SYNC
// ============================================================================

export interface CricketMatchData {
  matchId: string;
  matchData: any; // Full match data object
  players: any[]; // Array of player objects
  gameMode: string; // '301', '501', '701', 'cutthroat', 'tagteam', '4way'
  completedAt?: Date;
  venueId?: string; // Optional venue ID for venue games
  boardId?: string; // Optional board ID for venue games
  participantUserIds?: string[]; // user_ids of verified friends in this match (for stat attribution)
}

/**
 * Sync a cricket match to Supabase
 * Called when a cricket match is completed.
 * If offline or Supabase is unreachable, queues for retry on reconnect.
 * Returns true on success, false on failure.
 */
export async function syncCricketMatch(matchData: CricketMatchData): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue('cricket', matchData.matchId, matchData);
    return false;
  }

  try {
    // getSession() reads from localStorage — no network call needed
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      console.warn('No authenticated user, skipping cricket match sync');
      return false;
    }

    const { error } = await supabase
      .from('cricket_matches')
      .upsert({
        match_id: matchData.matchId,
        user_id: user.id,
        match_data: matchData.matchData,
        players: matchData.players,
        game_mode: matchData.gameMode,
        completed_at: matchData.completedAt || new Date().toISOString(),
        venue_id: matchData.venueId || null,
        board_id: matchData.boardId || null,
        participant_user_ids: matchData.participantUserIds ?? [],
      }, {
        onConflict: 'match_id',
      });

    if (error) {
      console.error('Error syncing cricket match:', error);
      addToSyncQueue('cricket', matchData.matchId, matchData);
      return false;
    }

    // Remove from queue if it was queued from a previous offline session
    removeFromSyncQueue(matchData.matchId);
    console.log('Cricket match synced to Supabase:', matchData.matchId);
    return true;
  } catch (error) {
    console.error('Unexpected error syncing cricket match:', error);
    addToSyncQueue('cricket', matchData.matchId, matchData);
    return false;
  }
}

/**
 * Load all cricket matches for current user from Supabase
 */
export async function loadCricketMatchesFromSupabase(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading cricket matches:', error);
      return [];
    }

    return (data || []).map(m => m.match_data);
  } catch (error) {
    console.error('Unexpected error loading cricket matches:', error);
    return [];
  }
}

// ============================================================================
// GOLF MATCH SYNC
// ============================================================================

export interface GolfMatchData {
  matchId: string;
  matchData: any; // Full match data object
  players: any[]; // Array of player objects
  courseId: string;
  gameMode: string; // 'stroke', 'match', 'stableford'
  completedAt?: Date;
  venueId?: string; // Optional venue ID for venue games
  boardId?: string; // Optional board ID for venue games
  participantUserIds?: string[]; // user_ids of verified friends in this match (for stat attribution)
}

/**
 * Sync a golf match to Supabase
 * Called when a golf match is completed.
 * If offline or Supabase is unreachable, queues for retry on reconnect.
 * Returns true on success, false on failure.
 */
export async function syncGolfMatch(matchData: GolfMatchData): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue('golf', matchData.matchId, matchData);
    return false;
  }

  try {
    // getSession() reads from localStorage — no network call needed
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      console.warn('No authenticated user, skipping golf match sync');
      return false;
    }

    const { error } = await supabase
      .from('golf_matches')
      .upsert({
        match_id: matchData.matchId,
        user_id: user.id,
        match_data: matchData.matchData,
        players: matchData.players,
        course_id: matchData.courseId,
        game_mode: matchData.gameMode,
        completed_at: matchData.completedAt || new Date().toISOString(),
        venue_id: matchData.venueId || null,
        board_id: matchData.boardId || null,
        participant_user_ids: matchData.participantUserIds ?? [],
      }, {
        onConflict: 'match_id',
      });

    if (error) {
      console.error('Error syncing golf match:', error);
      addToSyncQueue('golf', matchData.matchId, matchData);
      return false;
    }

    // Remove from queue if it was queued from a previous offline session
    removeFromSyncQueue(matchData.matchId);
    console.log('Golf match synced to Supabase:', matchData.matchId);
    return true;
  } catch (error) {
    console.error('Unexpected error syncing golf match:', error);
    addToSyncQueue('golf', matchData.matchId, matchData);
    return false;
  }
}

/**
 * Load all golf matches for current user from Supabase
 */
export async function loadGolfMatchesFromSupabase(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('golf_matches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading golf matches:', error);
      return [];
    }

    return (data || []).map(m => m.match_data);
  } catch (error) {
    console.error('Unexpected error loading golf matches:', error);
    return [];
  }
}

// ============================================================================
// SESSION MATCH SYNC
// ============================================================================

/**
 * Create session_match_results for all participants in a session
 * This links the match to each participant so they can see it in their stats
 */
export async function syncSessionMatchResults(
  sessionId: string,
  matchId: string,
  matchTable: 'cricket_matches' | 'golf_matches'
): Promise<void> {
  try {
    // Get all active participants in the session
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('id, user_id')
      .eq('session_id', sessionId)
      .is('left_at', null);

    if (participantsError || !participants) {
      console.error('Error fetching session participants:', participantsError);
      return;
    }

    // Get the original match data
    const { data: matchData, error: matchError } = await supabase
      .from(matchTable)
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (matchError || !matchData) {
      console.error('Error fetching match data:', matchError);
      return;
    }

    console.log(`🎯 Syncing match to ${participants.length} participants...`);

    // For each participant, create a copy of the match in their records
    for (const participant of participants) {
      console.log(`  📝 Processing participant: ${participant.user_id || 'guest'}`);

      // Only sync to authenticated users (skip guests)
      if (!participant.user_id) {
        console.log(`  ⏭️  Skipping guest participant`);
        continue;
      }

      // Create a unique match_id for this participant (prevents conflicts)
      const participantMatchId = `${matchId}-${participant.user_id}`;

      // Build the insert object based on match table type
      const insertData: any = {
        match_id: participantMatchId,
        user_id: participant.user_id,
        match_data: matchData.match_data,
        players: matchData.players,
        game_mode: matchData.game_mode,
        completed_at: matchData.completed_at,
      };

      // Only add course_id for golf matches
      if (matchTable === 'golf_matches' && matchData.course_id) {
        insertData.course_id = matchData.course_id;
      }

      console.log(`  💾 Upserting match for participant ${participant.user_id}...`);

      // Create or update a copy of the match for this participant (use upsert to prevent duplicates)
      const { error: syncError } = await supabase
        .from(matchTable)
        .upsert(insertData, {
          onConflict: 'match_id',
          ignoreDuplicates: false, // Update if exists
        });

      if (syncError) {
        console.error(`  ❌ Error syncing match to participant ${participant.user_id}:`, syncError);
        continue;
      }

      console.log(`  ✓ Match created for participant ${participant.user_id}`);

      // Create session_match_results record linking to the original match_id
      const { error: resultError } = await supabase
        .from('session_match_results')
        .insert({
          session_id: sessionId,
          participant_id: participant.id,
          match_table: matchTable,
          match_id: matchId, // Original match ID for reference
        });

      if (resultError) {
        // If already exists, that's ok - skip silently
        if (resultError.code !== '23505') {
          console.error(`  ❌ Error creating session_match_results for participant ${participant.user_id}:`, resultError);
        } else {
          console.log(`  ✓ Session match result already exists`);
        }
      } else {
        console.log(`  ✓ Session match result created`);
      }
    }

    console.log(`✅ Session match sync complete for ${participants.length} participants`);
  } catch (error) {
    console.error('Unexpected error syncing session match results:', error);
  }
}

/**
 * Create match copies for venue participants who actually played.
 * playerUserIds must contain the Supabase user IDs of the players in the match —
 * only those users get a copy, preventing scores being attributed to bystanders.
 */
export async function syncVenueMatchResults(
  venueId: string,
  matchId: string,
  matchTable: 'cricket_matches' | 'golf_matches',
  playerUserIds: string[],
): Promise<void> {
  if (playerUserIds.length === 0) {
    console.log('⏭️ syncVenueMatchResults: no playerUserIds provided, skipping');
    return;
  }

  try {
    // Only fetch participants who actually played
    const { data: participants, error: participantsError } = await supabase
      .from('venue_participants')
      .select('id, user_id, guest_id')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .in('user_id', playerUserIds);

    if (participantsError || !participants) {
      console.error('Error fetching venue participants:', participantsError);
      return;
    }

    // Get the original match data
    const { data: matchData, error: matchError } = await supabase
      .from(matchTable)
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (matchError || !matchData) {
      console.error('Error fetching match data:', matchError);
      return;
    }

    console.log(`🎯 Syncing match to ${participants.length} players (of ${playerUserIds.length} requested)...`);

    for (const participant of participants) {
      if (!participant.user_id) continue;

      const participantMatchId = `${matchId}-${participant.user_id}`;

      const insertData: any = {
        match_id: participantMatchId,
        user_id: participant.user_id,
        match_data: matchData.match_data,
        players: matchData.players,
        game_mode: matchData.game_mode,
        completed_at: matchData.completed_at,
        venue_id: venueId,
        board_id: matchData.board_id,
      };

      if (matchTable === 'golf_matches' && matchData.course_id) {
        insertData.course_id = matchData.course_id;
      }

      const { error: syncError } = await supabase
        .from(matchTable)
        .upsert(insertData, { onConflict: 'match_id', ignoreDuplicates: false });

      if (syncError) {
        console.error(`  ❌ Error syncing match to ${participant.user_id}:`, syncError);
      } else {
        console.log(`  ✓ Match synced for ${participant.user_id}`);
      }
    }

    console.log(`✅ Venue match sync complete`);
  } catch (error) {
    console.error('Unexpected error syncing venue match results:', error);
  }
}

// ============================================================================
// SYNC STATUS HELPERS
// ============================================================================

/**
 * Check if user is authenticated and can sync data.
 * Uses getSession() (reads localStorage) instead of getUser() (network call)
 * so this is safe to call offline.
 */
export async function canSyncToSupabase(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.user;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// X01 MATCH SYNC
// ============================================================================

/**
 * Sync an x01 match to Supabase.
 * If offline or Supabase is unreachable, queues for retry on reconnect.
 * Returns true on success, false on failure.
 */
export async function syncX01Match(matchId: string, matchData: any): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue('x01', matchId, matchData);
    return false;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      console.warn('No authenticated user, skipping x01 match sync');
      return false;
    }

    const { error } = await supabase
      .from('x01_matches')
      .upsert({
        match_id: matchId,
        user_id: user.id,
        match_data: matchData,
        created_at: matchData.date || new Date().toISOString(),
      }, {
        onConflict: 'match_id',
      });

    if (error) {
      console.error('Error syncing x01 match:', error);
      addToSyncQueue('x01', matchId, matchData);
      return false;
    }

    removeFromSyncQueue(matchId);
    console.log('x01 match synced to Supabase:', matchId);
    return true;
  } catch (error) {
    console.error('Unexpected error syncing x01 match:', error);
    addToSyncQueue('x01', matchId, matchData);
    return false;
  }
}

// ============================================================================
// OFFLINE SYNC FLUSH
// ============================================================================

/**
 * Attempt to sync all queued matches that failed while offline.
 * Should be called when connectivity is restored.
 */
export async function flushSyncQueue(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  console.log(`[flushSyncQueue] Flushing ${queue.length} queued match(es)`);

  for (const item of queue) {
    if (item.type === 'cricket') {
      await syncCricketMatch(item.data);
    } else if (item.type === 'golf') {
      await syncGolfMatch(item.data);
    } else if (item.type === 'x01') {
      await syncX01Match(item.id, item.data);
    }
    // Each sync function handles its own queue membership:
    // success → removeFromSyncQueue, failure → stays in queue (deduped)
  }
}
