'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { getVenueInfo, VenueParticipant } from '../lib/venue';
import { useVenueMode } from '../hooks/useVenue';
import { useVenueParticipants } from '../hooks/useVenue';
import { StoredPlayer } from '../types/storage';

const VENUE_ID_CACHE_KEY = 'swamp-darts:venue-id-cache';

interface VenueContextType {
  // Venue info
  venueId: string | null;
  isVenue: boolean;

  // Venue participants (for player pools)
  participants: VenueParticipant[];
  activeParticipants: VenueParticipant[];

  // Convert participants to StoredPlayer format for compatibility
  venuePlayersForSelection: StoredPlayer[];

  // Actions
  refreshParticipants: () => Promise<void>;
}

const VenueContext = createContext<VenueContextType | undefined>(undefined);

export function VenueProvider({ children }: { children: ReactNode }) {
  const [venueId, setVenueId] = useState<string | null>(null);
  const { venueMode, isLoading: venueModeLoading } = useVenueMode();

  // Use hooks to get real-time venue participant data
  const { activeParticipants, participants, refresh } = useVenueParticipants(venueId);

  // Load venue info only after localStorage has finished loading — prevents the race
  // condition where venueMode is briefly false before localStorage is read, causing
  // venueId to be incorrectly cleared on every mount.
  useEffect(() => {
    if (!venueModeLoading) {
      loadVenueInfo();
    }
  }, [venueMode, venueModeLoading]);

  const loadVenueInfo = async () => {
    console.log('[VenueContext] loadVenueInfo called, venueMode:', venueMode);
    if (!venueMode) {
      console.log('[VenueContext] Not in venue mode, clearing venueId');
      setVenueId(null);
      return;
    }

    try {
      console.log('[VenueContext] Fetching venue info...');
      const info = await getVenueInfo();
      if (info) {
        console.log('[VenueContext] Venue info loaded:', info.id, info.venueName);
        setVenueId(info.id);
        // Cache venueId so it's available when offline
        try { localStorage.setItem(VENUE_ID_CACHE_KEY, info.id); } catch {}
      } else if (typeof navigator !== 'undefined' && navigator.onLine) {
        // Confirmed online but no venue account — clear any stale cache
        console.log('[VenueContext] No venue info found (online)');
        setVenueId(null);
        try { localStorage.removeItem(VENUE_ID_CACHE_KEY); } catch {}
      } else {
        // Offline — Supabase queries returned null; use cached venueId
        console.log('[VenueContext] Offline — using cached venueId');
        try {
          const cachedId = localStorage.getItem(VENUE_ID_CACHE_KEY);
          setVenueId(cachedId || null);
        } catch {
          setVenueId(null);
        }
      }
    } catch (error) {
      // Network failure (offline) — use cached venueId so the player pool stays populated
      console.warn('[VenueContext] Could not reach server, using cached venueId');
      try {
        const cachedId = localStorage.getItem(VENUE_ID_CACHE_KEY);
        if (cachedId) {
          console.log('[VenueContext] Using cached venueId:', cachedId);
          setVenueId(cachedId);
        } else {
          setVenueId(null);
        }
      } catch {
        setVenueId(null);
      }
    }
  };

  // Convert venue participants to StoredPlayer format for compatibility with player selection
  // Use useMemo to prevent recalculation on every render
  const venuePlayersForSelection: StoredPlayer[] = useMemo(() => {
    console.log('[VenueContext] useMemo: Mapping', activeParticipants.length, 'participants');

    return activeParticipants.map(p => {
      console.log('[VenueContext] Mapping participant:', p);

      if (p.userId) {
        // Authenticated user
        const player = {
          id: p.userId,
          name: p.displayName || p.username || 'Unknown User',
          avatar: p.avatar || 'avatar-1',
          photoUrl: p.photoUrl,
          isGuest: false,
          addedDate: new Date(p.joinedAt), // Use actual join date from venue participant
        };
        console.log('[VenueContext] Mapped to user player:', player);
        return player;
      } else {
        // Guest player
        const player = {
          id: p.guestId || p.id,
          name: p.guestName || 'Unknown Guest',
          avatar: p.guestAvatar || 'avatar-1',
          photoUrl: p.guestPhotoUrl,
          isGuest: true,
          addedDate: new Date(p.joinedAt), // Use actual join date from venue participant
        };
        console.log('[VenueContext] Mapped to guest player:', player);
        return player;
      }
    });
  }, [activeParticipants]);

  // Log venue players for debugging
  useEffect(() => {
    console.log('[VenueContext] Current state:', {
      venueMode,
      venueId,
      participantCount: activeParticipants.length,
      venuePlayersCount: venuePlayersForSelection.length
    });
    console.log('[VenueContext] Full venue players:', venuePlayersForSelection);
  }, [venueMode, venueId, activeParticipants.length]);

  return (
    <VenueContext.Provider
      value={{
        venueId,
        isVenue: venueMode && !!venueId,
        participants,
        activeParticipants,
        venuePlayersForSelection,
        refreshParticipants: refresh,
      }}
    >
      {children}
    </VenueContext.Provider>
  );
}

export function useVenueContext() {
  const context = useContext(VenueContext);
  if (context === undefined) {
    throw new Error('useVenueContext must be used within a VenueProvider');
  }
  return context;
}

// Hook to get venue players for player selection (compatible with existing player selection logic)
export function useVenuePlayers(): StoredPlayer[] {
  const context = useContext(VenueContext);
  if (!context) {
    return [];
  }
  return context.venuePlayersForSelection;
}
