'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { PartyRoom, getPartyRoom } from '../lib/partyRooms';

/**
 * Subscribes to a single party room row via Supabase Realtime.
 * Returns null while loading or if the room doesn't exist.
 */
export function usePartyRoom(roomId: string | null) {
  const [room, setRoom] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    if (!roomId) return;
    const data = await getPartyRoom(roomId);
    setRoom(data);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) { setLoading(false); return; }

    setLoading(true);
    getPartyRoom(roomId).then(data => {
      setRoom(data);
      setLoading(false);
    });

    const channel = supabase
      .channel(`party-room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setRoom(null);
            return;
          }
          const r = payload.new as any;
          setRoom({
            id: r.id,
            roomCode: r.room_code,
            hostUserId: r.host_user_id,
            status: r.status,
            currentSessionId: r.current_session_id ?? null,
            expiresAt: r.expires_at,
            createdAt: r.created_at,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  return { room, loading, refresh };
}
