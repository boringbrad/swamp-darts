/**
 * Context type definitions
 */

import { Player, UserProfile, CricketRules, PlayMode } from './game';
import { SelectedPlayersStorage, StoredPlayer } from './storage';

// Re-export types that are used by components
export type { UserProfile, CricketRules, PlayMode } from './game';
export type { StoredPlayer } from './storage';

export interface AppContextValue {
  // User Profile
  userProfile: UserProfile | null;
  updateUserProfile: (updates: Partial<UserProfile>) => void;

  // Header State
  headerVisible: boolean;
  toggleHeaderVisibility: () => void;

  // Navigation History
  navigationHistory: string[];
  pushRoute: (route: string) => void;
  popRoute: () => string | undefined;

  // Selected Players
  selectedPlayers: SelectedPlayersStorage;
  setSelectedPlayers: (mode: keyof SelectedPlayersStorage, variant: string, data: any) => void;
  clearSelectedPlayers: (mode: keyof SelectedPlayersStorage, variant: string) => void;

  // Cricket Rules
  cricketRules: CricketRules;
  setCricketRules: (rules: Partial<CricketRules>) => void;

  // Play Mode
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;

  // Tie Breaker
  tieBreakerEnabled: boolean;
  setTieBreakerEnabled: (enabled: boolean) => void;

  // Golf Course Name
  golfCourseName: string;
  setGolfCourseName: (name: string) => void;

  // Course Banner Settings
  courseBannerImage: string;
  setCourseBannerImage: (imageUrl: string) => void;
  courseBannerOpacity: number;
  setCourseBannerOpacity: (opacity: number) => void;

  // Camera Settings
  cameraEnabled: boolean;
  setCameraEnabled: (enabled: boolean) => void;

  // Course Record Display
  showCourseRecord: boolean;
  setShowCourseRecord: (show: boolean) => void;

  // Course Name Display
  showCourseName: boolean;
  setShowCourseName: (show: boolean) => void;

  // X01 Settings
  x01StartingScore: number;
  setX01StartingScore: (score: number) => void;
  x01DoubleIn: boolean;
  setX01DoubleIn: (enabled: boolean) => void;
  x01DoubleOut: boolean;
  setX01DoubleOut: (enabled: boolean) => void;
  x01AverageMode: 'per-turn' | 'per-dart';
  setX01AverageMode: (mode: 'per-turn' | 'per-dart') => void;
}

export interface PlayerContextValue {
  // Local Players
  localPlayers: StoredPlayer[];
  refreshPlayers: () => void;
  addLocalPlayer: (name: string, avatar?: string, isGuest?: boolean) => StoredPlayer;
  updateLocalPlayer: (id: string, updates: Partial<StoredPlayer>) => void;
  deleteLocalPlayer: (id: string) => void;

  // Guest Players (convenience methods)
  addGuestPlayer: (name: string, avatar?: string) => StoredPlayer;
  getGuestPlayers: () => StoredPlayer[];
  cleanupGuestPlayers: () => void;
}
