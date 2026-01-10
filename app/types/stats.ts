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
  players: {
    playerId: string;
    playerName: string;
    finalMarks: Record<CricketNumber, CricketMarks>;
    finalPoints: number;
    totalMarks: number; // Sum of all marks (for MPR calculation)
  }[];
  roundsPlayed?: number; // For MPR calculation
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
  gamesPlayed: number;
  wins: number;
  winRate: number; // Percentage (0-100)
  averageMPR: number; // Marks per round
  bestMPR: number;
  totalMarks: number;

  // Number-specific stats
  numberStats: {
    [key in CricketNumber]: {
      timesHit: number; // Total marks across all games
      averageMarksPerGame: number;
      closedGames: number; // Games where this number was closed (3 marks)
    };
  };

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
