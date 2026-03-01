/**
 * Local Session Player Storage
 * Manages verified friends who have been invited to tonight's game session.
 * Session players expire after 8 hours and are stored separately from persistent guests.
 */

import { SessionPlayer } from '../types/storage';

const SESSION_KEY = 'swamp_darts_session_players';

function readStorage(): SessionPlayer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(players: SessionPlayer[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(players));
  } catch {
    // localStorage unavailable — silent fail
  }
}

export const localSession = {
  /**
   * Returns all session players that have not yet expired.
   */
  getSessionPlayers(): SessionPlayer[] {
    const now = new Date();
    return readStorage().filter(sp => new Date(sp.expiresAt) > now);
  },

  /**
   * Adds a session player. Replaces any existing entry for the same userId.
   */
  addSessionPlayer(player: SessionPlayer): void {
    const existing = readStorage().filter(sp => sp.userId !== player.userId);
    writeStorage([...existing, player]);
  },

  /**
   * Removes a session player by userId.
   */
  removeSessionPlayer(userId: string): void {
    writeStorage(readStorage().filter(sp => sp.userId !== userId));
  },

  /**
   * Removes all expired session players. Call on app mount to keep storage clean.
   */
  clearExpiredSessionPlayers(): void {
    const now = new Date();
    writeStorage(readStorage().filter(sp => new Date(sp.expiresAt) > now));
  },
};
