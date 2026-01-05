'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppContextValue } from '../types/context';
import { UserProfile, CricketRules, PlayMode } from '../types/game';
import { SelectedPlayersStorage } from '../types/storage';
import { storage, initializeApp } from '../lib/storage';
import { playerStorage } from '../lib/playerStorage';

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Initialize state from storage
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayersState] = useState<SelectedPlayersStorage>({
    cricket: {},
    golf: {},
  });
  const [cricketRules, setCricketRulesState] = useState<CricketRules>({
    swampRules: true,
    noPoint: false,
    point: false,
  });
  const [playMode, setPlayModeState] = useState<PlayMode>('practice');

  // Load initial state from storage on mount
  useEffect(() => {
    // Check if this is first time initialization
    const isFirstTime = initializeApp();

    if (isFirstTime) {
      // No default players - users start with empty league

      // Create default user profile
      const defaultProfile: UserProfile = {
        id: 'default-user',
        username: 'the-mayor',
        displayName: 'THE MAYOR',
        avatar: 'avatar-1',
        friends: [],
        clubs: [],
        stats: {
          gamesPlayed: 142,
          gamesWon: 89,
          cricketStats: {
            gamesPlayed: 85,
            gamesWon: 52,
            averageMPR: 2.3,
          },
          golfStats: {
            gamesPlayed: 57,
            gamesWon: 37,
            averageScore: 32,
          },
        },
      };

      storage.setUserProfile(defaultProfile);
      setUserProfile(defaultProfile);
    } else {
      // Load existing data
      const profile = storage.getUserProfile();
      setUserProfile(profile);
    }

    // Load other state
    setHeaderVisible(storage.getHeaderVisible());
    setSelectedPlayersState(storage.getSelectedPlayers());
    setCricketRulesState(storage.getCricketRules());
    setPlayModeState(storage.getPlayMode());
  }, []);

  // Save header visibility to storage when it changes
  useEffect(() => {
    storage.setHeaderVisible(headerVisible);
  }, [headerVisible]);

  // Save selected players to sessionStorage when they change
  useEffect(() => {
    storage.setSelectedPlayers(selectedPlayers);
  }, [selectedPlayers]);

  // Save cricket rules to sessionStorage when they change
  useEffect(() => {
    storage.setCricketRules(cricketRules);
  }, [cricketRules]);

  // Save play mode to sessionStorage when it changes
  useEffect(() => {
    storage.setPlayMode(playMode);
  }, [playMode]);

  // Context methods
  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      storage.setUserProfile(updated);
      return updated;
    });
  };

  const toggleHeaderVisibility = () => {
    setHeaderVisible(prev => !prev);
  };

  const pushRoute = (route: string) => {
    setNavigationHistory(prev => [...prev, route]);
  };

  const popRoute = (): string | undefined => {
    const newHistory = [...navigationHistory];
    newHistory.pop(); // Remove current
    const previous = newHistory.pop(); // Get previous
    setNavigationHistory(newHistory);
    return previous;
  };

  const setSelectedPlayers = (
    mode: keyof SelectedPlayersStorage,
    variant: string,
    data: any
  ) => {
    setSelectedPlayersState(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [variant]: data,
      },
    }));
  };

  const clearSelectedPlayers = (mode: keyof SelectedPlayersStorage, variant: string) => {
    setSelectedPlayersState(prev => {
      const newMode = { ...prev[mode] } as Record<string, any>;
      delete newMode[variant];
      return {
        ...prev,
        [mode]: newMode,
      };
    });
  };

  const setCricketRules = (rules: Partial<CricketRules>) => {
    setCricketRulesState(prev => ({ ...prev, ...rules }));
  };

  const setPlayMode = (mode: PlayMode) => {
    setPlayModeState(mode);
  };

  const contextValue: AppContextValue = {
    userProfile,
    updateUserProfile,
    headerVisible,
    toggleHeaderVisibility,
    navigationHistory,
    pushRoute,
    popRoute,
    selectedPlayers,
    setSelectedPlayers,
    clearSelectedPlayers,
    cricketRules,
    setCricketRules,
    playMode,
    setPlayMode,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
