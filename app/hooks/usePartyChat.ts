'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '../lib/supabase/client';
import { ChatMessage } from './useSessionChat';

/**
 * Ephemeral broadcast-based chat for party room lobbies.
 * Messages live only for the current session — no DB persistence.
 * Uses Supabase Realtime broadcast so no extra table is needed.
 */
export function usePartyChat(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends (...a: any[]) => infer R ? R : any>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`party-chat:${roomId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload as ChatMessage];
        });
      })
      .subscribe();

    channelRef.current = channel as any;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (text: string, userId: string, displayName: string) => {
      if (!roomId || !text.trim() || !channelRef.current) return;

      const msg: ChatMessage = {
        id: `${userId}-${Date.now()}`,
        sessionId: roomId,
        userId,
        displayName,
        message: text.trim(),
        createdAt: new Date().toISOString(),
      };

      // Add locally for sender immediately
      setMessages((prev) => [...prev, msg]);

      // Broadcast to everyone else in the room
      (channelRef.current as any).send({
        type: 'broadcast',
        event: 'chat',
        payload: msg,
      });
    },
    [roomId]
  );

  return { messages, sendMessage };
}
