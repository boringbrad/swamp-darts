'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { GameSession } from '../lib/sessions';

/**
 * Hook to subscribe to real-time session updates
 */
export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    // Initial load
    loadSession();

    // Subscribe to changes
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSession(null);
          } else {
            setSession(formatSession(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    setSession(data ? formatSession(data) : null);
    setLoading(false);
  };

  return { session, loading, refresh: loadSession };
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
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}
