/**
 * Venue System Hooks
 * Real-time hooks for venue management, participants, and boards
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import {
  getVenueInfo,
  getVenueParticipants,
  removeAllAuthenticatedParticipants,
  VenueInfo,
  VenueParticipant,
  VenueBoard,
  VenueGuest,
} from '../lib/venue';

const supabase = createClient();

// ============================================================================
// VENUE MODE MANAGEMENT (localStorage-based, per-device)
// ============================================================================

const VENUE_MODE_KEY = 'swamp_darts_venue_mode';
const VENUE_MODE_CHANGE_EVENT = 'venue_mode_change';

/**
 * Hook to manage venue mode on this device
 * Venue mode is per-device, stored in localStorage
 */
export function useVenueMode() {
  const [venueMode, setVenueModeState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load venue mode from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VENUE_MODE_KEY);
      setVenueModeState(stored === 'true');
    } catch (error) {
      console.error('Error loading venue mode:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for venue mode changes from other components
  useEffect(() => {
    const handleVenueModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      console.log('[useVenueMode] Received venue mode change event:', customEvent.detail);
      setVenueModeState(customEvent.detail);
    };

    window.addEventListener(VENUE_MODE_CHANGE_EVENT, handleVenueModeChange);

    return () => {
      window.removeEventListener(VENUE_MODE_CHANGE_EVENT, handleVenueModeChange);
    };
  }, []);

  const setVenueMode = useCallback(async (enabled: boolean) => {
    try {
      // Update state immediately for instant UI feedback
      localStorage.setItem(VENUE_MODE_KEY, enabled.toString());
      setVenueModeState(enabled);

      // Broadcast change to all components using useVenueMode
      const event = new CustomEvent(VENUE_MODE_CHANGE_EVENT, { detail: enabled });
      window.dispatchEvent(event);
      console.log('[setVenueMode] Dispatched venue mode change event:', enabled);

      // If disabling venue mode, remove all authenticated participants in background
      if (!enabled) {
        console.log('[setVenueMode] Venue mode being disabled, removing all authenticated participants');
        removeAllAuthenticatedParticipants().then(result => {
          if (!result.success) {
            console.error('[setVenueMode] Failed to remove participants:', result.error);
          }
        });
      }
    } catch (error) {
      console.error('Error saving venue mode:', error);
    }
  }, []);

  const toggleVenueMode = useCallback(() => {
    setVenueMode(!venueMode);
  }, [venueMode, setVenueMode]);

  return {
    venueMode,
    setVenueMode,
    toggleVenueMode,
    isLoading,
  };
}

// ============================================================================
// VENUE INFO HOOK
// ============================================================================

/**
 * Hook to get current user's venue information
 * Includes venue details and all boards
 */
export function useVenueInfo() {
  const [venueInfo, setVenueInfo] = useState<VenueInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await getVenueInfo();
      setVenueInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setVenueInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time updates for boards
  useEffect(() => {
    if (!venueInfo?.id) return;

    const channel = supabase
      .channel(`venue-boards:${venueInfo.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_boards',
          filter: `venue_id=eq.${venueInfo.id}`,
        },
        () => {
          // Refresh venue info when boards change
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueInfo?.id, refresh]);

  return {
    venueInfo,
    isLoading,
    error,
    refresh,
    isVenue: !!venueInfo,
  };
}

// ============================================================================
// VENUE PARTICIPANTS HOOK (Universal Player Pool)
// ============================================================================

/**
 * Hook to get all participants for a venue with real-time updates
 * This is the universal player pool that works across all boards
 */
export function useVenueParticipants(venueId: string | null) {
  const [participants, setParticipants] = useState<VenueParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    console.log('[useVenueParticipants] refresh called with venueId:', venueId);

    if (!venueId) {
      console.log('[useVenueParticipants] venueId is null/undefined, skipping query');
      setParticipants([]);
      setIsLoading(false);
      return;
    }

    console.log('[useVenueParticipants] Calling getVenueParticipants with venueId:', venueId);
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVenueParticipants(venueId);
      console.log('[useVenueParticipants] Got data:', data);
      console.log('[useVenueParticipants] Setting participants state to:', data.length, 'participants');
      setParticipants(data);
      console.log('[useVenueParticipants] Participants state updated');
    } catch (err) {
      console.error('[useVenueParticipants] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setParticipants([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  // Load on mount and when venueId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!venueId) return;

    console.log('[useVenueParticipants] Setting up realtime subscription for venue:', venueId);

    const channel = supabase
      .channel(`venue-participants:${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_participants',
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          console.log('[useVenueParticipants] Received realtime update:', payload);
          // Refresh when participants change
          refresh();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useVenueParticipants] Successfully subscribed to venue_participants channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useVenueParticipants] Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('[useVenueParticipants] Subscription timed out');
        } else {
          console.log('[useVenueParticipants] Subscription status:', status);
        }
      });

    return () => {
      console.log('[useVenueParticipants] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [venueId, refresh]);

  // Filter helpers
  const activeParticipants = participants.filter((p) => p.isActive);
  const authenticatedParticipants = activeParticipants.filter((p) => p.userId);
  const guestParticipants = activeParticipants.filter((p) => p.guestId);

  // Debug log
  console.log('[useVenueParticipants] Returning state:', {
    participantsCount: participants.length,
    activeCount: activeParticipants.length,
    venueId
  });

  return {
    participants,
    activeParticipants,
    authenticatedParticipants,
    guestParticipants,
    isLoading,
    error,
    refresh,
    count: participants.length,
    activeCount: activeParticipants.length,
  };
}

// ============================================================================
// VENUE BOARDS HOOK
// ============================================================================

/**
 * Hook to get all boards for a venue with real-time updates
 */
export function useVenueBoards(venueId: string | null) {
  const [boards, setBoards] = useState<VenueBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!venueId) {
      setBoards([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('venue_boards')
        .select('*')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('board_order', { ascending: true });

      if (fetchError) throw fetchError;

      setBoards(
        (data || []).map((b) => ({
          id: b.id,
          venueId: b.venue_id,
          boardName: b.board_name,
          boardOrder: b.board_order,
          isActive: b.is_active,
          createdAt: b.created_at,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setBoards([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  // Load on mount and when venueId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!venueId) return;

    console.log('[useVenueBoards] Setting up realtime subscription for venue:', venueId);

    const channel = supabase
      .channel(`venue-boards-list:${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_boards',
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          console.log('[useVenueBoards] Received realtime update:', payload);
          refresh();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useVenueBoards] Successfully subscribed to venue_boards channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useVenueBoards] Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('[useVenueBoards] Subscription timed out');
        } else {
          console.log('[useVenueBoards] Subscription status:', status);
        }
      });

    return () => {
      console.log('[useVenueBoards] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [venueId, refresh]);

  const activeBoards = boards.filter((b) => b.isActive);

  return {
    boards,
    activeBoards,
    isLoading,
    error,
    refresh,
    count: boards.length,
  };
}

// ============================================================================
// VENUE GUESTS HOOK
// ============================================================================

/**
 * Hook to get all venue-specific guests with real-time updates
 */
export function useVenueGuests(venueId: string | null) {
  const [guests, setGuests] = useState<VenueGuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!venueId) {
      setGuests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('venue_guests')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setGuests(
        (data || []).map((g) => ({
          id: g.id,
          venueId: g.venue_id,
          guestName: g.guest_name,
          avatar: g.avatar,
          photoUrl: g.photo_url,
          totalGames: g.total_games || 0,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setGuests([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  // Load on mount and when venueId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!venueId) return;

    console.log('[useVenueGuests] Setting up realtime subscription for venue:', venueId);

    const channel = supabase
      .channel(`venue-guests:${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_guests',
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          console.log('[useVenueGuests] Received realtime update:', payload);
          refresh();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useVenueGuests] Successfully subscribed to venue_guests channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useVenueGuests] Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('[useVenueGuests] Subscription timed out');
        } else {
          console.log('[useVenueGuests] Subscription status:', status);
        }
      });

    return () => {
      console.log('[useVenueGuests] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [venueId, refresh]);

  return {
    guests,
    isLoading,
    error,
    refresh,
    count: guests.length,
  };
}
