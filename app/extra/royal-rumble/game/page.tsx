'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useAppContext } from '../../../contexts/AppContext';
import { usePlayerContext } from '../../../contexts/PlayerContext';
import {
  RoyalRumblePlayer,
  RoyalRumbleSettings,
  RoyalRumbleGameState,
  RoyalRumbleDart,
  RoyalRumbleTurn,
  RoyalRumbleMatch,
} from '../../../types/royalRumble';
import { playBuzzerSound } from '../../../lib/buzzerSound';

export default function RoyalRumbleGame() {
  const router = useRouter();
  const { cameraEnabled } = useAppContext();
  const { updateLocalPlayer } = usePlayerContext();
  const [gameState, setGameState] = useState<RoyalRumbleGameState | null>(null);
  const [currentDarts, setCurrentDarts] = useState<RoyalRumbleDart[]>([]);
  const [use2xMultiplier, setUse2xMultiplier] = useState(false);
  const autoCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [playerReadyToEnter, setPlayerReadyToEnter] = useState(false); // Flag when timer is 0 but waiting for turn to complete
  const [pendingNoHeal, setPendingNoHeal] = useState(false); // No heal timer hit 0, but waiting for current player to finish turn

  // Timer state
  const [timeToNextPlayer, setTimeToNextPlayer] = useState(0);
  const [timeUntilNoHeal, setTimeUntilNoHeal] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [dividerPosition, setDividerPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('royalRumbleCameraDividerPosition');
      return saved ? parseFloat(saved) : 50;
    }
    return 50;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('royalRumbleCameraZoom');
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });
  const [cameraPan, setCameraPan] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('royalRumbleCameraPan');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    }
    return { x: 0, y: 0 };
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize game from localStorage
  useEffect(() => {
    const setupData = localStorage.getItem('royalRumbleSetup');
    if (!setupData) {
      router.push('/extra/royal-rumble/setup');
      return;
    }

    const { players, settings } = JSON.parse(setupData);
    const now = new Date().toISOString();

    const initialState: RoyalRumbleGameState = {
      players,
      settings,
      currentPlayerIndex: 0,
      nextEntryIndex: 2, // First 2 already in game
      gameStartTime: now,
      lastEntryTime: now,
      noHealActive: false,
      isPaused: false,
      currentTurn: null,
      history: [],
      winnerId: null,
      isPlayingSong: false,
      currentSongPlayer: null,
    };

    setGameState(initialState);
    setTimeToNextPlayer(settings.timeBetweenPlayers);
    setTimeUntilNoHeal(settings.timeUntilNoHeal);
  }, [router]);

  // Listen for settings modal requesting game state and toggle pause events
  useEffect(() => {
    const handleRequestGameState = () => {
      if (gameState) {
        window.dispatchEvent(new CustomEvent('royalRumbleGameState', { detail: gameState }));
      }
    };

    const handleTogglePause = () => {
      togglePause();
    };

    window.addEventListener('requestRoyalRumbleGameState', handleRequestGameState);
    window.addEventListener('royalRumbleTogglePause', handleTogglePause);

    return () => {
      window.removeEventListener('requestRoyalRumbleGameState', handleRequestGameState);
      window.removeEventListener('royalRumbleTogglePause', handleTogglePause);
    };
  }, [gameState]);

  // Send game state updates to settings modal
  useEffect(() => {
    if (gameState) {
      window.dispatchEvent(new CustomEvent('royalRumbleGameState', { detail: gameState }));
    }
  }, [gameState]);

  // Timer management
  useEffect(() => {
    if (!gameState || gameState.isPaused || gameState.winnerId) {
      return;
    }

    const allPlayersEntered = gameState.nextEntryIndex >= gameState.players.length;

    timerIntervalRef.current = setInterval(() => {
      // Only countdown next player timer if not all players have entered
      if (!allPlayersEntered) {
        setTimeToNextPlayer((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }

      // Only countdown no heal timer AFTER all players have entered
      if (allPlayersEntered) {
        setTimeUntilNoHeal((prev) => {
          if (prev <= 0) {
            // Set pending no heal - will activate after current player finishes turn
            if (!gameState.noHealActive && !pendingNoHeal) {
              setPendingNoHeal(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState?.isPaused, gameState?.winnerId, gameState?.noHealActive, gameState?.nextEntryIndex, gameState?.players.length, pendingNoHeal]);

  // Check if next player should enter - set flag when timer reaches 0
  useEffect(() => {
    if (!gameState || gameState.isPaused || gameState.winnerId || gameState.isPlayingSong) {
      return;
    }

    if (timeToNextPlayer === 0 && gameState.nextEntryIndex < gameState.players.length && !playerReadyToEnter) {
      setPlayerReadyToEnter(true);
    }
  }, [timeToNextPlayer, gameState?.nextEntryIndex, gameState?.isPlayingSong, playerReadyToEnter]);

  // Handle new player entering
  const handlePlayerEntry = () => {
    if (!gameState) return;

    const enteringPlayer = gameState.players[gameState.nextEntryIndex];

    // Play song if enabled
    if (gameState.settings.songsEnabled && enteringPlayer.songUrl) {
      playSong(enteringPlayer);
    } else {
      // No song, add player immediately
      addPlayerToGame(enteringPlayer);
    }
  };

  // Play entrance song
  const playSong = (player: RoyalRumblePlayer) => {
    if (!gameState) return;

    setGameState({ ...gameState, isPlayingSong: true, currentSongPlayer: player.playerId });

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Play audio file (blob URL)
    if (player.songUrl) {
      const audio = new Audio(player.songUrl);
      audio.volume = 1.0; // Start at full volume

      audioRef.current = audio;

      const fadeOutDuration = 2; // 2 seconds fade out
      const songDuration = gameState.settings.songDuration;
      const fadeStartTime = songDuration - fadeOutDuration;

      let isFading = false;
      let fadeStarted = false;

      // Monitor playback time and handle fade out
      audio.ontimeupdate = () => {
        if (!audioRef.current || audioRef.current !== audio) return;

        const currentTime = audio.currentTime;

        // Start fading at fadeStartTime
        if (currentTime >= fadeStartTime && !fadeStarted) {
          fadeStarted = true;
          isFading = true;

          // Calculate how much time has passed since fade should have started
          const timeIntoFade = currentTime - fadeStartTime;
          const remainingFadeTime = fadeOutDuration - timeIntoFade;

          if (remainingFadeTime > 0) {
            // Start from current position in fade
            const initialVolume = remainingFadeTime / fadeOutDuration;
            audio.volume = Math.max(0, initialVolume);
          }
        }

        // Continue fading
        if (isFading && currentTime < songDuration) {
          const timeIntoFade = currentTime - fadeStartTime;
          const volumePercent = 1 - (timeIntoFade / fadeOutDuration);
          audio.volume = Math.max(0, Math.min(1, volumePercent));
        }

        // Stop at song duration
        if (currentTime >= songDuration) {
          audio.pause();
          audioRef.current = null;
          addPlayerToGame(player);
        }
      };

      audio.play().catch((error) => {
        console.error('Error playing song:', error);
        addPlayerToGame(player);
      });
    } else {
      addPlayerToGame(player);
    }
  };

  // Add player to game after song
  const addPlayerToGame = (player: RoyalRumblePlayer) => {
    if (!gameState) return;

    const updatedPlayers = gameState.players.map((p) => {
      if (p.playerId === player.playerId) {
        return { ...p, status: 'active' as const, hasEnteredGame: true };
      }
      return p;
    });

    const now = new Date().toISOString();

    setGameState({
      ...gameState,
      players: updatedPlayers,
      nextEntryIndex: gameState.nextEntryIndex + 1,
      lastEntryTime: now,
      isPlayingSong: false,
      currentSongPlayer: null,
    });

    // Reset timer for next player
    if (gameState.nextEntryIndex + 1 < gameState.players.length) {
      setTimeToNextPlayer(gameState.settings.timeBetweenPlayers);
    }
  };

  // Handle number button press
  const handleNumberPress = (number: number) => {
    if (!gameState || currentDarts.length >= 3 || gameState.winnerId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const activePlayers = gameState.players.filter((p) => p.status === 'active');
    const activeNumbers = activePlayers.map((p) => p.koNumber);

    // Check if number is active
    if (!activeNumbers.includes(number)) {
      // Miss
      addDart({
        dartNumber: (currentDarts.length + 1) as 1 | 2 | 3,
        targetNumber: number,
        playerHit: undefined,
        isHeal: false,
        strikeChange: 0,
      });
      return;
    }

    // Find which player was hit
    const hitPlayer = activePlayers.find((p) => p.koNumber === number);
    if (!hitPlayer) return;

    const isHeal = hitPlayer.playerId === currentPlayer.playerId;
    let strikeChange = 0;

    if (isHeal) {
      // Healing - remove strikes
      if (gameState.noHealActive) {
        // No heal mode - can't heal
        addDart({
          dartNumber: (currentDarts.length + 1) as 1 | 2 | 3,
          targetNumber: number,
          playerHit: hitPlayer.playerId,
          isHeal: false,
          strikeChange: 0,
        });
        return;
      }

      const multiplier = use2xMultiplier ? 2 : 1;
      const healAmount = Math.min(multiplier, hitPlayer.hitsReceived);
      strikeChange = -healAmount;
    } else {
      // Attack - add strikes
      const multiplier = use2xMultiplier ? 2 : 1;
      strikeChange = multiplier;
    }

    addDart({
      dartNumber: (currentDarts.length + 1) as 1 | 2 | 3,
      targetNumber: number,
      playerHit: hitPlayer.playerId,
      isHeal,
      strikeChange,
    });
  };

  // Handle MISS button
  const handleMiss = () => {
    if (!gameState || currentDarts.length >= 3 || gameState.winnerId) return;

    addDart({
      dartNumber: (currentDarts.length + 1) as 1 | 2 | 3,
      targetNumber: 'MISS',
      playerHit: undefined,
      isHeal: false,
      strikeChange: 0,
    });
  };

  // Save game to localStorage
  const saveGameToDatabase = (finalGameState: RoyalRumbleGameState) => {
    try {
      if (!finalGameState.winnerId) return;

      const gameDuration = new Date().getTime() - new Date(finalGameState.gameStartTime).getTime();

      // Calculate elimination order
      const eliminationOrder: Record<string, number> = {};
      let eliminationCount = 1;

      // Process history to find elimination order
      finalGameState.history.forEach(turn => {
        turn.eliminationsCaused.forEach(playerId => {
          if (!eliminationOrder[playerId]) {
            eliminationOrder[playerId] = eliminationCount++;
          }
        });
      });

      const matchData: RoyalRumbleMatch = {
        matchId: `RUMBLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString(),
        winnerId: finalGameState.winnerId,
        players: finalGameState.players.map(player => {
          // Calculate player stats from history
          const playerTurns = finalGameState.history.filter(h => h.playerId === player.playerId);

          let totalDarts = 0;
          let successfulHits = 0;
          let strikesDealt = 0;
          let healingReceived = 0;
          let eliminationsCaused = 0;

          playerTurns.forEach(turn => {
            turn.darts.forEach(dart => {
              totalDarts++;
              if (dart.playerHit && dart.strikeChange !== 0) {
                successfulHits++;
                if (dart.isHeal) {
                  healingReceived += Math.abs(dart.strikeChange);
                } else {
                  strikesDealt += dart.strikeChange;
                }
              }
            });
            eliminationsCaused += turn.eliminationsCaused.length;
          });

          const accuracy = totalDarts > 0 ? (successfulHits / totalDarts) * 100 : 0;

          return {
            playerId: player.playerId,
            playerName: player.playerName,
            entryNumber: player.entryNumber,
            koNumber: player.koNumber,
            finalHits: player.hitsReceived,
            wasEliminated: player.status === 'eliminated',
            eliminationOrder: eliminationOrder[player.playerId],
            totalDarts,
            successfulHits,
            accuracy,
            strikesDealt,
            healingReceived,
            eliminationsCaused,
          };
        }),
        settings: finalGameState.settings,
        totalTurns: finalGameState.history.length,
        gameDuration,
        history: finalGameState.history,
      };

      const existingMatches = JSON.parse(localStorage.getItem('royalRumbleMatches') || '[]');
      existingMatches.push(matchData);
      localStorage.setItem('royalRumbleMatches', JSON.stringify(existingMatches));
      console.log('Royal Rumble match saved:', matchData.matchId);

      // Update lastUsed timestamp for all players
      finalGameState.players.forEach(player => {
        updateLocalPlayer(player.playerId, { lastUsed: new Date() });
      });
    } catch (error) {
      console.error('Error saving Royal Rumble match:', error);
    }
  };

  // Auto-save when game ends
  useEffect(() => {
    if (gameState?.winnerId) {
      saveGameToDatabase(gameState);
    }
  }, [gameState?.winnerId]);

  // Add dart to current turn
  const addDart = (dart: RoyalRumbleDart) => {
    if (!gameState) return;

    console.log('addDart called, current darts length:', currentDarts.length, 'new dart:', dart);
    const newDarts = [...currentDarts, dart];

    // Immediately update player health in gameState
    let updatedGameState = gameState;
    if (dart.playerHit && dart.strikeChange !== 0) {
      const updatedPlayers = [...gameState.players];
      const playerIndex = updatedPlayers.findIndex((p) => p.playerId === dart.playerHit);

      if (playerIndex !== -1) {
        const newHits = Math.max(
          0,
          Math.min(10, updatedPlayers[playerIndex].hitsReceived + dart.strikeChange)
        );
        console.log('Updating player health from', updatedPlayers[playerIndex].hitsReceived, 'to', newHits);

        // Check for immediate elimination at 10 hits
        const isEliminated = newHits >= 10;

        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          hitsReceived: newHits,
          status: isEliminated ? 'eliminated' : updatedPlayers[playerIndex].status,
        };

        updatedGameState = {
          ...gameState,
          players: updatedPlayers,
        };
        setGameState(updatedGameState);
      }
    }

    // Update current darts
    console.log('Setting current darts to:', newDarts);
    setCurrentDarts(newDarts);

    // Auto-complete turn after 3 darts
    if (newDarts.length === 3) {
      console.log('3 darts thrown, scheduling auto-complete');
      // Clear any existing timer
      if (autoCompleteTimerRef.current) {
        clearTimeout(autoCompleteTimerRef.current);
      }

      autoCompleteTimerRef.current = setTimeout(() => {
        console.log('Executing completeTurnWithDarts');
        completeTurnWithDarts(newDarts, updatedGameState);
      }, 100);
    }
  };

  // Complete turn with explicit darts and game state
  const completeTurnWithDarts = (darts: RoyalRumbleDart[], currentGameState: RoyalRumbleGameState) => {
    console.log('completeTurnWithDarts called with darts:', darts);
    const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
    let updatedPlayers = [...currentGameState.players];
    const eliminationsCaused: string[] = [];
    let newNextEntryIndex = currentGameState.nextEntryIndex;
    let newPlayerInsertedIndex: number | null = null;
    let adjustedCurrentPlayerIndex = currentGameState.currentPlayerIndex;

    // Check for eliminations (health was already updated in addDart)
    updatedPlayers.forEach((player, index) => {
      if (player.hitsReceived >= 10 && player.status === 'active') {
        updatedPlayers[index] = {
          ...updatedPlayers[index],
          status: 'eliminated',
        };
        eliminationsCaused.push(player.playerId);
      }
    });

    // Activate no heal mode if pending (timer hit 0, now current player has finished their turn)
    let shouldActivateNoHeal = false;
    if (pendingNoHeal && !currentGameState.noHealActive) {
      shouldActivateNoHeal = true;
      setPendingNoHeal(false);
    }

    // If a player is ready to enter, trigger their entrance (with song if enabled)
    // They get INSERTED into the array right after the current player
    if (playerReadyToEnter && currentGameState.nextEntryIndex < currentGameState.players.length) {
      const enteringPlayerOriginalIndex = currentGameState.nextEntryIndex;
      const enteringPlayer = updatedPlayers[enteringPlayerOriginalIndex];

      // Play song if enabled, then add player
      if (currentGameState.settings.songsEnabled && enteringPlayer.songUrl) {
        // Save current state, then trigger song playback
        // The song playback will handle adding the player after
        const turn: RoyalRumbleTurn = {
          turnNumber: currentGameState.history.length + 1,
          playerId: currentPlayer.playerId,
          playerName: currentPlayer.playerName,
          darts,
          eliminationsCaused,
          timestamp: new Date().toISOString(),
        };

        // Update state without the new player yet, but save the turn
        setGameState({
          ...currentGameState,
          players: updatedPlayers,
          history: [...currentGameState.history, turn],
          noHealActive: shouldActivateNoHeal || currentGameState.noHealActive,
          isPlayingSong: true,
          currentSongPlayer: enteringPlayer.playerId,
        });
        setCurrentDarts([]);
        setUse2xMultiplier(false);
        setPlayerReadyToEnter(false);

        // Play the song - after it finishes, addPlayerToGameAfterSong will be called
        playEntranceSong(enteringPlayer, adjustedCurrentPlayerIndex);
        return; // Exit early - the rest will be handled after song
      }

      // No song - add player directly
      const enteringPlayerUpdated = {
        ...updatedPlayers[enteringPlayerOriginalIndex],
        status: 'active' as const,
        hasEnteredGame: true,
      };

      // Remove the player from their original position
      updatedPlayers.splice(enteringPlayerOriginalIndex, 1);

      // Calculate where to insert: right after the current player
      // But we need to adjust if the current player index was after the removed player
      let insertPosition = currentGameState.currentPlayerIndex + 1;
      if (enteringPlayerOriginalIndex < currentGameState.currentPlayerIndex) {
        // The removed player was before current player, so current player index shifts down by 1
        adjustedCurrentPlayerIndex = currentGameState.currentPlayerIndex - 1;
        insertPosition = adjustedCurrentPlayerIndex + 1;
      }

      // Insert the entering player right after the current player
      updatedPlayers.splice(insertPosition, 0, enteringPlayerUpdated);
      newPlayerInsertedIndex = insertPosition;

      newNextEntryIndex = currentGameState.nextEntryIndex + 1;
      setPlayerReadyToEnter(false);

      // Reset timer for next player if there are more
      if (newNextEntryIndex < currentGameState.players.length) {
        setTimeToNextPlayer(currentGameState.settings.timeBetweenPlayers);
      }

      console.log('New player inserted at position', insertPosition, 'right after current player at', adjustedCurrentPlayerIndex);
    }

    // Create turn record
    const turn: RoyalRumbleTurn = {
      turnNumber: currentGameState.history.length + 1,
      playerId: currentPlayer.playerId,
      playerName: currentPlayer.playerName,
      darts,
      eliminationsCaused,
      timestamp: new Date().toISOString(),
    };

    // Check for winner
    const activePlayers = updatedPlayers.filter((p) => p.status === 'active');
    const allEntered = newNextEntryIndex >= currentGameState.players.length;
    let winnerId: string | null = null;

    if (allEntered && activePlayers.length === 1) {
      winnerId = activePlayers[0].playerId;
    }

    // Determine next player
    let nextPlayerIndex: number;

    if (newPlayerInsertedIndex !== null) {
      // A new player just entered - they go next!
      nextPlayerIndex = newPlayerInsertedIndex;
      console.log('New player at index', newPlayerInsertedIndex, '- they go next');
    } else if (!winnerId) {
      // No new player, find next active player in rotation
      nextPlayerIndex = adjustedCurrentPlayerIndex;
      do {
        nextPlayerIndex = (nextPlayerIndex + 1) % updatedPlayers.length;
      } while (
        updatedPlayers[nextPlayerIndex].status !== 'active' &&
        activePlayers.length > 0
      );
    } else {
      nextPlayerIndex = adjustedCurrentPlayerIndex;
    }

    console.log('Completing turn, moving from player index', adjustedCurrentPlayerIndex, 'to', nextPlayerIndex);
    setGameState({
      ...currentGameState,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      nextEntryIndex: newNextEntryIndex,
      lastEntryTime: newPlayerInsertedIndex !== null ? new Date().toISOString() : currentGameState.lastEntryTime,
      history: [...currentGameState.history, turn],
      winnerId,
      noHealActive: shouldActivateNoHeal || currentGameState.noHealActive,
    });

    console.log('Clearing currentDarts');
    setCurrentDarts([]);
    setUse2xMultiplier(false);
  };

  // Play entrance song for a new player entering
  // IMPORTANT: Player is added IMMEDIATELY when music starts, not after
  const playEntranceSong = (player: RoyalRumblePlayer, currentPlayerIdx: number) => {
    if (!gameState) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Add player immediately - music plays while they're already in
    addPlayerToGameAfterSong(player, currentPlayerIdx);

    // Check if it's a Spotify link (can't play directly without SDK)
    if (player.songUrl && player.songUrl.includes('spotify.com')) {
      console.log('Spotify playback not yet implemented:', player.songUrl);
      // Just clear the song state after a brief delay
      setTimeout(() => {
        setGameState(prev => prev ? { ...prev, isPlayingSong: false, currentSongPlayer: null } : null);
      }, 2000);
      return;
    }

    // Play local file (base64 data URL) or other audio URL
    if (player.songUrl) {
      console.log('Playing entrance song for:', player.playerName);
      const audio = new Audio(player.songUrl);

      audio.addEventListener('canplaythrough', () => {
        console.log('Audio loaded, playing...');
        audio.play().catch((error) => {
          console.error('Error playing song:', error);
        });
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
      });

      audioRef.current = audio;

      // Stop song after duration
      setTimeout(() => {
        console.log('Song duration complete');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setGameState(prev => prev ? { ...prev, isPlayingSong: false, currentSongPlayer: null } : null);
      }, gameState.settings.songDuration * 1000);
    }
  };

  // Add player to game after their entrance song finishes
  const addPlayerToGameAfterSong = (player: RoyalRumblePlayer, currentPlayerIdx: number) => {
    setGameState((prevState) => {
      if (!prevState) return null;

      const updatedPlayers = [...prevState.players];
      const enteringPlayerOriginalIndex = prevState.nextEntryIndex;

      // Update the entering player's status
      const enteringPlayer = {
        ...updatedPlayers[enteringPlayerOriginalIndex],
        status: 'active' as const,
        hasEnteredGame: true,
      };

      // Remove the player from their original position
      updatedPlayers.splice(enteringPlayerOriginalIndex, 1);

      // Calculate where to insert: right after the current player
      let adjustedCurrentIdx = currentPlayerIdx;
      let insertPosition = currentPlayerIdx + 1;
      if (enteringPlayerOriginalIndex < currentPlayerIdx) {
        adjustedCurrentIdx = currentPlayerIdx - 1;
        insertPosition = adjustedCurrentIdx + 1;
      }

      // Insert the entering player right after the current player
      updatedPlayers.splice(insertPosition, 0, enteringPlayer);

      const newNextEntryIndex = prevState.nextEntryIndex + 1;

      // Reset timer for next player if there are more
      if (newNextEntryIndex < prevState.players.length) {
        setTimeToNextPlayer(prevState.settings.timeBetweenPlayers);
      }

      console.log('Player added after song at position', insertPosition);

      return {
        ...prevState,
        players: updatedPlayers,
        currentPlayerIndex: insertPosition, // New player goes next
        nextEntryIndex: newNextEntryIndex,
        lastEntryTime: new Date().toISOString(),
        isPlayingSong: false,
        currentSongPlayer: null,
      };
    });
  };


  // Undo last dart
  const handleUndo = () => {
    console.log('handleUndo called, currentDarts length:', currentDarts.length);
    if (!gameState) return;

    // If there are darts in current turn, undo the last dart
    if (currentDarts.length > 0) {
      console.log('Undoing dart from current turn');
      const lastDart = currentDarts[currentDarts.length - 1];

      // Reverse the health change
      if (lastDart.playerHit && lastDart.strikeChange !== 0) {
        const updatedPlayers = [...gameState.players];
        const playerIndex = updatedPlayers.findIndex((p) => p.playerId === lastDart.playerHit);

        if (playerIndex !== -1) {
          const newHits = Math.max(
            0,
            Math.min(10, updatedPlayers[playerIndex].hitsReceived - lastDart.strikeChange)
          );
          updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            hitsReceived: newHits,
          };

          setGameState({
            ...gameState,
            players: updatedPlayers,
          });
        }
      }

      // Remove the last dart from current turn
      setCurrentDarts(currentDarts.slice(0, -1));
    }
    // If no darts in current turn, undo the last dart from previous turn
    else if (gameState.history.length > 0) {
      const lastTurn = gameState.history[gameState.history.length - 1];

      // If the last turn has darts, undo just the last dart
      if (lastTurn.darts.length > 0) {
        const lastDart = lastTurn.darts[lastTurn.darts.length - 1];
        const updatedPlayers = [...gameState.players];

        // Reverse the health change for just this dart
        if (lastDart.playerHit && lastDart.strikeChange !== 0) {
          const playerIndex = updatedPlayers.findIndex((p) => p.playerId === lastDart.playerHit);
          if (playerIndex !== -1) {
            const newHits = Math.max(
              0,
              Math.min(10, updatedPlayers[playerIndex].hitsReceived - lastDart.strikeChange)
            );
            updatedPlayers[playerIndex] = {
              ...updatedPlayers[playerIndex],
              hitsReceived: newHits,
            };

            // Check if we need to un-eliminate this player
            if (lastTurn.eliminationsCaused.includes(lastDart.playerHit!)) {
              updatedPlayers[playerIndex] = {
                ...updatedPlayers[playerIndex],
                status: 'active',
              };
            }
          }
        }

        // If this was the only dart in the turn, go back to previous player and remove turn from history
        if (lastTurn.darts.length === 1) {
          // Find previous player (the one who threw this turn)
          const previousPlayerId = lastTurn.playerId;
          const prevPlayerIndex = updatedPlayers.findIndex((p) => p.playerId === previousPlayerId);

          setGameState({
            ...gameState,
            players: updatedPlayers,
            currentPlayerIndex: prevPlayerIndex,
            history: gameState.history.slice(0, -1),
            winnerId: null,
          });

          // Clear current darts since we're starting fresh on previous player's turn
          setCurrentDarts([]);
        } else {
          // Remove just the last dart from the turn and show remaining darts
          const remainingDarts = lastTurn.darts.slice(0, -1);
          const updatedHistory = [...gameState.history];
          const updatedTurn = {
            ...lastTurn,
            darts: remainingDarts,
            eliminationsCaused: lastTurn.eliminationsCaused.filter(
              (id) => id !== lastDart.playerHit
            ),
          };
          updatedHistory[updatedHistory.length - 1] = updatedTurn;

          // Go back to the player who threw this turn
          const previousPlayerId = lastTurn.playerId;
          const prevPlayerIndex = updatedPlayers.findIndex((p) => p.playerId === previousPlayerId);

          setGameState({
            ...gameState,
            players: updatedPlayers,
            currentPlayerIndex: prevPlayerIndex,
            history: updatedHistory,
            winnerId: null,
          });

          // Set current darts to show the remaining darts from the previous turn
          setCurrentDarts(remainingDarts);
        }
      }
    }
  };

  // Toggle pause
  const togglePause = () => {
    if (!gameState) return;
    setGameState({ ...gameState, isPaused: !gameState.isPaused });
  };

  // Camera stream management
  useEffect(() => {
    if (cameraEnabled && !cameraStream) {
      // Start camera
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
        .then(stream => {
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Error accessing camera:', err);
        });
    } else if (!cameraEnabled && cameraStream) {
      // Stop camera
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraEnabled, cameraStream]);

  // Update video source when stream changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Divider dragging handlers
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setDividerPosition(Math.min(Math.max(newPosition, 20), 80));
    }
  };

  const handleTouchStart = () => setIsDragging(true);
  const handleTouchEnd = () => setIsDragging(false);

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && containerRef.current && e.touches.length > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const newPosition = ((touch.clientX - rect.left) / rect.width) * 100;
      setDividerPosition(Math.min(Math.max(newPosition, 20), 80));
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging]);

  // Save camera settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('royalRumbleCameraDividerPosition', dividerPosition.toString());
    }
  }, [dividerPosition]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('royalRumbleCameraZoom', cameraZoom.toString());
    }
  }, [cameraZoom]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('royalRumbleCameraPan', JSON.stringify(cameraPan));
    }
  }, [cameraPan]);

  // Camera zoom and pan handlers
  const handleZoomIn = () => {
    setCameraZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setCameraZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setCameraZoom(1);
    setCameraPan({ x: 0, y: 0 });
  };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsPanning(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPanStart({ x: clientX - cameraPan.x, y: clientY - cameraPan.y });
  };

  const handlePanMove = (e: MouseEvent | TouchEvent) => {
    if (!isPanning) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setCameraPan({
      x: clientX - panStart.x,
      y: clientY - panStart.y,
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      window.addEventListener('touchmove', handlePanMove);
      window.addEventListener('touchend', handlePanEnd);
      return () => {
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
        window.removeEventListener('touchmove', handlePanMove);
        window.removeEventListener('touchend', handlePanEnd);
      };
    }
  }, [isPanning, panStart]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#1a5a5a] flex items-center justify-center">
        <div className="text-white text-4xl">Loading...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const activePlayers = gameState.players.filter((p) => p.status === 'active');
  const activeNumbers = activePlayers.map((p) => p.koNumber);

  return (
    <div className="min-h-screen bg-black">
      <Header title="ROYAL RUMBLE" />

      <main className="pt-20 px-4 pb-4 flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
        <div className="flex flex-1 gap-2" ref={containerRef}>
          {/* Camera View - Left Side */}
          {cameraEnabled && (
            <>
              <div className="bg-black flex items-center justify-center relative overflow-hidden rounded-lg" style={{ width: `${dividerPosition}%` }}>
                {/* Camera video container for pan/zoom */}
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-move"
                  onMouseDown={handlePanStart}
                  onTouchStart={handlePanStart}
                  style={{ touchAction: 'none' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain pointer-events-none"
                    style={{
                      transform: `scale(${cameraZoom}) translate(${cameraPan.x / cameraZoom}px, ${cameraPan.y / cameraZoom}px)`,
                      transformOrigin: 'center center'
                    }}
                  />
                </div>

                {/* Zoom controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                  <button
                    onClick={handleZoomIn}
                    className="w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors text-xl font-bold"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors text-xs"
                    title="Reset Zoom"
                  >
                    {Math.round(cameraZoom * 100)}%
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors text-xl font-bold"
                    title="Zoom Out"
                  >
                    −
                  </button>
                </div>

                {/* Show message if camera not loaded */}
                {!cameraStream && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Loading camera...
                  </div>
                )}
              </div>

              {/* Draggable Divider */}
              <div
                className="w-1 bg-gray-600 cursor-col-resize hover:bg-gray-400 transition-colors"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              />
            </>
          )}

          {/* Game Content - Right Side (or Full Width if camera disabled) */}
          <div
            className="flex flex-col flex-1"
            style={{ width: cameraEnabled ? `${100 - dividerPosition - 0.5}%` : '100%' }}
          >
            {/* TOP SECTION: Timer, Turn Info, Darts - Full Width, Large */}
            <div className="w-full mb-3">

              {/* Timer Row - Full Width */}
              <div className="w-full bg-[#2d2d2d] rounded-lg p-4 mb-2">
                <div className="flex items-center justify-center gap-8">
                  {/* Next Player Timer */}
                  {gameState.nextEntryIndex < gameState.players.length && (
                    <div className="text-center">
                      <div className="text-white text-3xl font-bold">NEXT PLAYER</div>
                      <div className="text-white font-bold" style={{ fontSize: '8rem' }}>
                        {Math.floor(timeToNextPlayer / 60)}:{String(timeToNextPlayer % 60).padStart(2, '0')}
                      </div>
                      {gameState.isPlayingSong && (
                        <div className="text-yellow-400 text-2xl mt-1">🎵 MUSIC PLAYING</div>
                      )}
                    </div>
                  )}

                  {/* No Heal Timer */}
                  {gameState.nextEntryIndex >= gameState.players.length && !gameState.noHealActive && !pendingNoHeal && (
                    <div className="text-center">
                      <div className="text-white text-3xl font-bold">NO HEAL IN</div>
                      <div className="text-white font-bold" style={{ fontSize: '8rem' }}>
                        {Math.floor(timeUntilNoHeal / 60)}:{String(timeUntilNoHeal % 60).padStart(2, '0')}
                      </div>
                    </div>
                  )}

                  {/* Pending No Heal - waiting for current player to finish */}
                  {pendingNoHeal && !gameState.noHealActive && (
                    <div className="text-center px-2">
                      <div className="text-orange-400 text-3xl font-bold animate-pulse">
                        NO HEAL ACTIVATES AFTER THIS TURN
                      </div>
                    </div>
                  )}

                  {/* No Heal Active */}
                  {gameState.noHealActive && (
                    <div className="text-center px-2">
                      <div className="text-red-500 text-4xl font-bold animate-pulse">⚠️ NO HEAL MODE ACTIVE ⚠️</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Winner Display */}
              {gameState.winnerId && (
                <div className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 text-center mb-2">
                  <div className="text-5xl mb-2">🏆</div>
                  <div className="text-white text-4xl font-bold mb-2">WINNER!</div>
                  <div className="text-white text-3xl mb-4">
                    {gameState.players.find((p) => p.playerId === gameState.winnerId)?.playerName}
                  </div>
                  <button
                    onClick={() => router.push('/extra/royal-rumble/setup')}
                    className="px-8 py-3 bg-white text-[#1a5a5a] text-2xl font-bold rounded hover:bg-gray-200 transition-colors"
                  >
                    NEW RUMBLE
                  </button>
                </div>
              )}

              {/* Current Player Turn Banner - Full Width */}
              {!gameState.winnerId && (
                <div className="w-full bg-green-600 rounded-lg p-5 mb-2 text-center">
                  <div className="text-black font-bold text-6xl">
                    {currentPlayer.playerName}'s Turn
                  </div>
                  <div className="text-black text-3xl opacity-70">
                    KO Number: {currentPlayer.koNumber}
                  </div>
                </div>
              )}

              {/* Darts Thrown - Full Width, Large */}
              {!gameState.winnerId && (
                <div className="w-full bg-[#2d2d2d] rounded-lg p-3">
                  <div className="grid grid-cols-3 gap-4">
                    {[0, 1, 2].map((index) => {
                      const dart = currentDarts[index];
                      return (
                        <div
                          key={index}
                          className="bg-[#1a1a1a] rounded-lg p-4 text-center min-h-[100px] flex items-center justify-center"
                        >
                          {dart ? (
                            <div>
                              <div className="text-white text-4xl font-bold mb-1">
                                {dart.targetNumber}
                              </div>
                              {dart.playerHit && (
                                <div
                                  className={`text-xl font-bold ${
                                    dart.isHeal ? 'text-blue-400' : 'text-red-400'
                                  }`}
                                >
                                  {dart.isHeal ? `HEAL ${-dart.strikeChange}` : `HIT ${dart.strikeChange}`}
                                </div>
                              )}
                              {dart.targetNumber !== 'MISS' && !dart.playerHit && (
                                <div className="text-gray-500 text-lg">INACTIVE</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-600 text-5xl">-</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* MIDDLE SECTION: Player Cards - Full Width, 5 Columns, Uniform Height */}
            <div className="w-full flex-1 mb-3 overflow-hidden">
              <div className="grid grid-cols-5 gap-3">
                {gameState.players
                  .filter((player) => player.status !== 'not-entered')
                  .slice(0, 20) // Max 20 players (5 cols x 4 rows)
                  .map((player, displayIndex) => {
                    // Calculate health bar color: No color until hits, then green → yellow → red
                    const healthPercent = player.hitsReceived / 10;
                    let healthColor = 'transparent';
                    if (player.hitsReceived > 0) {
                      // Green (0-3 hits) → Yellow (4-6 hits) → Red (7-10 hits)
                      if (healthPercent <= 0.3) {
                        // Green to yellow-green
                        const t = healthPercent / 0.3;
                        healthColor = `rgb(${Math.round(t * 200)}, 200, 50)`;
                      } else if (healthPercent <= 0.6) {
                        // Yellow-green to yellow
                        const t = (healthPercent - 0.3) / 0.3;
                        healthColor = `rgb(${Math.round(200 + t * 55)}, ${Math.round(200 - t * 30)}, 50)`;
                      } else {
                        // Yellow to red
                        const t = (healthPercent - 0.6) / 0.4;
                        healthColor = `rgb(255, ${Math.round(170 - t * 170)}, ${Math.round(50 - t * 50)})`;
                      }
                    }

                    // Determine background color - use yellow glow effect for active player
                    const isCurrentPlayer = player.playerId === currentPlayer.playerId;
                    const bgColor = player.status === 'eliminated'
                      ? 'bg-[#1a1a1a]'
                      : 'bg-[#666666]';

                    // Can click on active players (not eliminated)
                    const canClick = player.status === 'active' && !gameState.winnerId && currentDarts.length < 3;
                    const isHealClick = canClick && player.playerId === currentPlayer.playerId && !gameState.noHealActive;

                    return (
                      <button
                        key={player.playerId}
                        onClick={() => canClick && handleNumberPress(player.koNumber)}
                        disabled={!canClick}
                        className={`rounded-lg flex overflow-hidden ${bgColor} ${
                          player.status === 'eliminated' ? 'opacity-40' : ''
                        } ${isCurrentPlayer ? 'ring-4 ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.8)]' : ''} ${
                          canClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'
                        }`}
                        style={{ height: '100px' }}
                      >
                        {/* Left side - KO Number - fills the box, yellow bg for current player */}
                        <div className={`w-24 flex items-center justify-center ${isCurrentPlayer ? 'bg-yellow-400' : 'bg-black/30'}`}>
                          <span className={`font-black ${isCurrentPlayer ? 'text-black' : 'text-white'}`} style={{ fontSize: '3.5rem' }}>
                            {player.koNumber}
                          </span>
                        </div>

                        {/* Right side - Name (50%) and Health Bar (50%) - no padding, fills entire space */}
                        <div className="flex-1 flex flex-col">
                          {/* Top half - Name and Turn Order (50% height), yellow bg for current player */}
                          <div className={`h-1/2 flex items-center justify-between px-2 ${isCurrentPlayer ? 'bg-yellow-400' : 'bg-black/10'}`}>
                            <span
                              className={`font-bold truncate flex-1 ${
                                player.status === 'eliminated' ? 'line-through' : ''
                              } ${isCurrentPlayer ? 'text-black' : 'text-white'}`}
                              style={{ fontSize: '1.75rem' }}
                            >
                              {player.playerName}
                            </span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full ml-2 ${isCurrentPlayer ? 'bg-black/20 text-black' : 'bg-black/40 text-white'}`}
                              style={{ fontSize: '1.25rem' }}
                            >
                              {displayIndex + 1}
                            </span>
                          </div>

                          {/* Bottom half - Health Bar (50% height) */}
                          <div className="h-1/2 bg-[#1a1a1a] relative">
                            {/* Health fill - only show if hits > 0 */}
                            {player.hitsReceived > 0 && (
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${(player.hitsReceived / 10) * 100}%`,
                                  backgroundColor: healthColor,
                                }}
                              />
                            )}
                            {/* Centered text overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white text-xl font-bold drop-shadow-lg">
                                {player.hitsReceived}/10
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Number Keypad - Fixed at bottom like Golf */}
            {!gameState.winnerId && (
              <div className="bg-black rounded-t-lg p-4 mt-auto">
                {/* Number Grid - 2 rows of 10 */}
                <div className="grid grid-cols-10 gap-2">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((number) => {
                    const isActive = activeNumbers.includes(number);
                    const isHealNumber = number === currentPlayer.koNumber;
                    const playerWithNumber = gameState.players.find(p => p.koNumber === number && p.status !== 'not-entered');

                    // Disable heal button if no heal mode is active
                    const isHealDisabled = isHealNumber && gameState.noHealActive;

                    return (
                      <button
                        key={number}
                        onClick={() => handleNumberPress(number)}
                        disabled={currentDarts.length >= 3 || !isActive || isHealDisabled}
                        className={`rounded-lg text-lg font-bold transition-all flex flex-col items-center justify-center min-h-[105px] ${
                          isHealDisabled
                            ? 'bg-[#444444] text-gray-600 cursor-not-allowed' // Grey out heal when no heal active
                            : isActive
                              ? isHealNumber
                                ? 'bg-[#666666] text-white hover:bg-yellow-600 opacity-50'
                                : 'bg-[#666666] text-white hover:bg-green-700'
                              : 'bg-[#444444] text-gray-600 cursor-not-allowed'
                        } disabled:opacity-50`}
                      >
                        <div className="text-4xl font-bold">{number}</div>
                        {playerWithNumber && (
                          <div className="text-xs mt-1 truncate max-w-full px-0.5">
                            {playerWithNumber.playerName}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Spacer between numbers and action buttons */}
                <div className="h-4"></div>

                {/* Control Row - MISS, 2x, UNDO - same height and spacing */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleMiss}
                    disabled={currentDarts.length >= 3}
                    className="h-[105px] bg-red-600 text-white text-2xl font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    MISS
                  </button>
                  <button
                    onClick={() => setUse2xMultiplier(!use2xMultiplier)}
                    className={`h-[105px] text-2xl font-bold rounded-lg transition-colors ${
                      use2xMultiplier
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-[#666666] text-white hover:bg-[#777777]'
                    }`}
                  >
                    2x {use2xMultiplier ? '(ON)' : '(HEAL)'}
                  </button>
                  <button
                    onClick={handleUndo}
                    disabled={(currentDarts.length === 0 && gameState.history.length === 0) || gameState.isPlayingSong}
                    className="h-[105px] bg-yellow-500 text-white text-2xl font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    UNDO
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
