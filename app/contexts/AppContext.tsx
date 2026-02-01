'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppContextValue } from '../types/context';
import { UserProfile, CricketRules, PlayMode } from '../types/game';
import { SelectedPlayersStorage } from '../types/storage';
import { storage, initializeApp } from '../lib/storage';
import { playerStorage } from '../lib/playerStorage';
import { createClient } from '../lib/supabase/client';

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
  const [tieBreakerEnabled, setTieBreakerEnabledState] = useState(true);
  const [golfCourseName, setGolfCourseNameState] = useState('SWAMPY MEADOWS');
  const [courseBannerImage, setCourseBannerImageState] = useState('');
  const [courseBannerOpacity, setCourseBannerOpacityState] = useState(50);
  const [cameraEnabled, setCameraEnabledState] = useState(false);
  const [showCourseRecord, setShowCourseRecordState] = useState(true);
  const [showCourseName, setShowCourseNameState] = useState(true);

  // Load initial state from storage on mount and listen for auth changes
  useEffect(() => {
    const supabase = createClient();

    const loadUserProfile = async (userId: string) => {
      console.log('AppContext: Loading profile for user', userId);

      try {
        // Fetch user profile from Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        console.log('AppContext: Profile fetch result', {
          hasProfile: !!profile,
          profileData: profile,
          error: error,
          errorMessage: error?.message,
          errorDetails: error?.details
        });

        if (profile && !error) {
        // Convert Supabase profile to UserProfile format
        const userProfile: UserProfile = {
          id: profile.id,
          username: profile.username || profile.display_name.toLowerCase().replace(/\s+/g, '-'),
          displayName: profile.display_name,
          avatar: profile.avatar || 'avatar-1',
          photoUrl: profile.photo_url || null,
          accountType: profile.account_type || 'player',
          friends: [],
          clubs: [],
          stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            cricketStats: {
              gamesPlayed: 0,
              gamesWon: 0,
              averageMPR: 0,
            },
            golfStats: {
              gamesPlayed: 0,
              gamesWon: 0,
              averageScore: 0,
            },
          },
        } as any;

        console.log('AppContext: Setting user profile', userProfile);
        storage.setUserProfile(userProfile);
        setUserProfile(userProfile);

        // Check if a player with this display name already exists
        const allPlayers = playerStorage.getAllPlayers();
        const existingPlayer = allPlayers.find(
          p => p.name.toLowerCase() === userProfile.displayName.toLowerCase()
        );

        // Migration: Assign any existing players without createdBy to this user
        const playersToMigrate = allPlayers.filter(p => !p.createdBy);
        if (playersToMigrate.length > 0) {
          console.log('AppContext: Migrating existing players to user', userId);
          playersToMigrate.forEach(player => {
            // Only migrate if it matches the user's display name or is a guest player
            if (player.name.toLowerCase() === userProfile.displayName.toLowerCase() || player.isGuest) {
              playerStorage.updatePlayer(player.id, { createdBy: userId });
            }
          });
        }

        if (!existingPlayer) {
          // Create a new player with the user's display name and avatar
          console.log('AppContext: Creating player for user', userProfile.displayName);
          const newPlayer = playerStorage.addPlayer(
            userProfile.displayName,
            userProfile.avatar,
            false, // Not a guest player
            userId // User ID of the owner
          );

          // Update with photoUrl if present
          if (userProfile.photoUrl) {
            playerStorage.updatePlayer(newPlayer.id, { photoUrl: userProfile.photoUrl });
          }

          // Dispatch event to notify PlayerContext to refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('playersChanged'));
          }
          } else {
            console.log('AppContext: Player already exists', existingPlayer.name);
            // Update existing player's photoUrl if it has changed
            if (userProfile.photoUrl && existingPlayer.photoUrl !== userProfile.photoUrl) {
              console.log('AppContext: Updating existing player photoUrl');
              playerStorage.updatePlayer(existingPlayer.id, {
                photoUrl: userProfile.photoUrl,
                avatar: userProfile.avatar
              });
              // Dispatch event to notify PlayerContext to refresh
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('playersChanged'));
              }
            }
          }
        } else if (error) {
          console.error('AppContext: Error fetching profile', error);
        } else {
          console.warn('AppContext: No profile found and no error', { userId });
        }
      } catch (err) {
        console.error('AppContext: Exception loading profile', err);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AppContext: Auth state changed', { event, hasSession: !!session, userId: session?.user?.id });

      if (session?.user) {
        // User is logged in, fetch their profile
        await loadUserProfile(session.user.id);
      } else {
        // User is not logged in, use default profile
        console.log('AppContext: No session, using default profile');

        // Clean up guest players from localStorage on logout
        // Note: Guest data persists in Supabase for admin analytics
        // This just clears the local cache to keep UI clean for logged-out users
        console.log('AppContext: Clearing guest players from localStorage');
        playerStorage.cleanupGuestPlayers();

        // Dispatch event to notify PlayerContext to refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('playersChanged'));
        }

        const isFirstTime = initializeApp();

        if (isFirstTime) {
          // Create default user profile
          const defaultProfile: UserProfile = {
            id: 'default-user',
            username: 'the-mayor',
            displayName: 'THE MAYOR',
            avatar: 'avatar-1',
            friends: [],
            clubs: [],
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              cricketStats: {
                gamesPlayed: 0,
                gamesWon: 0,
                averageMPR: 0,
              },
              golfStats: {
                gamesPlayed: 0,
                gamesWon: 0,
                averageScore: 0,
              },
            },
          };

          storage.setUserProfile(defaultProfile);
          setUserProfile(defaultProfile);
        } else {
          // Load existing data from localStorage
          const profile = storage.getUserProfile();
          setUserProfile(profile);
        }
      }
    });

    // Also check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AppContext: Initial session check', { hasSession: !!session, userId: session?.user?.id });

      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        console.log('AppContext: No session found on mount, loading from localStorage');
        // Fallback to localStorage
        const isFirstTime = initializeApp();

        if (isFirstTime) {
          // Create default user profile
          const defaultProfile: UserProfile = {
            id: 'default-user',
            username: 'the-mayor',
            displayName: 'THE MAYOR',
            avatar: 'avatar-1',
            friends: [],
            clubs: [],
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              cricketStats: {
                gamesPlayed: 0,
                gamesWon: 0,
                averageMPR: 0,
              },
              golfStats: {
                gamesPlayed: 0,
                gamesWon: 0,
                averageScore: 0,
              },
            },
          };

          storage.setUserProfile(defaultProfile);
          setUserProfile(defaultProfile);
        } else {
          // Load existing data from localStorage
          const profile = storage.getUserProfile();
          console.log('AppContext: Loaded profile from localStorage', profile);
          setUserProfile(profile);
        }
      }
    });

    // Load other state
    setHeaderVisible(storage.getHeaderVisible());
    setSelectedPlayersState(storage.getSelectedPlayers());
    setCricketRulesState(storage.getCricketRules());
    setPlayModeState(storage.getPlayMode());

    // Load golf course name from localStorage
    const savedCourseName = localStorage.getItem('golfCourseName');
    if (savedCourseName) {
      setGolfCourseNameState(savedCourseName);
    }

    // Load course banner settings from localStorage
    const savedBannerImage = localStorage.getItem('courseBannerImage');
    if (savedBannerImage) {
      setCourseBannerImageState(savedBannerImage);
    }

    const savedBannerOpacity = localStorage.getItem('courseBannerOpacity');
    if (savedBannerOpacity) {
      setCourseBannerOpacityState(parseInt(savedBannerOpacity));
    }

    // Load camera enabled setting from localStorage
    const savedCameraEnabled = localStorage.getItem('cameraEnabled');
    if (savedCameraEnabled !== null) {
      setCameraEnabledState(savedCameraEnabled === 'true');
    }

    // Load show course record setting from localStorage
    const savedShowCourseRecord = localStorage.getItem('showCourseRecord');
    if (savedShowCourseRecord !== null) {
      setShowCourseRecordState(savedShowCourseRecord === 'true');
    }

    // Load show course name setting from localStorage
    const savedShowCourseName = localStorage.getItem('showCourseName');
    if (savedShowCourseName !== null) {
      setShowCourseNameState(savedShowCourseName === 'true');
    }

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
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

    console.log('AppContext: Starting profile update', { userId: prevProfile.id, updates });

    try {
      // 1. Update Supabase first if user is logged in
      if (prevProfile.id !== 'default-user') {
        console.log('AppContext: Updating Supabase profile');

        const supabaseUpdates: any = {
          display_name: updates.displayName || prevProfile.displayName,
        };

        // Handle avatar vs photo_url
        if ((updates as any).photoUrl !== undefined) {
          supabaseUpdates.photo_url = (updates as any).photoUrl;
          supabaseUpdates.avatar = (updates as any).avatar || null;
        } else if (updates.avatar !== undefined) {
          supabaseUpdates.avatar = updates.avatar;
          // Only clear photo_url if explicitly set to null in updates
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

        console.log('AppContext: Supabase profile updated successfully');
      }

      // 2. Update local player if display name, avatar, or photoUrl changed
      if (updates.displayName || updates.avatar || (updates as any).photoUrl !== undefined) {
        const allPlayers = playerStorage.getAllPlayers();
        const oldPlayer = allPlayers.find(
          p => p.name.toLowerCase() === prevProfile.displayName.toLowerCase()
        );

        if (oldPlayer) {
          const playerUpdates: any = {};

          if (updates.displayName) {
            playerUpdates.name = updates.displayName;
          }

          if (updates.avatar) {
            playerUpdates.avatar = updates.avatar;
          }

          if ((updates as any).photoUrl !== undefined) {
            playerUpdates.photoUrl = (updates as any).photoUrl;
          }

          console.log('AppContext: Updating local player', {
            oldName: oldPlayer.name,
            updates: playerUpdates
          });

          playerStorage.updatePlayer(oldPlayer.id, playerUpdates);

          console.log('AppContext: Local player updated successfully');
        } else {
          console.warn('AppContext: Could not find local player to update', prevProfile.displayName);
        }
      }

      // 3. Update local state and storage last
      const updated = { ...prevProfile, ...updates };
      storage.setUserProfile(updated);
      setUserProfile(updated);

      // 4. Dispatch event to refresh player list
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('playersChanged'));
      }

      console.log('AppContext: Profile update complete', updated);
    } catch (error) {
      console.error('AppContext: Failed to update profile', error);
      // Don't update local state if Supabase update failed
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
