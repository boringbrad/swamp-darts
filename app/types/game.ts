// Player types
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  photoUrl?: string;
  isGuest?: boolean;
  isGhost?: boolean; // Ghost player (computer fills in scores from best game)
  ghostBasePlayerId?: string; // Original player ID this ghost is based on
}

// Game mode types
export type GameMode = 'cricket' | 'golf' | 'extra' | 'tbd';
export type CricketVariant = 'singles' | 'tag-team' | 'triple-threat' | 'fatal-4-way';
export type GolfVariant = 'stroke-play' | 'match-play' | 'skins';
export type ExtraGameType = 'ladder' | 'elimination' | 'royal-rumble' | 'cage' | 'battle-royale' | 'x01';

// Cricket rules
export interface CricketRules {
  swampRules: boolean;
  noPoint: boolean;
  point: boolean;
  tornadoTag?: boolean; // For tag team
  enableKO?: boolean; // Enable K.O. Cricket (hit numbers and skip turn mechanic)
  enablePIN?: boolean; // Enable PIN mechanic (default win condition)
  enable3Darts3Marks?: boolean; // Enable 3 Darts/3 Marks bonus turn mechanic
  enableLadder?: boolean; // Enable Ladder Match (2 marks on all targets before clearing in order)
}

// Cricket scoring
export type CricketNumber = 15 | 16 | 17 | 18 | 19 | 20 | 'B' | 'T' | 'D'; // B for bullseye, T for triples, D for doubles
export type CricketMarks = 0 | 1 | 2 | 3; // Number of marks on a number

export interface CricketPlayerScore {
  playerId: string;
  marks: Record<CricketNumber, CricketMarks>;
  points: number;
}

export interface CricketTeam {
  name: string;
  playerIds: string[];
  color: 'blue' | 'red';
  marks: Record<CricketNumber, CricketMarks>;
  points: number;
}

// Golf scoring
export interface GolfHole {
  holeNumber: number;
  par: number;
  score?: number;
}

export interface GolfPlayerScore {
  playerId: string;
  holes: GolfHole[];
  totalScore: number;
}

// Game state
export interface GameState {
  id: string;
  mode: GameMode;
  variant: CricketVariant | GolfVariant | ExtraGameType;
  players: Player[];
  teams?: CricketTeam[]; // For team games
  currentPlayerIndex: number;
  venue?: string;
  dateStarted: Date;
  dateEnded?: Date;
  winnerId?: string;
  winnerTeamIndex?: number;
}

export interface CricketGameState extends GameState {
  mode: 'cricket';
  variant: CricketVariant;
  rules: CricketRules;
  scores: CricketPlayerScore[] | CricketTeam[];
  randomizedNumbers?: CricketNumber[];
}

export interface GolfGameState extends GameState {
  mode: 'golf';
  variant: GolfVariant;
  scores: GolfPlayerScore[];
  currentHole: number;
  courseId?: string; // Selected golf course
  courseName?: string; // Course name for display
}

// Play mode types
export type PlayMode = 'practice' | 'casual' | 'league';

// Venue and club types
export interface Venue {
  id: string;
  name: string;
  address?: string;
  courses: string[]; // Course IDs for golf boards at this venue
}

export interface GolfCourse {
  id: string;
  name: string;
  venueId?: string; // Optional link to venue
}

export interface Club {
  id: string;
  name: string;
  members: string[]; // Player IDs
  homeVenue?: string; // Venue ID
}

// User profile
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  photoUrl?: string | null;
  accountType?: string;
  friends: string[]; // User IDs
  clubs: string[]; // Club IDs
  stats: UserStats;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  cricketStats: {
    gamesPlayed: number;
    gamesWon: number;
    averageMPR?: number; // Marks per round
  };
  golfStats: {
    gamesPlayed: number;
    gamesWon: number;
    averageScore?: number;
    tieBreakerWins?: number;
  };
}
