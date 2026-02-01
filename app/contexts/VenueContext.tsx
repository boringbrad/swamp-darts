'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { getVenueInfo, VenueParticipant } from '../lib/venue';
import { useVenueMode } from '../hooks/useVenue';
import { useVenueParticipants } from '../hooks/useVenue';
import { StoredPlayer } from '../types/storage';

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
  refreshParticipants: () => void;
}

const VenueContext = createContext<VenueContextType | undefined>(undefined);

export function VenueProvider({ children }: { children: ReactNode }) {
  const [venueId, setVenueId] = useState<string | null>(null);
  const { venueMode } = useVenueMode();

  // Use hooks to get real-time venue participant data
  const { activeParticipants, participants, refresh } = useVenueParticipants(venueId);

  // Debug: log what we get from the hook
  useEffect(() => {
    console.log('[VenueContext] useVenueParticipants returned:', {
      participantsLength: participants.length,
      activeParticipantsLength: activeParticipants.length,
      participants: participants.map(p => ({ id: p.id, userId: p.userId, displayName: p.displayName }))
    });
  }, [participants, activeParticipants]);

  // Load venue info on mount if in venue mode
  useEffect(() => {
    loadVenueInfo();
  }, [venueMode]);

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
      } else {
        console.log('[VenueContext] No venue info found');
        setVenueId(null);
      }
    } catch (error) {
      console.error('[VenueContext] Error loading venue info:', error);
      setVenueId(null);
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
