/**
 * Royal Rumble Game Type Definitions
 */

export type PlayerStatus = 'not-entered' | 'active' | 'eliminated';

export interface RoyalRumblePlayer {
  playerId: string;
  playerName: string;
  entryNumber: number; // Order entering the game (1-based)
  koNumber: number; // Number to hit (1-20)
  status: PlayerStatus;
  hitsReceived: number; // 0-10 (10 = eliminated)
  songUrl?: string; // Blob URL for uploaded file, or Spotify link
  hasEnteredGame: boolean; // Whether they've actually entered yet
}

export interface RoyalRumbleSettings {
  songDuration: number; // seconds (default 30)
  timeBetweenPlayers: number; // seconds (default 120)
  timeUntilNoHeal: number; // seconds (default 300 = 5 minutes)
  songsEnabled: boolean; // Toggle for song playback
  buzzerEnabled: boolean; // Toggle for buzzer/airhorn sound before player entry
  koNumbersMatchEntry: boolean; // KO number = entry number
  useUserOrder: boolean; // false = random entry order, true = user-defined
}

export interface RoyalRumbleDart {
  dartNumber: 1 | 2 | 3;
  targetNumber: number | 'MISS'; // 1-20 or MISS
  playerHit?: string; // playerId of player hit (if any)
  isHeal: boolean; // true if player hit their own number
  strikeChange: number; // +1, +2 (attack), -1, -2 (heal), or 0 (MISS/inactive)
}

export interface RoyalRumbleTurn {
  turnNumber: number;
  playerId: string;
  playerName: string;
  darts: RoyalRumbleDart[];
  eliminationsCaused: string[]; // playerIds of players eliminated this turn
  timestamp: string;
}

export interface RoyalRumbleGameState {
  players: RoyalRumblePlayer[];
  settings: RoyalRumbleSettings;
  currentPlayerIndex: number; // Index in players array of current thrower
  nextEntryIndex: number; // Index of next player to enter
  gameStartTime: string; // ISO timestamp
  lastEntryTime: string | null; // ISO timestamp of last player entry
  noHealActive: boolean; // Whether no-heal mode is active
  isPaused: boolean;
  currentTurn: RoyalRumbleTurn | null;
  history: RoyalRumbleTurn[];
  winnerId: string | null;
  isPlayingSong: boolean;
  currentSongPlayer: string | null; // playerId of player whose song is playing
}

export interface RoyalRumbleMatch {
  matchId: string;
  date: string; // ISO date string
  winnerId: string;
  players: {
    playerId: string;
    playerName: string;
    entryNumber: number;
    koNumber: number;
    finalHits: number;
    wasEliminated: boolean;
    eliminationOrder?: number; // 1 = first eliminated, etc.
    totalDarts: number;
    successfulHits: number; // Darts that landed on active numbers
    accuracy: number; // percentage
    strikesDealt: number; // Total damage to others
    healingReceived: number; // Total healing on self
    eliminationsCaused: number;
  }[];
  settings: RoyalRumbleSettings;
  totalTurns: number;
  gameDuration: number; // milliseconds
  history: RoyalRumbleTurn[];
}

export interface RoyalRumblePlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number; // Percentage (0-100)

  // Performance stats
  averageAccuracy: number;
  bestAccuracy: number;
  averageStrikesDealt: number;
  averageHealingReceived: number;
  totalEliminations: number;
  avgEliminationsPerGame: number;

  // Survival stats
  timesEliminated: number;
  averageFinishPosition: number; // 1 = winner, 2 = runner-up, etc.
  survivalRate: number; // % of games made it to final 2

  // Entry stats
  averageEntryNumber: number;
  winsByEntryPosition: {
    early: number; // entries 1-5
    middle: number; // entries 6-15
    late: number; // entries 16-20
  };

  // Number performance
  numberStats: {
    [koNumber: number]: {
      gamesPlayed: number;
      wins: number;
      averageAccuracy: number;
    };
  };
}
