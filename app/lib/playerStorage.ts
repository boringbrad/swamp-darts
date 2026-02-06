/**
 * Player storage CRUD operations
 */

import { Player } from '../types/game';
import { StoredPlayer, LocalPlayersStorage } from '../types/storage';
import { storage } from './storage';
import { generateUUID } from './utils';
import { cleanupPlayerGolfMatches } from './golfStats';
import { cleanupPlayerCricketMatches } from './cricketStats';

/**
 * Default/mock players to initialize storage
 */
const DEFAULT_PLAYERS = [
  { name: 'Unknown User', avatar: 'avatar-1' },
  { name: 'PIPER ROSE', avatar: 'avatar-2' },
  { name: 'STOVE', avatar: 'avatar-3' },
  { name: 'PONCHO MAN', avatar: 'avatar-4' },
  { name: 'JASON', avatar: 'avatar-5' },
  { name: 'JASON', avatar: 'avatar-6' },
  { name: 'JASON', avatar: 'avatar-7' },
  { name: 'JASON', avatar: 'avatar-8' },
];

export const playerStorage = {
  /**
   * Get all players from storage
   */
  getAllPlayers(): StoredPlayer[] {
    const data = storage.getLocalPlayers() as LocalPlayersStorage;
    return data.players;
  },

  /**
   * Get a single player by ID
   */
  getPlayer(id: string): StoredPlayer | undefined {
    const players = this.getAllPlayers();
    return players.find(p => p.id === id);
  },

  /**
   * Add a new player
   */
  addPlayer(name: string, avatar?: string, isGuest = false, createdBy?: string): StoredPlayer {
    const newPlayer: StoredPlayer = {
      id: generateUUID(),
      name,
      avatar,
      isGuest,
      createdBy,
      addedDate: new Date(),
      lastUsed: new Date(),
    };

    const data = storage.getLocalPlayers() as LocalPlayersStorage;
    data.players.push(newPlayer);
    data.updatedAt = new Date();
    storage.setLocalPlayers(data);

    return newPlayer;
  },

  /**
   * Update an existing player
   */
  updatePlayer(id: string, updates: Partial<StoredPlayer>): void {
    const data = storage.getLocalPlayers() as LocalPlayersStorage;
    const index = data.players.findIndex(p => p.id === id);

    if (index !== -1) {
      data.players[index] = {
        ...data.players[index],
        ...updates,
      };
      data.updatedAt = new Date();
      storage.setLocalPlayers(data);
    }
  },

  /**
   * Delete a player
   * Also removes their golf and cricket match data from stats
   */
  deletePlayer(id: string): void {
    // Clean up match data for this player
    cleanupPlayerGolfMatches(id);
    cleanupPlayerCricketMatches(id);

    // Remove player from player list
    const data = storage.getLocalPlayers() as LocalPlayersStorage;
    data.players = data.players.filter(p => p.id !== id);
    data.updatedAt = new Date();
    storage.setLocalPlayers(data);

    // Dispatch custom event to refresh stats (for same-tab updates)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('statsRefresh'));
    }
  },

  /**
   * Update last used timestamp
   */
  updateLastUsed(id: string): void {
    this.updatePlayer(id, { lastUsed: new Date() });
  },

  /**
   * Clean up old guest players (optional - can be called on app start)
   */
  cleanupGuestPlayers(): void {
    const data = storage.getLocalPlayers() as LocalPlayersStorage;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    data.players = data.players.filter(p => {
      if (p.isGuest && p.lastUsed) {
        return new Date(p.lastUsed) > oneDayAgo;
      }
      return true;
    });

    data.updatedAt = new Date();
    storage.setLocalPlayers(data);
  },

  /**
   * Initialize storage with default players
   */
  initializeDefaultPlayers(userId?: string): void {
    const existing = this.getAllPlayers();
    if (existing.length === 0) {
      DEFAULT_PLAYERS.forEach(p => {
        this.addPlayer(p.name, p.avatar, false, userId);
      });
    }
  },
};
