/**
 * Centralized localStorage management with type safety
 */

export const STORAGE_KEYS = {
  USER_PROFILE: 'swamp-darts:user-profile',
  LOCAL_PLAYERS: 'swamp-darts:local-players',
  HEADER_VISIBLE: 'swamp-darts:header-visible',
  SELECTED_PLAYERS: 'swamp-darts:selected-players', // sessionStorage
  CRICKET_RULES: 'swamp-darts:cricket-rules',
  PLAY_MODE: 'swamp-darts:play-mode',
  APP_VERSION: 'swamp-darts:app-version',
} as const;

const CURRENT_VERSION = '1.0';

/**
 * Generic storage helper with error handling
 */
function getItem<T>(key: string, defaultValue: T, useSessionStorage = false): T {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const item = storage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T, useSessionStorage = false): void {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded. Consider clearing old data.');
    } else {
      console.error(`Error writing to storage (${key}):`, error);
    }
  }
}

function removeItem(key: string, useSessionStorage = false): void {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from storage (${key}):`, error);
  }
}

/**
 * Storage API
 */
export const storage = {
  // User Profile
  getUserProfile: () => getItem(STORAGE_KEYS.USER_PROFILE, null),
  setUserProfile: (profile: any) => setItem(STORAGE_KEYS.USER_PROFILE, profile),

  // Local Players
  getLocalPlayers: () => getItem(STORAGE_KEYS.LOCAL_PLAYERS, { version: '1.0', players: [], updatedAt: new Date() }),
  setLocalPlayers: (data: any) => setItem(STORAGE_KEYS.LOCAL_PLAYERS, data),

  // Header Visibility
  getHeaderVisible: () => getItem(STORAGE_KEYS.HEADER_VISIBLE, true),
  setHeaderVisible: (visible: boolean) => setItem(STORAGE_KEYS.HEADER_VISIBLE, visible),

  // Selected Players (sessionStorage)
  getSelectedPlayers: () => getItem(STORAGE_KEYS.SELECTED_PLAYERS, { cricket: {}, golf: {} }, true),
  setSelectedPlayers: (data: any) => setItem(STORAGE_KEYS.SELECTED_PLAYERS, data, true),

  // Cricket Rules (sessionStorage)
  getCricketRules: () => getItem(STORAGE_KEYS.CRICKET_RULES, { swampRules: true, noPoint: false, point: false }, true),
  setCricketRules: (rules: any) => setItem(STORAGE_KEYS.CRICKET_RULES, rules, true),

  // Play Mode (sessionStorage)
  getPlayMode: () => getItem(STORAGE_KEYS.PLAY_MODE, 'practice', true) as 'practice' | 'casual' | 'league',
  setPlayMode: (mode: 'practice' | 'casual' | 'league') => setItem(STORAGE_KEYS.PLAY_MODE, mode, true),

  // App Version
  getAppVersion: () => getItem(STORAGE_KEYS.APP_VERSION, ''),
  setAppVersion: (version: string) => setItem(STORAGE_KEYS.APP_VERSION, version),

  // Clear all
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      removeItem(key);
      removeItem(key, true);
    });
  },
};

/**
 * Initialize app on first load - migrate mock data
 */
export function initializeApp() {
  const version = storage.getAppVersion();

  if (!version || version !== CURRENT_VERSION) {
    console.log('Initializing app for the first time...');

    // Set version
    storage.setAppVersion(CURRENT_VERSION);

    // Migration will be handled by PlayerContext
    // Just set the flag here
    return true; // First time
  }

  return false; // Not first time
}
