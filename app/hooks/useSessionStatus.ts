'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';

type SessionStatus = 'lobby' | 'in_game' | 'completed' | 'expired';

/**
 * Hook to subscribe to session status changes
 */
export function useSessionStatus(sessionId: string | null) {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    // Initial load
    loadStatus();

    // Subscribe to status changes
    const channel = supabase
      .channel(`session-status:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new && 'status' in payload.new) {
            setStatus(payload.new.status as SessionStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadStatus = async () => {
    if (!sessionId) return;

    setLoading(true);
    const { data } = await supabase
      .from('game_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    setStatus(data?.status || null);
    setLoading(false);
  };

  return { status, loading, refresh: loadStatus };
}
