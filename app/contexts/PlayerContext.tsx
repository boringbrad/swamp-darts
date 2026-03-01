'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlayerContextValue } from '../types/context';
import { StoredPlayer, SessionPlayer } from '../types/storage';
import { playerStorage } from '../lib/playerStorage';
import { localSession } from '../lib/localSession';
import { syncGuestPlayer, deleteGuestPlayerFromSupabase, canSyncToSupabase } from '../lib/supabaseSync';
import { useAuth } from './AuthContext';

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

/** Convert a SessionPlayer to the StoredPlayer shape expected by game components. */
function sessionPlayerToStored(sp: SessionPlayer): StoredPlayer {
  return {
    id: `session-${sp.userId}`,
    name: sp.displayName,
    avatar: sp.avatar,
    photoUrl: sp.photoUrl,
    isGuest: false,
    isVerified: true,
    userId: sp.userId,
    sessionExpiresAt: sp.expiresAt,
    createdBy: undefined, // intentionally undefined — bypasses the createdBy filter
    addedDate: new Date(sp.joinedAt),
    lastUsed: new Date(sp.joinedAt),
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [localPlayers, setLocalPlayers] = useState<StoredPlayer[]>([]);
  const [sessionPlayers, setSessionPlayers] = useState<StoredPlayer[]>([]);

  // Load players from storage on mount and when user changes
  useEffect(() => {
    // Clear expired session players before loading
    localSession.clearExpiredSessionPlayers();
    refreshPlayers();

    // Listen for player changes from other parts of the app
    const handlePlayersChanged = () => {
      console.log('PlayerContext: Players changed event received, refreshing...');
      refreshPlayers();
    };

    window.addEventListener('playersChanged', handlePlayersChanged);

    return () => {
      window.removeEventListener('playersChanged', handlePlayersChanged);
    };
  }, [user]);

  const refreshPlayers = () => {
    const allPlayers = playerStorage.getAllPlayers();

    // Filter persistent players to those created by the current user
    const filteredPlayers = user
      ? allPlayers.filter(p => p.createdBy === user.id)
      : allPlayers; // If no user, show all players (backward compatibility)

    // Load verified session players (already filtered for expiry by localSession)
    const currentSessionPlayers = localSession.getSessionPlayers().map(sessionPlayerToStored);
    setSessionPlayers(currentSessionPlayers);

    // Merge: persistent players first, then session players appended
    // Deduplicate by id to be safe (session player ids are 'session-{userId}' so no real clash)
    setLocalPlayers([...filteredPlayers, ...currentSessionPlayers]);
  };

  const addLocalPlayer = (name: string, avatar?: string, isGuest = false): StoredPlayer => {
    const newPlayer = playerStorage.addPlayer(name, avatar, isGuest, user?.id);
    refreshPlayers();

    // Sync guest players to Supabase for analytics
    if (isGuest) {
      canSyncToSupabase().then(canSync => {
        if (canSync) {
          syncGuestPlayer({
            id: newPlayer.id,
            name: newPlayer.name,
            avatar: newPlayer.avatar || 'avatar-1',
            photoUrl: newPlayer.photoUrl,
          });
        }
      });
    }

    return newPlayer;
  };

  const updateLocalPlayer = (id: string, updates: Partial<StoredPlayer>) => {
    playerStorage.updatePlayer(id, updates);
    refreshPlayers();

    // Sync guest player updates to Supabase
    const player = playerStorage.getPlayer(id);
    if (player && player.isGuest) {
      canSyncToSupabase().then(canSync => {
        if (canSync) {
          syncGuestPlayer({
            id: player.id,
            name: player.name,
            avatar: player.avatar || 'avatar-1',
            photoUrl: player.photoUrl,
          });
        }
      });
    }
  };

  const deleteLocalPlayer = (id: string) => {
    const player = playerStorage.getPlayer(id);
    playerStorage.deletePlayer(id);
    refreshPlayers();

    // Delete from Supabase if it's a guest player
    if (player && player.isGuest) {
      canSyncToSupabase().then(canSync => {
        if (canSync) {
          deleteGuestPlayerFromSupabase(id);
        }
      });
    }
  };

  const addGuestPlayer = (name: string, avatar?: string): StoredPlayer => {
    return addLocalPlayer(name, avatar, true);
  };

  const getGuestPlayers = (): StoredPlayer[] => {
    return localPlayers.filter(p => p.isGuest);
  };

  const cleanupGuestPlayers = () => {
    playerStorage.cleanupGuestPlayers();
    refreshPlayers();
  };

  const addSessionPlayerFn = (sp: SessionPlayer) => {
    localSession.addSessionPlayer(sp);
    refreshPlayers();
  };

  const removeSessionPlayerFn = (userId: string) => {
    localSession.removeSessionPlayer(userId);
    refreshPlayers();
  };

  const contextValue: PlayerContextValue = {
    localPlayers,
    refreshPlayers,
    addLocalPlayer,
    updateLocalPlayer,
    deleteLocalPlayer,
    addGuestPlayer,
    getGuestPlayers,
    cleanupGuestPlayers,
    sessionPlayers,
    addSessionPlayer: addSessionPlayerFn,
    removeSessionPlayer: removeSessionPlayerFn,
  };

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayerContext must be used within PlayerProvider');
  }
  return context;
}
