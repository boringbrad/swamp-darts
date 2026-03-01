/**
 * Storage-specific type definitions
 */

import { Player } from './game';

export interface StoredPlayer extends Player {
  id: string;
  name: string;
  avatar?: string;
  photoUrl?: string; // Custom photo uploaded or taken by camera
  isGuest: boolean;
  createdBy?: string; // User ID of the player who created this player/guest
  addedDate: Date;
  lastUsed?: Date;
  // Verified session player fields (only set for friends added via local session invite)
  isVerified?: boolean;       // true = linked to a real Supabase account
  sessionExpiresAt?: string;  // ISO string — when this player's session expires
  userId?: string;            // Their actual auth user_id (for stat attribution)
}

export interface SessionPlayer {
  userId: string;       // Supabase auth user_id
  displayName: string;
  avatar?: string;
  photoUrl?: string;
  joinedAt: string;     // ISO string
  expiresAt: string;    // ISO string (joinedAt + 8 hours)
}

export interface LocalPlayersStorage {
  version: string;
  players: StoredPlayer[];
  updatedAt: Date;
}

export interface SelectedPlayersStorage {
  x01?: {
    default?: {
      players: StoredPlayer[];
      isTeams: boolean;
    };
  };
  cricket: {
    singles?: {
      players: Player[];
      koNumbers: Record<string, number>;
    };
    'tag-team'?: {
      teams: [Player[], Player[]];
      koNumbers: Record<string, number>;
    };
    'triple-threat'?: {
      players: Player[];
      koNumbers: Record<string, number>;
    };
    'fatal-4-way'?: {
      players: Player[];
      koNumbers: Record<string, number>;
    };
  };
  golf: {
    'stroke-play'?: Player[];
    'match-play'?: Player[];
    'skins'?: Player[];
  };
}
