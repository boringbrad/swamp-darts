'use client';

import { useState, useCallback } from 'react';

export interface KONumbers {
  [playerId: string]: number;
}

export interface UseKONumbersReturn {
  koNumbers: KONumbers;
  incrementKO: (playerId: string) => void;
  decrementKO: (playerId: string) => void;
  setKONumber: (playerId: string, value: number) => void;
  randomizeKONumbers: (playerIds: string[]) => void;
  initializeKONumbers: (playerIds: string[], initialValues?: KONumbers) => void;
}

/**
 * Hook for managing KO numbers (1-20) for Cricket game players
 * Ensures uniqueness and handles increment/decrement with bounds checking
 */
export function useKONumbers(initialNumbers: KONumbers = {}): UseKONumbersReturn {
  const [koNumbers, setKONumbers] = useState<KONumbers>(initialNumbers);

  /**
   * Initialize KO numbers for a list of players
   */
  const initializeKONumbers = useCallback((playerIds: string[], initialValues?: KONumbers) => {
    if (initialValues) {
      setKONumbers(initialValues);
    } else {
      // Assign sequential numbers starting from 1
      const numbers: KONumbers = {};
      playerIds.forEach((id, index) => {
        numbers[id] = Math.min(index + 1, 20);
      });
      setKONumbers(numbers);
    }
  }, []);

  /**
   * Increment KO number for a player (max 20)
   * If number is already taken, find next available number
   */
  const incrementKO = useCallback((playerId: string) => {
    setKONumbers((prev) => {
      const currentValue = prev[playerId] || 1;
      if (currentValue >= 20) return prev;

      const usedNumbers = new Set(Object.entries(prev)
        .filter(([id]) => id !== playerId)
        .map(([_, num]) => num));

      let nextValue = currentValue + 1;
      while (nextValue <= 20 && usedNumbers.has(nextValue)) {
        nextValue++;
      }

      if (nextValue > 20) return prev; // No available number found

      return { ...prev, [playerId]: nextValue };
    });
  }, []);

  /**
   * Decrement KO number for a player (min 1)
   * If number is already taken, find next available number
   */
  const decrementKO = useCallback((playerId: string) => {
    setKONumbers((prev) => {
      const currentValue = prev[playerId] || 1;
      if (currentValue <= 1) return prev;

      const usedNumbers = new Set(Object.entries(prev)
        .filter(([id]) => id !== playerId)
        .map(([_, num]) => num));

      let nextValue = currentValue - 1;
      while (nextValue >= 1 && usedNumbers.has(nextValue)) {
        nextValue--;
      }

      if (nextValue < 1) return prev; // No available number found

      return { ...prev, [playerId]: nextValue };
    });
  }, []);

  /**
   * Set a specific KO number for a player
   * Validates range (1-20) and ensures uniqueness
   */
  const setKONumber = useCallback((playerId: string, value: number) => {
    if (value < 1 || value > 20) return;

    setKONumbers((prev) => {
      // Check if number is already used by another player
      const isUsed = Object.entries(prev).some(
        ([id, num]) => id !== playerId && num === value
      );

      if (isUsed) return prev; // Number already taken

      return { ...prev, [playerId]: value };
    });
  }, []);

  /**
   * Randomize KO numbers for all players
   * Ensures each player gets a unique number from 1-20
   */
  const randomizeKONumbers = useCallback((playerIds: string[]) => {
    const availableNumbers = Array.from({ length: 20 }, (_, i) => i + 1);

    // Shuffle available numbers using Fisher-Yates algorithm
    for (let i = availableNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableNumbers[i], availableNumbers[j]] = [availableNumbers[j], availableNumbers[i]];
    }

    const newNumbers: KONumbers = {};
    playerIds.forEach((id, index) => {
      newNumbers[id] = availableNumbers[index];
    });

    setKONumbers(newNumbers);
  }, []);

  return {
    koNumbers,
    incrementKO,
    decrementKO,
    setKONumber,
    randomizeKONumbers,
    initializeKONumbers,
  };
}
