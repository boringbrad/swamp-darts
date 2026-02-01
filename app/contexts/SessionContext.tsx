'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserActiveSession, getSession, SessionParticipant } from '../lib/sessions';
import { useSessionParticipants } from '../hooks/useSessionParticipants';
import { useSession } from '../hooks/useSession';

interface SessionContextType {
  // Current session info
  sessionId: string | null;
  roomCode: string | null;
  isInSession: boolean;
  isHost: boolean;

  // Session participants (for player pools)
  participants: SessionParticipant[];
  activeParticipants: SessionParticipant[];

  // Actions
  setSessionId: (id: string | null) => void;
  refreshSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Use hooks to get real-time session data
  const { session } = useSession(sessionId);
  const { participants, activeParticipants, loading: participantsLoading } = useSessionParticipants(sessionId);

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
  }, []);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { createClient } = await import('../lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Clear sessionId if session is no longer in lobby status or user is no longer a participant
  useEffect(() => {
    if (!sessionId) return;

    // Don't clear anything if we don't have currentUserId yet
    if (!currentUserId) return;

    // Clear if session expired or completed
    if (session && session.status !== 'lobby') {
      setSessionId(null);
      return;
    }

    // Only check participant status after participants have finished loading AND we have at least one participant
    // This prevents clearing sessionId during sync delays
    if (!participantsLoading && activeParticipants.length > 0) {
      // If we have loaded participants and user is not in the list, clear session
      const userIsParticipant = activeParticipants.some(p => p.userId === currentUserId);
      if (!userIsParticipant) {
        console.log('Clearing session - user not in participant list', { currentUserId, activeParticipants });
        setSessionId(null);
      }
    }
  }, [session?.status, sessionId, currentUserId, activeParticipants, participantsLoading]);

  const loadActiveSession = async () => {
    const activeSession = await getUserActiveSession();
    if (activeSession) {
      setSessionId(activeSession.id);
    } else {
      setSessionId(null);
    }
  };

  const isHost = session?.hostUserId === currentUserId;

  // Check if user actually has an active participant record
  // While loading, assume user is participant (optimistic UI)
  const userIsActiveParticipant = participantsLoading || !currentUserId
    ? true
    : activeParticipants.some(p => p.userId === currentUserId);

  const isInSession = !!sessionId && session?.status === 'lobby' && userIsActiveParticipant;

  const value: SessionContextType = {
    sessionId,
    roomCode: session?.roomCode || null,
    isInSession,
    isHost,
    participants,
    activeParticipants,
    setSessionId,
    refreshSession: loadActiveSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

/**
 * Hook to get session participants as player objects
 * This can be used in player selection screens to show session members
 */
export function useSessionPlayers() {
  const { activeParticipants, isInSession } = useSessionContext();

  if (!isInSession) {
    return [];
  }

  // Convert session participants to player objects
  // Use userId for authenticated users to ensure proper deduplication
  const players = activeParticipants.map(p => ({
    id: p.userId || `guest-${p.id}`, // Use userId or prefix guest ID to avoid collisions
    name: p.displayName || p.username || p.guestName || 'Unknown',
    avatar: p.avatar || p.guestAvatar || 'avatar-1',
    photoUrl: p.photoUrl,
    isGuest: !p.userId,
    isSessionMember: true,
  }));

  // Deduplicate by ID (in case there are duplicate participant records in database)
  const seen = new Set<string>();
  return players.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}
