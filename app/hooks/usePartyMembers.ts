'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { PartyMember, getPartyMembers } from '../lib/partyRooms';

/**
 * Subscribes to active party_members for a given room via Supabase Realtime.
 * Re-fetches on any INSERT/UPDATE so member list stays live.
 */
export function usePartyMembers(roomId: string | null) {
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    if (!roomId) return;
    const data = await getPartyMembers(roomId);
    setMembers(data);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) { setLoading(false); return; }

    setLoading(true);
    getPartyMembers(roomId).then(data => {
      setMembers(data);
      setLoading(false);
    });

    const channel = supabase
      .channel(`party-members:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_members', filter: `room_id=eq.${roomId}` },
        () => {
          // Re-fetch full list on any change (handles join, leave, sit-out toggle)
          getPartyMembers(roomId).then(setMembers);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  return { members, loading, refresh };
}
