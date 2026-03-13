'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { ChatMessage } from './useSessionChat';

/**
 * DB-backed chat for party rooms (party_room_messages table).
 * Messages persist across page refreshes and across multiple games in the room.
 * Streamed in real-time via Supabase Realtime postgres_changes.
 */
export function usePartyChat(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!roomId) return;

    // Load history
    supabase
      .from('party_room_messages')
      .select('id, room_id, user_id, display_name, message, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(
            data.map((r: any) => ({
              id: r.id,
              sessionId: r.room_id,
              userId: r.user_id,
              displayName: r.display_name,
              message: r.message,
              createdAt: r.created_at,
            }))
          );
        }
      });

    // Stream new messages
    const channel = supabase
      .channel(`party-room-chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const r = payload.new as any;
          const msg: ChatMessage = {
            id: r.id,
            sessionId: r.room_id,
            userId: r.user_id,
            displayName: r.display_name,
            message: r.message,
            createdAt: r.created_at,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const sendMessage = useCallback(
    async (text: string, userId: string, displayName: string) => {
      if (!roomId || !text.trim()) return;

      const optimistic: ChatMessage = {
        id: `opt-${Date.now()}`,
        sessionId: roomId,
        userId,
        displayName,
        message: text.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data } = await supabase
        .from('party_room_messages')
        .insert({ room_id: roomId, user_id: userId, display_name: displayName, message: text.trim() })
        .select('id')
        .single();

      if (data?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...m, id: data.id } : m))
        );
      }
    },
    [roomId]
  );

  return { messages, sendMessage };
}
