'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';

export interface OnlineConfig {
  sessionId: string;
  myUserId: string;
  hostUserId: string;   // player index 0
  guestUserId: string;  // player index 1
  roomCode?: string;
  /** If set, "Exit Game" navigates back to this party room instead of home */
  partyRoomId?: string;
}

interface OnlineGameRow {
  session_id: string;
  current_player_id: string;
  game_state: any;
  move_number: number;
  updated_at: string;
}

interface UseOnlineGameStateReturn {
  /** True when it is this client's turn to play */
  isMyTurn: boolean;
  /** The latest game state received from Supabase (null before first move) */
  opponentState: any | null;
  /** Call after your turn completes to push new state and hand off */
  submitTurn: (newState: any, nextPlayerId: string) => Promise<void>;
  /** True if the other participant has left the session */
  opponentLeft: boolean;
  /** True if this player has voted for a rematch */
  iWantRematch: boolean;
  /** True if the opponent has voted for a rematch */
  opponentWantsRematch: boolean;
  /** True when both players have voted for a rematch */
  bothWantRematch: boolean;
  /** Vote for a rematch */
  requestRematch: () => Promise<void>;
  /** Host resets the DB row so the next game starts fresh */
  resetForRematch: () => Promise<void>;
  /** Live dart state broadcast by the opponent mid-turn (cleared when turn ends) */
  opponentLiveDarts: any | null;
  /** Broadcast your current dart state to the opponent in real-time */
  broadcastLiveDarts: (state: any | null) => void;
}

/**
 * Manages real-time game state sync for online 1v1 games.
 * - Subscribes to online_game_state changes via Supabase Realtime
 * - submitTurn upserts the row after the active player finishes their turn
 * - requestRematch / resetForRematch handle end-of-game rematch voting
 */
export function useOnlineGameState(config: OnlineConfig | null): UseOnlineGameStateReturn {
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [opponentState, setOpponentState] = useState<any | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [rematchVotes, setRematchVotes] = useState<Record<string, boolean>>({});
  const [opponentLiveDarts, setOpponentLiveDarts] = useState<any | null>(null);
  const initializedRef = useRef(false);
  const channelRef = useRef<any>(null);
  const supabase = createClient();

  const myId = config?.myUserId ?? null;
  const sessionId = config?.sessionId ?? null;

  // On mount: load existing state row (in case we're reconnecting mid-game)
  useEffect(() => {
    if (!sessionId) return;

    const loadInitialState = async () => {
      const { data } = await supabase
        .from('online_game_state')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      // Skip 'rematch' rows on initial load — the host's DELETE will propagate via Realtime
      // and reset currentPlayerId to null so both clients start fresh with host going first.
      // Setting currentPlayerId = 'rematch' here would make isMyTurn = false for both players.
      if (data && data.current_player_id !== 'rematch') {
        setCurrentPlayerId(data.current_player_id);
        // Do NOT restore rematchVotes on mount — they're only tracked via live Realtime events.
        // Restoring old votes would re-trigger bothWantRematch → infinite rematch loop after remount.
        if (data.current_player_id !== myId) {
          setOpponentState(data.game_state);
        }
        initializedRef.current = true;
      }
    };

    loadInitialState();

    // Re-sync when the app comes back to the foreground.
    // Supabase Realtime (WebSocket) can drop on iOS PWA when the app is backgrounded
    // or the screen locks — missed events are NOT replayed on reconnect. If a turn was
    // submitted while we were backgrounded, both players end up stuck on
    // "Waiting for opponent". Polling on visibility-change catches that case.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      supabase
        .from('online_game_state')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()
        .then(({ data }) => {
          if (!data || data.current_player_id === 'rematch') return;
          setCurrentPlayerId(data.current_player_id);
          // If it's now our turn but we missed the Realtime event, apply the
          // opponent's state so the board restores correctly.
          if (data.current_player_id === myId) {
            setOpponentState(data.game_state);
          }
        });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Subscribe to realtime changes on this session's game state
    const channel = supabase
      .channel(`online-game-state:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_game_state',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // Row deleted = rematch reset. Both clients revert to null → host goes first.
          if (payload.eventType === 'DELETE') {
            setCurrentPlayerId(null);
            setOpponentState(null);
            setRematchVotes({});
            setOpponentLiveDarts(null);
            return;
          }
          const row = payload.new as OnlineGameRow;
          if (!row) return;
          setCurrentPlayerId(row.current_player_id);
          // Track rematch votes
          if (row.game_state?.rematchVotes) {
            setRematchVotes(row.game_state.rematchVotes);
          } else {
            setRematchVotes({});
          }
          // Only expose as opponentState when it's now our turn (not a rematch signal)
          if (row.current_player_id === myId && row.current_player_id !== 'rematch') {
            setOpponentState(row.game_state);
            // Turn just passed to us — clear opponent's live dart preview
            setOpponentLiveDarts(null);
          }
        }
      )
      .on('broadcast', { event: 'live-darts' }, (payload: any) => {
        // Ignore our own echoed broadcasts
        if (payload.payload?.senderId === myId) return;
        setOpponentLiveDarts(payload.payload?.state ?? null);
      })
      .subscribe();

    channelRef.current = channel;

    // Subscribe to session_participants to detect if opponent leaves
    const participantChannel = supabase
      .channel(`online-participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          // Re-check if the other player is still active
          const { data: participants } = await supabase
            .from('session_participants')
            .select('user_id, left_at')
            .eq('session_id', sessionId)
            .is('left_at', null);

          if (participants) {
            const otherActive = participants.some(p => p.user_id !== myId);
            if (!otherActive) setOpponentLeft(true);
          }
        }
      )
      .subscribe();

    // Subscribe to session status — catches completeOnlineSession (Exit / Return Home)
    // and handles browser crashes where leaveSession may not have fired.
    const sessionStatusChannel = supabase
      .channel(`online-session-status:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row?.status === 'completed' || row?.status === 'expired') {
            setOpponentLeft(true);
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(sessionStatusChannel);
    };
  }, [sessionId, myId]);

  const submitTurn = useCallback(async (newState: any, nextPlayerId: string) => {
    if (!sessionId) return;

    const { data: existing } = await supabase
      .from('online_game_state')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    const row = {
      session_id: sessionId,
      current_player_id: nextPlayerId,
      game_state: newState,
      move_number: existing ? undefined : 1, // let DB auto-increment on updates
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from('online_game_state')
        .update({ current_player_id: nextPlayerId, game_state: newState, updated_at: row.updated_at })
        .eq('session_id', sessionId);
    } else {
      await supabase
        .from('online_game_state')
        .insert({ session_id: sessionId, current_player_id: nextPlayerId, game_state: newState, move_number: 1 });
    }
  }, [sessionId]);

  const requestRematch = useCallback(async () => {
    if (!sessionId || !myId) return;

    const { data: existing } = await supabase
      .from('online_game_state')
      .select('game_state')
      .eq('session_id', sessionId)
      .maybeSingle();

    const currentVotes = existing?.game_state?.rematchVotes || {};
    const newVotes = { ...currentVotes, [myId]: true };

    if (existing) {
      await supabase
        .from('online_game_state')
        .update({ current_player_id: 'rematch', game_state: { rematchVotes: newVotes }, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);
    } else {
      await supabase
        .from('online_game_state')
        .insert({ session_id: sessionId, current_player_id: 'rematch', game_state: { rematchVotes: newVotes }, move_number: 1 });
    }
  }, [sessionId, myId]);

  /** Host deletes the row so both clients revert to null state → host goes first */
  const resetForRematch = useCallback(async () => {
    if (!sessionId) return;
    await supabase
      .from('online_game_state')
      .delete()
      .eq('session_id', sessionId);
  }, [sessionId]);

  /** Send live dart state to opponent via ephemeral broadcast (no DB write) */
  const broadcastLiveDarts = useCallback((state: any | null) => {
    if (!channelRef.current || !myId) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'live-darts',
      payload: { senderId: myId, state },
    });
  }, [myId]);

  const opponentId = config
    ? (config.myUserId === config.hostUserId ? config.guestUserId : config.hostUserId)
    : null;

  const iWantRematch = myId ? (rematchVotes[myId] ?? false) : false;
  const opponentWantsRematch = opponentId ? (rematchVotes[opponentId] ?? false) : false;
  const bothWantRematch = iWantRematch && opponentWantsRematch;

  const isMyTurn = config !== null && currentPlayerId !== 'rematch' && (
    currentPlayerId === null  // game just started — host goes first
      ? config.myUserId === config.hostUserId
      : currentPlayerId === config.myUserId
  );

  return { isMyTurn, opponentState, submitTurn, opponentLeft, iWantRematch, opponentWantsRematch, bothWantRematch, requestRematch, resetForRematch, opponentLiveDarts, broadcastLiveDarts };
}
