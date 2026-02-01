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
}

export interface LocalPlayersStorage {
  version: string;
  players: StoredPlayer[];
  updatedAt: Date;
}

export interface SelectedPlayersStorage {
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
