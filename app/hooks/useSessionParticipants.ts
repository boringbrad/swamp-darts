'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { SessionParticipant } from '../lib/sessions';

/**
 * Hook to subscribe to real-time session participants updates
 */
export function useSessionParticipants(sessionId: string | null) {
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    // Initial load
    loadParticipants();

    // Subscribe to changes
    const channel = supabase
      .channel(`session-participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Reload participants on any change
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadParticipants = async () => {
    if (!sessionId) return;

    setLoading(true);
    const { data } = await supabase
      .from('session_participants')
      .select(`
        *,
        profile:profiles(username, display_name, avatar, photo_url)
      `)
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (data) {
      const formatted = data.map(p => ({
        id: p.id,
        sessionId: p.session_id,
        userId: p.user_id,
        guestName: p.guest_name,
        guestAvatar: p.guest_avatar,
        isHost: p.is_host,
        joinedAt: p.joined_at,
        leftAt: p.left_at,
        username: p.profile?.username,
        displayName: p.profile?.display_name,
        avatar: p.profile?.avatar,
        photoUrl: p.profile?.photo_url,
      }));
      setParticipants(formatted);
    }
    setLoading(false);
  };

  // Get only active participants (not left)
  const activeParticipants = participants.filter(p => !p.leftAt);

  return { participants, activeParticipants, loading, refresh: loadParticipants };
}
