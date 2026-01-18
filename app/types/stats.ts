/**
 * Stats and Match Data type definitions
 */

import { CricketVariant, CricketRules, CricketNumber, CricketMarks } from './game';

// Golf Match Data (saved to localStorage)
export interface GolfMatch {
  matchId: string;
  variant: 'stroke-play' | 'match-play' | 'skins';
  courseName: string;
  playMode: 'practice' | 'casual' | 'league'; // Track play mode
  date: string; // ISO date string
  winnerId: string;
  wonByTieBreaker: boolean;
  players: {
    playerId: string;
    playerName: string;
    holeScores: (number | null)[]; // 18 holes
    totalScore: number;
    tieBreakerScores?: (number | null)[]; // If tie breaker was used
    matchPlayPoints?: number; // For match play variant
    skinsPoints?: number; // For skins variant
  }[];
}

// Cricket Match Data (saved to localStorage)
export interface CricketMatch {
  matchId: string;
  variant: CricketVariant;
  rules: CricketRules;
  date: string; // ISO date string
  winnerId: string | null; // null for ties
  winnerTeamIds?: string[]; // For team games (doubles)
  players: {
    playerId: string;
    playerName: string;
    teamId?: string; // For doubles
    finalMarks: Record<CricketNumber, number>;
    finalPoints: number;
    koPoints: number;
    isEliminated: boolean;

    // Detailed stats from history
    totalDarts: number;
    totalMarks: number;
    mpr: number; // marks per round (3 darts)
    accuracy: number; // percentage of darts that scored

    // Skip stats
    playersSkipped: number;
    timesSkipped: number;

    // PIN stats
    pinAttempts: number; // Hit 1 or 2 marks
    pinKickouts: number; // Reversed opponent's PIN count to 0
    pinCloseouts: number; // Successfully hit 3rd mark

    // KO stats (for Triple Threat/Fatal 4 Way)
    koPointsGiven: number; // KO points this player caused to others
    koEliminationsCaused: number; // Players eliminated by this player

    // Target performance
    targetStats: {
      [target: string]: {
        dartsThrown: number;
        marksScored: number;
        accuracy: number;
      };
    };

    // Streaks
    longestDartStreak: number; // Max consecutive bonus dart turns in this game
  }[];

  // Game-level metadata
  totalRounds: number;
  gameDuration?: number; // milliseconds

  // Store complete history for detailed analysis
  history: any[]; // HistoryEntry[] - using any to avoid circular dependencies
}

// Golf Player Statistics (calculated from matches)
export interface GolfPlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number; // Percentage (0-100)
  averageScore: number;
  bestScore: number; // Lowest
  worstScore: number; // Highest
  tieBreakerWins: number;

  // Hole-specific stats
  holeAverages: number[]; // Average score for each of 18 holes
  holeScoreDistribution: {
    [holeNumber: number]: { // 0-17 (hole indices)
      [score: number]: number; // Score -> frequency percentage (0-100)
    };
  };

  // Course-specific stats
  courseStats?: {
    [courseName: string]: {
      gamesPlayed: number;
      averageScore: number;
      bestScore: number;
    };
  };

  // Variant-specific stats
  variantStats: {
    'stroke-play': {
      gamesPlayed: number;
      wins: number;
      averageScore: number;
    };
    'match-play': {
      gamesPlayed: number;
      wins: number;
      averagePoints: number;
    };
    'skins': {
      gamesPlayed: number;
      wins: number;
      averagePoints: number;
    };
  };
}

// Cricket Player Statistics (calculated from matches)
export interface CricketPlayerStats {
  playerId: string;
  playerName: string;

  // Basic stats
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number; // Percentage (0-100)

  // Performance stats
  averageMPR: number; // Marks per round
  bestMPR: number;
  averageAccuracy: number;
  totalMarks: number;
  totalDarts: number;

  // Skip stats
  totalPlayersSkipped: number;
  totalTimesSkipped: number;
  avgPlayersSkippedPerGame: number;
  avgTimesSkippedPerGame: number;
  skipGivenByGame: { matchId: string; date: string; count: number }[];
  skipReceivedByGame: { matchId: string; date: string; count: number }[];

  // PIN stats
  totalPinAttempts: number;
  totalPinKickouts: number;
  totalPinCloseouts: number;
  pinSuccessRate: number; // closeouts / (attempts + closeouts)
  avgPinAttemptsPerGame: number;

  // KO stats (for Triple Threat/Fatal 4 Way)
  totalKOPointsGiven: number;
  totalKOEliminationsCaused: number;
  timesEliminated: number;
  avgKOPointsPerGame: number;

  // Target performance
  targetStats: {
    [target: string]: {
      dartsThrown: number;
      marksScored: number;
      accuracy: number;
      avgMarksPerGame: number;
    };
  };
  favoriteTarget: string; // Highest accuracy target
  weakestTarget: string; // Lowest accuracy target

  // Streaks
  longestDartStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: { type: 'win' | 'loss'; count: number };

  // Relationship stats
  biggestRivalry: {
    opponentId: string;
    opponentName: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    avgPointDifferential: number;
  } | null;

  bestPartner: {
    partnerId: string;
    partnerName: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
  } | null;

  // Head-to-head records
  headToHead: {
    [opponentId: string]: {
      opponentName: string;
      gamesPlayed: number;
      wins: number;
      losses: number;
      ties: number;
    };
  };

  // Efficiency stats
  avgRoundsToCloseTarget: number;
  perfectRounds: number; // Rounds where all 3 darts scored
  avgDartsPerMark: number;

  // Comeback stats
  comebackWins: number; // Games won after being behind

  // Variant-specific stats
  variantStats: {
    [key in CricketVariant]: {
      gamesPlayed: number;
      wins: number;
      averageMPR: number;
    };
  };
}

// Filter options for stats page
export interface StatsFilters {
  gameType: 'golf' | 'cricket';
  playerFilter: 'all' | string; // 'all' or specific playerId
  courseFilter?: 'all' | string; // Golf only: 'all' or specific course name
}
