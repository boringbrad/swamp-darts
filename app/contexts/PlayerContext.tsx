'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PlayerContextValue } from '../types/context';
import { StoredPlayer } from '../types/storage';
import { playerStorage } from '../lib/playerStorage';
import { syncGuestPlayer, deleteGuestPlayerFromSupabase, canSyncToSupabase } from '../lib/supabaseSync';
import { getMyRoomMembers, RoomMember } from '../lib/roomMembers';
import { useAuth } from './AuthContext';

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

function roomMemberToStored(m: RoomMember): StoredPlayer {
  return {
    id: `room-${m.memberUserId}`,
    name: m.displayName,
    avatar: m.avatar,
    photoUrl: m.photoUrl,
    isGuest: false,
    isVerified: true,
    userId: m.memberUserId,
    createdBy: undefined, // bypasses createdBy filter in refreshLocalPlayers
    addedDate: new Date(m.joinedAt),
    lastUsed: new Date(m.joinedAt),
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [persistentPlayers, setPersistentPlayers] = useState<StoredPlayer[]>([]);
  const [roomMemberPlayers, setRoomMemberPlayers] = useState<StoredPlayer[]>([]);

  // Load persistent (local) players from localStorage
  const refreshLocalPlayers = useCallback(() => {
    const allPlayers = playerStorage.getAllPlayers();
    const filtered = user
      ? allPlayers.filter(p => p.createdBy === user.id)
      : allPlayers;
    setPersistentPlayers(filtered);
  }, [user]);

  // Load room members from Supabase (friends who joined via room code)
  const refreshRoomMembers = useCallback(async () => {
    if (!user) {
      setRoomMemberPlayers([]);
      return;
    }
    try {
      const members = await getMyRoomMembers();
      setRoomMemberPlayers(members.map(roomMemberToStored));
    } catch (err) {
      console.error('PlayerContext: failed to load room members', err);
    }
  }, [user]);

  // Refresh both local players and room members
  const refreshPlayers = useCallback(() => {
    refreshLocalPlayers();
    refreshRoomMembers();
  }, [refreshLocalPlayers, refreshRoomMembers]);

  // Load on mount and when user changes; poll room members every 20 seconds
  // so newly-joined players appear everywhere (player select, manage players) without a refresh.
  useEffect(() => {
    refreshLocalPlayers();
    refreshRoomMembers();

    const pollInterval = user
      ? setInterval(() => refreshRoomMembers(), 20000)
      : null;

    const handlePlayersChanged = () => {
      refreshLocalPlayers();
    };
    window.addEventListener('playersChanged', handlePlayersChanged);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener('playersChanged', handlePlayersChanged);
    };
  }, [user, refreshLocalPlayers, refreshRoomMembers]);

  // Merged view used by game pages
  const localPlayers = [...persistentPlayers, ...roomMemberPlayers];
  const sessionPlayers = roomMemberPlayers;

  const addLocalPlayer = (name: string, avatar?: string, isGuest = false): StoredPlayer => {
    const newPlayer = playerStorage.addPlayer(name, avatar, isGuest, user?.id);
    refreshLocalPlayers();

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
    refreshLocalPlayers();

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
    refreshLocalPlayers();

    if (player && player.isGuest) {
      canSyncToSupabase().then(canSync => {
        if (canSync) deleteGuestPlayerFromSupabase(id);
      });
    }
  };

  const addGuestPlayer = (name: string, avatar?: string): StoredPlayer => {
    return addLocalPlayer(name, avatar, true);
  };

  const getGuestPlayers = (): StoredPlayer[] => {
    return persistentPlayers.filter(p => p.isGuest);
  };

  const cleanupGuestPlayers = () => {
    playerStorage.cleanupGuestPlayers();
    refreshLocalPlayers();
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
    refreshRoomMembers,
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
