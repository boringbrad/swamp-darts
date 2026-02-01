/**
 * Venue Management Functions
 * Handles venue setup, room codes, boards, and participant management
 */

import { createClient } from './supabase/client';

const supabase = createClient();

// ============================================================================
// Types
// ============================================================================

export interface VenueBoard {
  id: string;
  venueId: string;
  boardName: string;
  boardOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface VenueParticipant {
  id: string;
  venueId: string;
  userId?: string;
  guestId?: string;
  joinedAt: string;
  lastSeenAt: string;
  isActive: boolean;
  // Joined user profile data
  username?: string;
  displayName?: string;
  avatar?: string;
  photoUrl?: string;
  // OR joined guest data
  guestName?: string;
  guestAvatar?: string;
  guestPhotoUrl?: string;
}

export interface VenueGuest {
  id: string;
  venueId: string;
  guestName: string;
  avatar: string;
  photoUrl?: string;
  totalGames: number;
  createdAt: string;
  updatedAt: string;
}

export interface VenueInfo {
  id: string;
  venueName: string;
  roomCode: string;
  qrData: string;
  boards: VenueBoard[];
}

// ============================================================================
// Venue Setup
// ============================================================================

/**
 * Request venue status for current user
 * Generates room code, creates default board, sets up venue
 */
export async function requestVenueStatus(venueName: string): Promise<{ success: boolean; error?: string; roomCode?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Generate room code using database function
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_venue_room_code');

    if (codeError || !codeData) {
      console.error('Error generating room code:', codeError);
      return { success: false, error: 'Failed to generate room code' };
    }

    const roomCode = codeData;

    // Generate QR data (JSON format)
    const qrData = JSON.stringify({
      type: 'venue_join',
      venueId: user.id,
      roomCode,
      venueName,
    });

    // Update profile to venue account
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        account_type: 'venue',
        venue_name: venueName,
        venue_room_code: roomCode,
        venue_qr_data: qrData,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return { success: false, error: 'Failed to update profile' };
    }

    // Create default board
    const { error: boardError } = await supabase
      .from('venue_boards')
      .insert({
        venue_id: user.id,
        board_name: 'Board 1',
        board_order: 0,
        is_active: true,
      });

    if (boardError) {
      console.error('Error creating default board:', boardError);
      return { success: false, error: 'Failed to create default board' };
    }

    return { success: true, roomCode };
  } catch (error) {
    console.error('Unexpected error requesting venue status:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get venue information for current user
 */
export async function getVenueInfo(): Promise<VenueInfo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, venue_name, venue_room_code, venue_qr_data')
      .eq('id', user.id)
      .eq('account_type', 'venue')
      .single();

    if (profileError || !profile || !profile.venue_name) {
      return null;
    }

    // Get boards
    const { data: boards, error: boardsError } = await supabase
      .from('venue_boards')
      .select('*')
      .eq('venue_id', user.id)
      .order('board_order', { ascending: true });

    if (boardsError) {
      console.error('Error loading boards:', boardsError);
      return null;
    }

    return {
      id: profile.id,
      venueName: profile.venue_name,
      roomCode: profile.venue_room_code,
      qrData: profile.venue_qr_data,
      boards: (boards || []).map(b => ({
        id: b.id,
        venueId: b.venue_id,
        boardName: b.board_name,
        boardOrder: b.board_order,
        isActive: b.is_active,
        createdAt: b.created_at,
      })),
    };
  } catch (error) {
    console.error('Error getting venue info:', error);
    return null;
  }
}

/**
 * Update venue name
 */
export async function updateVenueName(venueName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ venue_name: venueName })
      .eq('id', user.id)
      .eq('account_type', 'venue');

    if (error) {
      console.error('Error updating venue name:', error);
      return { success: false, error: 'Failed to update venue name' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating venue name:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Regenerate room code (admin action)
 */
export async function regenerateRoomCode(): Promise<{ success: boolean; error?: string; roomCode?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get current venue info
    const venueInfo = await getVenueInfo();
    if (!venueInfo) {
      return { success: false, error: 'Not a venue account' };
    }

    // Generate new room code
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_venue_room_code');

    if (codeError || !codeData) {
      return { success: false, error: 'Failed to generate room code' };
    }

    const roomCode = codeData;

    // Generate new QR data
    const qrData = JSON.stringify({
      type: 'venue_join',
      venueId: user.id,
      roomCode,
      venueName: venueInfo.venueName,
    });

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        venue_room_code: roomCode,
        venue_qr_data: qrData,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating room code:', updateError);
      return { success: false, error: 'Failed to update room code' };
    }

    return { success: true, roomCode };
  } catch (error) {
    console.error('Unexpected error regenerating room code:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// ============================================================================
// Board Management
// ============================================================================

/**
 * Create a new board for the venue
 */
export async function createBoard(venueId: string, boardName: string): Promise<{ success: boolean; error?: string; board?: VenueBoard }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Use provided venueId or fallback to authenticated user's id
    const targetVenueId = venueId || user.id;

    // Get current max board order
    const { data: boards } = await supabase
      .from('venue_boards')
      .select('board_order')
      .eq('venue_id', targetVenueId)
      .order('board_order', { ascending: false })
      .limit(1);

    const maxOrder = boards && boards.length > 0 ? boards[0].board_order : -1;

    // Create new board
    const { data, error } = await supabase
      .from('venue_boards')
      .insert({
        venue_id: targetVenueId,
        board_name: boardName,
        board_order: maxOrder + 1,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      return { success: false, error: 'Failed to create board' };
    }

    return {
      success: true,
      board: {
        id: data.id,
        venueId: data.venue_id,
        boardName: data.board_name,
        boardOrder: data.board_order,
        isActive: data.is_active,
        createdAt: data.created_at,
      },
    };
  } catch (error) {
    console.error('Unexpected error creating board:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Update board name
 */
export async function updateBoard(boardId: string, boardName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('venue_boards')
      .update({ board_name: boardName })
      .eq('id', boardId)
      .eq('venue_id', user.id);

    if (error) {
      console.error('Error updating board:', error);
      return { success: false, error: 'Failed to update board' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating board:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Delete a board
 */
export async function deleteBoard(boardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('venue_boards')
      .delete()
      .eq('id', boardId)
      .eq('venue_id', user.id);

    if (error) {
      console.error('Error deleting board:', error);
      return { success: false, error: 'Failed to delete board' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting board:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Find or create a board by name for a venue
 * Used for auto-assigning boards based on course names in golf
 */
export async function findOrCreateBoardByName(venueId: string, boardName: string): Promise<{ success: boolean; error?: string; boardId?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Use provided venueId or fallback to authenticated user's id
    const targetVenueId = venueId || user.id;

    // First, try to find an existing board with this name
    const { data: existingBoards, error: searchError } = await supabase
      .from('venue_boards')
      .select('id')
      .eq('venue_id', targetVenueId)
      .eq('board_name', boardName)
      .eq('is_active', true)
      .limit(1);

    if (searchError) {
      console.error('Error searching for board:', searchError);
      return { success: false, error: 'Failed to search for board' };
    }

    // If board exists, return its ID
    if (existingBoards && existingBoards.length > 0) {
      console.log(`Found existing board "${boardName}" with ID:`, existingBoards[0].id);
      return { success: true, boardId: existingBoards[0].id };
    }

    // Board doesn't exist, create it
    console.log(`Creating new board "${boardName}" for venue:`, targetVenueId);
    const createResult = await createBoard(targetVenueId, boardName);

    if (!createResult.success || !createResult.board) {
      return { success: false, error: createResult.error || 'Failed to create board' };
    }

    console.log(`Created new board "${boardName}" with ID:`, createResult.board.id);
    return { success: true, boardId: createResult.board.id };
  } catch (error) {
    console.error('Unexpected error finding or creating board:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// ============================================================================
// Participant Management
// ============================================================================

/**
 * Join a venue using room code
 */
export async function joinVenue(roomCode: string): Promise<{ success: boolean; error?: string; venueId?: string }> {
  try {
    console.log('[joinVenue] Starting join process with room code:', roomCode);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[joinVenue] User not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    console.log('[joinVenue] User authenticated:', user.id);

    // Find venue by room code
    const { data: venue, error: venueError } = await supabase
      .from('profiles')
      .select('id, venue_name')
      .eq('venue_room_code', roomCode)
      .eq('account_type', 'venue')
      .single();

    if (venueError || !venue) {
      console.log('[joinVenue] Venue not found or error:', venueError);
      return { success: false, error: 'Invalid room code' };
    }

    console.log('[joinVenue] Found venue:', venue.id, venue.venue_name);

    // Add user to venue participants
    const { data: participantData, error: joinError } = await supabase
      .from('venue_participants')
      .upsert({
        venue_id: venue.id,
        user_id: user.id,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'venue_id,user_id',
      })
      .select();

    if (joinError) {
      console.error('[joinVenue] Error joining venue:', joinError);
      return { success: false, error: 'Failed to join venue' };
    }

    console.log('[joinVenue] Successfully joined venue. Participant data:', participantData);

    return { success: true, venueId: venue.id };
  } catch (error) {
    console.error('[joinVenue] Unexpected error joining venue:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Leave a venue
 */
export async function leaveVenue(venueId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Set participant as inactive (don't delete for history)
    const { error } = await supabase
      .from('venue_participants')
      .update({ is_active: false })
      .eq('venue_id', venueId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving venue:', error);
      return { success: false, error: 'Failed to leave venue' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error leaving venue:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Remove a participant from venue (venue owner only)
 */
export async function removeParticipant(participantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Set participant as inactive
    const { error } = await supabase
      .from('venue_participants')
      .update({ is_active: false })
      .eq('id', participantId);

    if (error) {
      console.error('Error removing participant:', error);
      return { success: false, error: 'Failed to remove participant' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error removing participant:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Remove all authenticated participants from venue (for venue mode exit)
 * Keeps guests active since they're venue-specific
 */
export async function removeAllAuthenticatedParticipants(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log('[removeAllAuthenticatedParticipants] Removing all authenticated participants for venue:', user.id);

    // Set all authenticated participants as inactive (keep guests)
    const { error } = await supabase
      .from('venue_participants')
      .update({ is_active: false })
      .eq('venue_id', user.id)
      .not('user_id', 'is', null); // Only update participants with user_id (authenticated users)

    if (error) {
      console.error('Error removing authenticated participants:', error);
      return { success: false, error: 'Failed to remove participants' };
    }

    console.log('[removeAllAuthenticatedParticipants] Successfully removed all authenticated participants');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error removing authenticated participants:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get all participants for a venue
 */
export async function getVenueParticipants(venueId: string): Promise<VenueParticipant[]> {
  try {
    console.log('[getVenueParticipants] Fetching participants for venue ID:', venueId);

    // First, get basic participant data
    const { data, error } = await supabase
      .from('venue_participants')
      .select('*')
      .eq('venue_id', venueId)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('[getVenueParticipants] Error loading participants:', error);
      return [];
    }

    console.log('[getVenueParticipants] Raw participant data:', data);

    if (!data || data.length === 0) {
      console.log('[getVenueParticipants] No participants found');
      return [];
    }

    // Fetch user profiles for authenticated participants
    const userIds = data.filter(p => p.user_id).map(p => p.user_id);
    let profileMap = new Map();

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar, photo_url')
        .in('id', userIds);

      if (profileError) {
        console.error('[getVenueParticipants] Error fetching profiles:', profileError);
      } else {
        console.log('[getVenueParticipants] Fetched profiles:', profiles);
        profileMap = new Map((profiles || []).map(p => [p.id, p]));
      }
    }

    // Fetch guest profiles for guest participants
    const guestIds = data.filter(p => p.guest_id).map(p => p.guest_id);
    let guestMap = new Map();

    if (guestIds.length > 0) {
      const { data: guests, error: guestError } = await supabase
        .from('venue_guests')
        .select('id, guest_name, avatar, photo_url')
        .in('id', guestIds);

      if (guestError) {
        console.error('[getVenueParticipants] Error fetching guests:', guestError);
      } else {
        console.log('[getVenueParticipants] Fetched guests:', guests);
        guestMap = new Map((guests || []).map(g => [g.id, g]));
      }
    }

    // Map the data together
    const result = data.map(p => {
      const profile = p.user_id ? profileMap.get(p.user_id) : null;
      const guest = p.guest_id ? guestMap.get(p.guest_id) : null;

      return {
        id: p.id,
        venueId: p.venue_id,
        userId: p.user_id,
        guestId: p.guest_id,
        joinedAt: p.joined_at,
        lastSeenAt: p.last_seen_at,
        isActive: p.is_active,
        // User profile data
        username: profile?.username,
        displayName: profile?.display_name,
        avatar: profile?.avatar,
        photoUrl: profile?.photo_url,
        // Guest data
        guestName: guest?.guest_name,
        guestAvatar: guest?.avatar,
        guestPhotoUrl: guest?.photo_url,
      };
    });

    console.log('[getVenueParticipants] Final result:', result);
    return result;
  } catch (error) {
    console.error('[getVenueParticipants] Unexpected error:', error);
    return [];
  }
}

// ============================================================================
// Guest Management
// ============================================================================

/**
 * Create a guest player for the venue
 */
export async function createVenueGuest(venueId: string, guestName: string, avatar: string = 'avatar-1', photoUrl?: string): Promise<{ success: boolean; error?: string; guest?: VenueGuest }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Use provided venueId or fallback to authenticated user's id
    const targetVenueId = venueId || user.id;

    // Create guest
    const { data: guestData, error: guestError } = await supabase
      .from('venue_guests')
      .insert({
        venue_id: targetVenueId,
        guest_name: guestName,
        avatar,
        photo_url: photoUrl,
        total_games: 0,
      })
      .select()
      .single();

    if (guestError) {
      console.error('Error creating guest:', guestError);
      return { success: false, error: 'Failed to create guest' };
    }

    // Add guest to venue participants
    const { error: participantError } = await supabase
      .from('venue_participants')
      .insert({
        venue_id: targetVenueId,
        guest_id: guestData.id,
        is_active: true,
      });

    if (participantError) {
      console.error('Error adding guest to participants:', participantError);
      return { success: false, error: 'Failed to add guest to participants' };
    }

    return {
      success: true,
      guest: {
        id: guestData.id,
        venueId: guestData.venue_id,
        guestName: guestData.guest_name,
        avatar: guestData.avatar,
        photoUrl: guestData.photo_url,
        totalGames: guestData.total_games,
        createdAt: guestData.created_at,
        updatedAt: guestData.updated_at,
      },
    };
  } catch (error) {
    console.error('Unexpected error creating guest:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Update a venue guest
 */
export async function updateVenueGuest(guestId: string, guestName: string, avatar: string, photoUrl?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const updateData: any = {
      guest_name: guestName,
      avatar,
      updated_at: new Date().toISOString(),
    };

    // Only include photo_url if provided (allows keeping existing photo)
    if (photoUrl !== undefined) {
      updateData.photo_url = photoUrl;
    }

    const { error } = await supabase
      .from('venue_guests')
      .update(updateData)
      .eq('id', guestId)
      .eq('venue_id', user.id);

    if (error) {
      console.error('Error updating guest:', error);
      return { success: false, error: 'Failed to update guest' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating guest:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Delete a venue guest
 */
export async function deleteVenueGuest(guestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Delete guest (will cascade delete participant record)
    const { error } = await supabase
      .from('venue_guests')
      .delete()
      .eq('id', guestId)
      .eq('venue_id', user.id);

    if (error) {
      console.error('Error deleting guest:', error);
      return { success: false, error: 'Failed to delete guest' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting guest:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get all guests for a venue
 */
export async function getVenueGuests(): Promise<VenueGuest[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('venue_guests')
      .select('*')
      .eq('venue_id', user.id)
      .order('total_games', { ascending: false });

    if (error) {
      console.error('Error loading venue guests:', error);
      return [];
    }

    return (data || []).map(g => ({
      id: g.id,
      venueId: g.venue_id,
      guestName: g.guest_name,
      avatar: g.avatar,
      photoUrl: g.photo_url,
      totalGames: g.total_games,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }));
  } catch (error) {
    console.error('Error loading venue guests:', error);
    return [];
  }
}

// ============================================================================
// Venue Lookup (for joining)
// ============================================================================

/**
 * Get current user's active venue participation
 */
export async function getCurrentVenueParticipation(): Promise<{ id: string; venueName: string; roomCode: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('venue_participants')
      .select(`
        venue_id,
        venue:profiles!venue_participants_venue_id_fkey(venue_name, venue_room_code)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !data || !data.venue) {
      return null;
    }

    return {
      id: data.venue_id,
      venueName: (data.venue as any).venue_name,
      roomCode: (data.venue as any).venue_room_code,
    };
  } catch (error) {
    console.error('Error getting current venue participation:', error);
    return null;
  }
}

/**
 * Get venue info by room code (for joining)
 */
export async function getVenueByRoomCode(roomCode: string): Promise<{ id: string; venueName: string } | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, venue_name')
      .eq('venue_room_code', roomCode)
      .eq('account_type', 'venue')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      venueName: data.venue_name,
    };
  } catch (error) {
    console.error('Error looking up venue:', error);
    return null;
  }
}
