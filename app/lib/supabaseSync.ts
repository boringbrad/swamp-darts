/**
 * Supabase Sync Utilities
 * Functions for syncing guest players and match data to Supabase
 * Enables admin analytics and cross-device stat syncing
 */

import { createClient } from './supabase/client';

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
}

/**
 * Sync a cricket match to Supabase
 * Called when a cricket match is completed
 */
export async function syncCricketMatch(matchData: CricketMatchData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No authenticated user, skipping cricket match sync');
      return;
    }

    // Save the match
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
      }, {
        onConflict: 'match_id',
      });

    if (error) {
      console.error('Error syncing cricket match:', error);
      return;
    }

    console.log('Cricket match synced to Supabase:', matchData.matchId);
  } catch (error) {
    console.error('Unexpected error syncing cricket match:', error);
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
}

/**
 * Sync a golf match to Supabase
 * Called when a golf match is completed
 */
export async function syncGolfMatch(matchData: GolfMatchData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No authenticated user, skipping golf match sync');
      return;
    }

    // Save the match
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
      }, {
        onConflict: 'match_id',
      });

    if (error) {
      console.error('Error syncing golf match:', error);
      return;
    }

    console.log('Golf match synced to Supabase:', matchData.matchId);
  } catch (error) {
    console.error('Unexpected error syncing golf match:', error);
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
 * Create match copies for all participants in a venue
 * This ensures each venue participant gets the match in their stats
 */
export async function syncVenueMatchResults(
  venueId: string,
  matchId: string,
  matchTable: 'cricket_matches' | 'golf_matches'
): Promise<void> {
  try {
    // Get all active participants in the venue
    const { data: participants, error: participantsError } = await supabase
      .from('venue_participants')
      .select('id, user_id, guest_id')
      .eq('venue_id', venueId)
      .eq('is_active', true);

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

    console.log(`🎯 Syncing match to ${participants.length} venue participants...`);

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
        venue_id: venueId,
        board_id: matchData.board_id,
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
    }

    console.log(`✅ Venue match sync complete for ${participants.length} participants`);
  } catch (error) {
    console.error('Unexpected error syncing venue match results:', error);
  }
}

// ============================================================================
// SYNC STATUS HELPERS
// ============================================================================

/**
 * Check if user is authenticated and can sync data
 */
export async function canSyncToSupabase(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    return false;
  }
}
