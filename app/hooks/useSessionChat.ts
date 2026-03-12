'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '../lib/supabase/client';

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  message: string;
  createdAt: string;
}

/**
 * Provides real-time chat for an online session.
 * Loads message history on mount and subscribes to new INSERTs via Supabase Realtime.
 * Messages persist in DB so they survive a WebSocket drop.
 */
export function useSessionChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) return;

    // Load existing message history
    supabase
      .from('session_messages')
      .select('id, session_id, user_id, display_name, message, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(
            data.map((r: any) => ({
              id: r.id,
              sessionId: r.session_id,
              userId: r.user_id,
              displayName: r.display_name,
              message: r.message,
              createdAt: r.created_at,
            }))
          );
        }
      });

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel(`session-chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const r = payload.new as any;
          const msg: ChatMessage = {
            id: r.id,
            sessionId: r.session_id,
            userId: r.user_id,
            displayName: r.display_name,
            message: r.message,
            createdAt: r.created_at,
          };
          setMessages((prev) => {
            // Deduplicate in case the sender already added it optimistically
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (
      text: string,
      userId: string,
      displayName: string,
      /** Optimistic ID so the sender sees their message instantly */
      optimisticId?: string
    ) => {
      if (!sessionId || !text.trim()) return;

      // Add optimistically so the sender doesn't wait for the DB round-trip
      const optimistic: ChatMessage = {
        id: optimisticId ?? `opt-${Date.now()}`,
        sessionId,
        userId,
        displayName,
        message: text.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data } = await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          display_name: displayName,
          message: text.trim(),
        })
        .select('id')
        .single();

      // Swap the optimistic row with the real DB id once we have it
      if (data?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id ? { ...m, id: data.id } : m
          )
        );
      }
    },
    [sessionId]
  );

  return { messages, sendMessage };
}
