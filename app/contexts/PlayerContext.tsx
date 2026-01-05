'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlayerContextValue } from '../types/context';
import { StoredPlayer } from '../types/storage';
import { playerStorage } from '../lib/playerStorage';

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [localPlayers, setLocalPlayers] = useState<StoredPlayer[]>([]);

  // Load players from storage on mount
  useEffect(() => {
    refreshPlayers();
  }, []);

  const refreshPlayers = () => {
    const players = playerStorage.getAllPlayers();
    setLocalPlayers(players);
  };

  const addLocalPlayer = (name: string, avatar?: string, isGuest = false): StoredPlayer => {
    const newPlayer = playerStorage.addPlayer(name, avatar, isGuest);
    refreshPlayers();
    return newPlayer;
  };

  const updateLocalPlayer = (id: string, updates: Partial<StoredPlayer>) => {
    playerStorage.updatePlayer(id, updates);
    refreshPlayers();
  };

  const deleteLocalPlayer = (id: string) => {
    playerStorage.deletePlayer(id);
    refreshPlayers();
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

  const contextValue: PlayerContextValue = {
    localPlayers,
    refreshPlayers,
    addLocalPlayer,
    updateLocalPlayer,
    deleteLocalPlayer,
    addGuestPlayer,
    getGuestPlayers,
    cleanupGuestPlayers,
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
