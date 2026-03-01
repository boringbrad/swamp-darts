'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppContextValue } from '../types/context';
import { UserProfile, CricketRules, PlayMode } from '../types/game';
import { SelectedPlayersStorage } from '../types/storage';
import { storage, initializeApp } from '../lib/storage';
import { playerStorage } from '../lib/playerStorage';
import { createClient } from '../lib/supabase/client';
import { flushSyncQueue } from '../lib/supabaseSync';
import { useAuth } from './AuthContext';

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth state comes entirely from AuthContext — no duplicate subscription here
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => storage.getUserProfile() ?? null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  // Read selectedPlayers from sessionStorage synchronously so the game page
  // sees the correct players on first render even after a hard navigation
  // (window.location.href). If sessionStorage is unavailable (SSR), the
  // try-catch inside getSelectedPlayers returns the safe default.
  const [selectedPlayers, setSelectedPlayersState] = useState<SelectedPlayersStorage>(
    () => storage.getSelectedPlayers()
  );
  const [cricketRules, setCricketRulesState] = useState<CricketRules>({
    swampRules: true,
    noPoint: false,
    point: false,
  });
  const [playMode, setPlayModeState] = useState<PlayMode>('practice');
  const [tieBreakerEnabled, setTieBreakerEnabledState] = useState(true);
  const [golfCourseName, setGolfCourseNameState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('golfCourseName');
      if (saved !== null) return saved; // includes empty string (user deleted the name)
    }
    return 'SWAMPY MEADOWS';
  });
  const [courseBannerImage, setCourseBannerImageState] = useState('');
  const [courseBannerOpacity, setCourseBannerOpacityState] = useState(50);
  const [cameraEnabled, setCameraEnabledState] = useState(false);
  const [showCourseRecord, setShowCourseRecordState] = useState(true);
  const [showCourseName, setShowCourseNameState] = useState(true);
  const [x01StartingScore, setX01StartingScoreState] = useState(501);
  const [x01DoubleIn, setX01DoubleInState] = useState(false);
  const [x01DoubleOut, setX01DoubleOutState] = useState(true);
  const [x01AverageMode, setX01AverageModeState] = useState<'per-turn' | 'per-dart'>('per-turn');

  // Track previous profile id to detect login/logout transitions
  const prevProfileIdRef = useRef<string | null>(null);

  // React to auth profile changes — single source of truth for user profile
  useEffect(() => {
    if (authLoading) return; // wait for AuthContext to resolve

    if (profile) {
      // Logged in: map raw Supabase profile → app UserProfile type
      const mappedProfile: UserProfile = {
        id: profile.id,
        username: (profile as any).username || profile.display_name.toLowerCase().replace(/\s+/g, '-'),
        displayName: profile.display_name,
        avatar: profile.avatar || 'avatar-1',
        photoUrl: (profile as any).photo_url || null,
        accountType: (profile as any).account_type || 'player',
        isAdmin: (profile as any).is_admin === true,
        friends: [],
        clubs: [],
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          cricketStats: { gamesPlayed: 0, gamesWon: 0, averageMPR: 0 },
          golfStats: { gamesPlayed: 0, gamesWon: 0, averageScore: 0 },
        },
      } as any;

      storage.setUserProfile(mappedProfile);
      setUserProfile(mappedProfile);

      // Player migration: assign any existing unclaimed players to this user,
      // and create a local player record if one doesn't exist yet.
      const allPlayers = playerStorage.getAllPlayers();
      const existingPlayer = allPlayers.find(
        p => p.name.toLowerCase() === mappedProfile.displayName.toLowerCase()
      );

      // Migrate players without a createdBy that match this user's name or are guests
      const playersToMigrate = allPlayers.filter(p => !p.createdBy);
      if (playersToMigrate.length > 0) {
        playersToMigrate.forEach(player => {
          if (player.name.toLowerCase() === mappedProfile.displayName.toLowerCase()) {
            // This is the user's own pre-account player — claim it and clear guest flag
            playerStorage.updatePlayer(player.id, { createdBy: profile.id, isGuest: false });
          } else if (player.isGuest) {
            playerStorage.updatePlayer(player.id, { createdBy: profile.id });
          }
        });
      }

      if (!existingPlayer) {
        const newPlayer = playerStorage.addPlayer(
          mappedProfile.displayName,
          mappedProfile.avatar,
          false,
          profile.id
        );
        if (mappedProfile.photoUrl) {
          playerStorage.updatePlayer(newPlayer.id, { photoUrl: mappedProfile.photoUrl });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('playersChanged'));
        }
      } else {
        // Update photoUrl/avatar on existing player if changed; always clear isGuest
        if (
          (mappedProfile.photoUrl && existingPlayer.photoUrl !== mappedProfile.photoUrl) ||
          (mappedProfile.avatar && existingPlayer.avatar !== mappedProfile.avatar) ||
          existingPlayer.isGuest
        ) {
          playerStorage.updatePlayer(existingPlayer.id, {
            photoUrl: mappedProfile.photoUrl ?? undefined,
            avatar: mappedProfile.avatar,
            isGuest: false,
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('playersChanged'));
          }
        }
      }
    } else {
      // Logged out
      const wasLoggedIn = prevProfileIdRef.current !== null;
      if (wasLoggedIn) {
        playerStorage.cleanupGuestPlayers();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('playersChanged'));
        }
      }

      const isFirstTime = initializeApp();
      if (isFirstTime) {
        const defaultProfile: UserProfile = {
          id: 'default-user',
          username: 'unknown-user',
          displayName: 'Unknown User',
          avatar: 'avatar-1',
          friends: [],
          clubs: [],
          stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            cricketStats: { gamesPlayed: 0, gamesWon: 0, averageMPR: 0 },
            golfStats: { gamesPlayed: 0, gamesWon: 0, averageScore: 0 },
          },
        };
        storage.setUserProfile(defaultProfile);
        setUserProfile(defaultProfile);
      } else {
        const stored = storage.getUserProfile();
        setUserProfile(stored);
      }
    }

    prevProfileIdRef.current = profile?.id ?? null;
  }, [profile, authLoading]);

  // Load settings from localStorage on mount and set up offline sync flush
  useEffect(() => {
    setHeaderVisible(storage.getHeaderVisible());
    setCricketRulesState(storage.getCricketRules());
    setPlayModeState(storage.getPlayMode());

    // Re-read on client (lazy initializers run on server without window)
    const savedCourseName = localStorage.getItem('golfCourseName');
    if (savedCourseName !== null) setGolfCourseNameState(savedCourseName);

    const savedBannerImage = localStorage.getItem('courseBannerImage');
    if (savedBannerImage) setCourseBannerImageState(savedBannerImage);

    const savedBannerOpacity = localStorage.getItem('courseBannerOpacity');
    if (savedBannerOpacity) setCourseBannerOpacityState(parseInt(savedBannerOpacity));

    const savedCameraEnabled = localStorage.getItem('cameraEnabled');
    if (savedCameraEnabled !== null) setCameraEnabledState(savedCameraEnabled === 'true');

    const savedShowCourseRecord = localStorage.getItem('showCourseRecord');
    if (savedShowCourseRecord !== null) setShowCourseRecordState(savedShowCourseRecord === 'true');

    const savedShowCourseName = localStorage.getItem('showCourseName');
    if (savedShowCourseName !== null) setShowCourseNameState(savedShowCourseName === 'true');

    const savedX01StartingScore = localStorage.getItem('x01StartingScore');
    if (savedX01StartingScore) setX01StartingScoreState(parseInt(savedX01StartingScore));
    const savedX01DoubleIn = localStorage.getItem('x01DoubleIn');
    if (savedX01DoubleIn !== null) setX01DoubleInState(savedX01DoubleIn === 'true');
    const savedX01DoubleOut = localStorage.getItem('x01DoubleOut');
    if (savedX01DoubleOut !== null) setX01DoubleOutState(savedX01DoubleOut === 'true');
    const savedX01AverageMode = localStorage.getItem('x01AverageMode');
    if (savedX01AverageMode === 'per-dart' || savedX01AverageMode === 'per-turn') {
      setX01AverageModeState(savedX01AverageMode);
    }

    // Flush any match syncs that were queued while offline
    const handleOnline = () => { flushSyncQueue(); };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) flushSyncQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
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
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) {
      console.error('AppContext: No user profile to update');
      return;
    }

    const supabase = createClient();
    const prevProfile = userProfile;

    try {
      // 1. Update Supabase first if user is logged in
      if (prevProfile.id !== 'default-user') {
        const supabaseUpdates: any = {
          display_name: updates.displayName || prevProfile.displayName,
        };

        if ((updates as any).photoUrl !== undefined) {
          supabaseUpdates.photo_url = (updates as any).photoUrl;
          supabaseUpdates.avatar = (updates as any).avatar || null;
        } else if (updates.avatar !== undefined) {
          supabaseUpdates.avatar = updates.avatar;
          if ((updates as any).photoUrl === null) {
            supabaseUpdates.photo_url = null;
          }
        }

        const { error } = await supabase
          .from('profiles')
          .update(supabaseUpdates)
          .eq('id', prevProfile.id);

        if (error) {
          console.error('AppContext: Error updating profile in Supabase', error);
          throw error;
        }

        // Keep AuthContext's profile in sync
        await refreshProfile();
      }

      // 2. Update local player if display name, avatar, or photoUrl changed
      if (updates.displayName || updates.avatar || (updates as any).photoUrl !== undefined) {
        const allPlayers = playerStorage.getAllPlayers();
        const oldPlayer = allPlayers.find(
          p => p.name.toLowerCase() === prevProfile.displayName.toLowerCase()
        );

        if (oldPlayer) {
          const playerUpdates: any = {};
          if (updates.displayName) playerUpdates.name = updates.displayName;
          if (updates.avatar) playerUpdates.avatar = updates.avatar;
          if ((updates as any).photoUrl !== undefined) playerUpdates.photoUrl = (updates as any).photoUrl;
          playerStorage.updatePlayer(oldPlayer.id, playerUpdates);
        }
      }

      // 3. Update local state and storage
      const updated = { ...prevProfile, ...updates };
      storage.setUserProfile(updated);
      setUserProfile(updated);

      // 4. Notify PlayerContext to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('playersChanged'));
      }
    } catch (error) {
      console.error('AppContext: Failed to update profile', error);
    }
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

  const setTieBreakerEnabled = (enabled: boolean) => {
    setTieBreakerEnabledState(enabled);
  };

  const setGolfCourseName = (name: string) => {
    setGolfCourseNameState(name);
    localStorage.setItem('golfCourseName', name);
  };

  const setCourseBannerImage = (imageUrl: string) => {
    setCourseBannerImageState(imageUrl);
    localStorage.setItem('courseBannerImage', imageUrl);
  };

  const setCourseBannerOpacity = (opacity: number) => {
    setCourseBannerOpacityState(opacity);
    localStorage.setItem('courseBannerOpacity', opacity.toString());
  };

  const setCameraEnabled = (enabled: boolean) => {
    setCameraEnabledState(enabled);
    localStorage.setItem('cameraEnabled', enabled.toString());
  };

  const setShowCourseRecord = (show: boolean) => {
    setShowCourseRecordState(show);
    localStorage.setItem('showCourseRecord', show.toString());
  };

  const setShowCourseName = (show: boolean) => {
    setShowCourseNameState(show);
    localStorage.setItem('showCourseName', show.toString());
  };

  const setX01StartingScore = (score: number) => {
    setX01StartingScoreState(score);
    localStorage.setItem('x01StartingScore', score.toString());
  };

  const setX01DoubleIn = (enabled: boolean) => {
    setX01DoubleInState(enabled);
    localStorage.setItem('x01DoubleIn', enabled.toString());
  };

  const setX01DoubleOut = (enabled: boolean) => {
    setX01DoubleOutState(enabled);
    localStorage.setItem('x01DoubleOut', enabled.toString());
  };

  const setX01AverageMode = (mode: 'per-turn' | 'per-dart') => {
    setX01AverageModeState(mode);
    localStorage.setItem('x01AverageMode', mode);
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
    tieBreakerEnabled,
    setTieBreakerEnabled,
    golfCourseName,
    setGolfCourseName,
    courseBannerImage,
    setCourseBannerImage,
    courseBannerOpacity,
    setCourseBannerOpacity,
    cameraEnabled,
    setCameraEnabled,
    showCourseRecord,
    setShowCourseRecord,
    showCourseName,
    setShowCourseName,
    x01StartingScore,
    setX01StartingScore,
    x01DoubleIn,
    setX01DoubleIn,
    x01DoubleOut,
    setX01DoubleOut,
    x01AverageMode,
    setX01AverageMode,
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
