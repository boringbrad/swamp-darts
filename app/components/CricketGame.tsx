'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../contexts/AppContext';
import { CricketNumber, CricketVariant, CricketRules, Player } from '../types/game';

interface CricketGameProps {
  variant: CricketVariant;
  players: Player[];
  rules: CricketRules;
}

interface PlayerScore {
  playerId: string;
  playerName: string;
  color: 'blue' | 'red' | 'purple' | 'green';
  marks: Record<CricketNumber, number>; // Can exceed 3 for points
  points: number;
  koPoints: number; // KO points for 3+ player games
  isEliminated: boolean; // For KO phase elimination
}

const CRICKET_TARGETS: CricketNumber[] = [20, 19, 18, 17, 16, 15, 'B', 'T', 'D'];

// History entry interface for undo functionality
interface HistoryEntry {
  playerIndex: number;
  dartIndex: number;
  action: 'score' | 'miss' | 'pin' | 'skip' | 'turn_advance' | 'ko';
  // For score actions
  target?: CricketNumber;
  multiplier?: 1 | 2 | 3;
  marksAdded?: number;
  pointsAdded?: number;
  // For PIN actions
  pinCountBefore?: number;
  pinCountAfter?: number;
  gameWinnerSet?: string | null;
  // For skip actions
  skippedPlayerId?: string;
  skippedPlayerName?: string;
  // For KO actions
  koTargetPlayerId?: string;
  koPointsAdded?: number;
  koPointsRemoved?: number;
  playerEliminatedId?: string;
  // For turn advance
  previousPlayerIndex?: number;
  skippedPlayerRemoved?: string;
  wasSkippedPlayerAdded?: string;
  wasSkippedPlayerRemoved?: string;
  // Complete game state snapshot
  playerScoresSnapshot?: PlayerScore[];
  dartScoresSnapshot?: (CricketNumber | null)[];
  dartMultipliersSnapshot?: (1 | 2 | 3)[];
  dartPinHitsSnapshot?: (number | null)[];
  dartSkipsSnapshot?: (string | null)[];
  skippedPlayersSnapshot?: string[];
  wasSkippedPlayersSnapshot?: string[];
  lastSkippedPlayerSnapshot?: string | null;
}

export default function CricketGame({ variant, players, rules }: CricketGameProps) {
  const router = useRouter();
  const { cameraEnabled, selectedPlayers } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dartScores, setDartScores] = useState<(CricketNumber | null)[]>([null, null, null]);
  const [dartMultipliers, setDartMultipliers] = useState<(1 | 2 | 3)[]>([1, 1, 1]);
  const [dartPinHits, setDartPinHits] = useState<(number | null)[]>([null, null, null]); // Track PIN hits with new count value
  const [dartSkips, setDartSkips] = useState<(string | null)[]>([null, null, null]); // Track skipped player names
  const [currentDartIndex, setCurrentDartIndex] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraPan, setCameraPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dividerPosition, setDividerPosition] = useState(() => {
    // Load saved divider position from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cricketCameraDividerPosition');
      return saved ? parseFloat(saved) : 33;
    }
    return 33;
  }); // Percentage for camera width
  const [isDragging, setIsDragging] = useState(false);
  const [skippedPlayers, setSkippedPlayers] = useState<Set<string>>(new Set()); // Track players who will be skipped next turn (crossed out)
  const [wasSkippedPlayers, setWasSkippedPlayers] = useState<Set<string>>(new Set()); // Track players who were skipped and waiting to play (greyed, not crossed)
  const [lastSkippedPlayer, setLastSkippedPlayer] = useState<string | null>(null); // Prevent consecutive skips
  const [pinCount, setPinCount] = useState(0); // Positive = player 0, Negative = player 1
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]); // Complete action history for undo

  // Helper to get team index for a player (for tag-team mode)
  const getTeamIndex = (playerIndex: number): number => {
    if (variant !== 'tag-team') return playerIndex;
    // Players 0 and 2 are team 0 (blue), players 1 and 3 are team 1 (red)
    return playerIndex % 2;
  };

  // Initialize player scores (or team scores for tag-team)
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>(() => {
    if (variant === 'tag-team') {
      // For tag-team, create 2 team scores
      return [
        {
          playerId: 'team-0',
          playerName: `${players[0]?.name} & ${players[2]?.name}`,
          color: 'blue',
          marks: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, B: 0, T: 0, D: 0 },
          points: 0,
          koPoints: 0,
          isEliminated: false,
        },
        {
          playerId: 'team-1',
          playerName: `${players[1]?.name} & ${players[3]?.name}`,
          color: 'red',
          marks: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, B: 0, T: 0, D: 0 },
          points: 0,
          koPoints: 0,
          isEliminated: false,
        },
      ];
    } else {
      // Regular modes: individual scores
      const colors: ('blue' | 'red' | 'purple' | 'green')[] = ['blue', 'red', 'purple', 'green'];
      return players.map((player, index) => ({
        playerId: player.id,
        playerName: player.name,
        color: colors[index % 4],
        marks: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, B: 0, T: 0, D: 0 },
        points: 0,
        koPoints: 0,
        isEliminated: false,
      }));
    }
  });

  const currentPlayer = players[currentPlayerIndex];
  const currentScore = playerScores[getTeamIndex(currentPlayerIndex)];

  // Helper function to check if a player/team has completed their board
  const isBoardComplete = (playerIndex: number): boolean => {
    const scoreIndex = getTeamIndex(playerIndex);
    const score = playerScores[scoreIndex];
    if (!score) return false;
    return CRICKET_TARGETS.every(target => score.marks[target] >= 3);
  };

  // Helper function to count remaining (non-eliminated) players
  const countRemainingPlayers = (): number => {
    return playerScores.filter(score => !score.isEliminated).length;
  };

  // Helper function to check if we're in KO phase (for 3+ player games)
  const isInKOPhase = (): boolean => {
    if (variant === 'singles' || variant === 'tag-team') return false;
    // KO phase starts when at least one player has completed their board
    // and there are still more than 2 players remaining
    const remaining = countRemainingPlayers();
    // Check if any non-eliminated player has completed their board
    const anyBoardComplete = playerScores.some((score) => {
      if (score.isEliminated) return false;
      return CRICKET_TARGETS.every(target => score.marks[target] >= 3);
    });
    return remaining > 2 && anyBoardComplete;
  };

  // Helper function to check if we're in PIN phase (for all variants)
  const isInPinPhase = (): boolean => {
    if (variant === 'singles' || variant === 'tag-team') {
      // Singles and tag-team go straight to PIN phase when any player/team completes their board
      return playerScores.some(score => CRICKET_TARGETS.every(target => score.marks[target] >= 3));
    } else {
      // For 3+ player games, PIN phase only when exactly 2 players remain
      const remaining = countRemainingPlayers();
      const anyBoardComplete = playerScores.some((score) => {
        if (score.isEliminated) return false;
        return CRICKET_TARGETS.every(target => score.marks[target] >= 3);
      });
      return remaining === 2 && anyBoardComplete;
    }
  };

  // Check if PIN button should be enabled
  const isPinEnabled = isInPinPhase();

  // Camera stream management
  useEffect(() => {
    if (cameraEnabled && !cameraStream) {
      // Start camera
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
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

  // Camera control handlers
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

  // Divider drag handlers
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setDividerPosition(Math.min(Math.max(newPosition, 20), 60));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for divider
  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !containerRef.current || e.touches.length === 0) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const newPosition = ((touch.clientX - containerRect.left) / containerRect.width) * 100;
    setDividerPosition(Math.min(Math.max(newPosition, 20), 60));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Pan event listeners
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
  }, [isPanning, panStart, cameraPan]);

  // Divider drag listeners
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

  // Save divider position to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cricketCameraDividerPosition', dividerPosition.toString());
    }
  }, [dividerPosition]);

  // Auto-advance to next player when 3 darts are thrown (or give bonus turn)
  useEffect(() => {
    if (currentDartIndex === 3) {
      // Check if all 3 darts scored (3 darts 3 marks bonus rule)
      const allDartsScored = dartScores.every(score => score !== null);

      // Add a small delay so the user can see the third dart before advancing
      const timer = setTimeout(() => {
        if (allDartsScored) {
          // Bonus turn - reset darts without changing player
          setDartScores([null, null, null]);
          setDartMultipliers([1, 1, 1]);
          setDartPinHits([null, null, null]);
          setDartSkips([null, null, null]);
          setCurrentDartIndex(0);
          setMultiplier(1);
        } else {
          // Normal advance to next player
          handleNextPlayer();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentDartIndex, dartScores]);

  const handleTargetClick = (target: CricketNumber) => {
    if (currentDartIndex >= 3) return;

    // Safety check: Don't allow skipped or eliminated players to score
    const currentPlayer = players[currentPlayerIndex];
    if (skippedPlayers.has(currentPlayer.id) || playerScores[currentPlayerIndex]?.isEliminated) {
      console.warn('Attempted to score with skipped/eliminated player', currentPlayer.name);
      return;
    }

    // Get the score index (team index for tag-team, player index for others)
    const scoreIndex = getTeamIndex(currentPlayerIndex);
    const currentPlayerScore = playerScores[scoreIndex];

      // For 3+ player games in KO phase: Check if hitting opponent's number for KO
    const inKOPhase = isInKOPhase();
    console.log('KO Phase Check:', { inKOPhase, variant, remaining: countRemainingPlayers(), playerScores });

    if ((variant === 'triple-threat' || variant === 'fatal-4-way') && inKOPhase) {
      const currentBoardComplete = isBoardComplete(currentPlayerIndex);
      console.log('In KO Phase - Current player board complete:', currentBoardComplete);

      // Check if this target belongs to an opponent (is their KO number)
      const targetOwnerId = players.find((p) => {
        const variantKey = variant === 'triple-threat' ? 'triple-threat' : 'fatal-4-way';
        const koNumber = selectedPlayers.cricket?.[variantKey]?.koNumbers?.[p.id];
        return koNumber === target;
      });

      if (targetOwnerId) {
        const targetOwnerIndex = players.findIndex(p => p.id === targetOwnerId.id);
        const targetOwnerScore = playerScores[targetOwnerIndex];

        // If current player has completed board, they can KO opponents
        if (currentBoardComplete && !targetOwnerScore.isEliminated) {
          // Add KO point to opponent
          const playerScoresSnapshot = JSON.parse(JSON.stringify(playerScores)) as PlayerScore[];

          const newPlayerScores = [...playerScores];
          newPlayerScores[targetOwnerIndex].koPoints += multiplier;

          // Check if opponent should be eliminated (3+ KO points)
          let eliminatedPlayerId: string | undefined = undefined;
          if (newPlayerScores[targetOwnerIndex].koPoints >= 3) {
            newPlayerScores[targetOwnerIndex].isEliminated = true;
            eliminatedPlayerId = targetOwnerId.id;
          }

          setPlayerScores(newPlayerScores);

          // Record in dart scores
          const newDartScores = [...dartScores];
          newDartScores[currentDartIndex] = target;
          setDartScores(newDartScores);

          const newDartMultipliers = [...dartMultipliers];
          newDartMultipliers[currentDartIndex] = multiplier;
          setDartMultipliers(newDartMultipliers);

          // Add to history
          const historyEntry: HistoryEntry = {
            playerIndex: currentPlayerIndex,
            dartIndex: currentDartIndex,
            action: 'ko',
            target,
            multiplier,
            koTargetPlayerId: targetOwnerId.id,
            koPointsAdded: multiplier,
            playerEliminatedId: eliminatedPlayerId,
            playerScoresSnapshot,
            dartScoresSnapshot: [...dartScores],
            dartMultipliersSnapshot: [...dartMultipliers],
            dartPinHitsSnapshot: [...dartPinHits],
            dartSkipsSnapshot: [...dartSkips],
            skippedPlayersSnapshot: Array.from(skippedPlayers),
            wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
            lastSkippedPlayerSnapshot: lastSkippedPlayer,
          };
          setHistory([...history, historyEntry]);

          setCurrentDartIndex(currentDartIndex + 1);
          setMultiplier(1);
          return;
        }
      }

      // Check if hitting own number to remove KO points
      const currentPlayerKONumber = (() => {
        const variantKey = variant === 'triple-threat' ? 'triple-threat' : 'fatal-4-way';
        return selectedPlayers.cricket?.[variantKey]?.koNumbers?.[currentPlayer.id];
      })();

      if (target === currentPlayerKONumber && currentPlayerScore.koPoints > 0) {
        // Remove KO point from self
        const playerScoresSnapshot = JSON.parse(JSON.stringify(playerScores)) as PlayerScore[];

        const newPlayerScores = [...playerScores];
        newPlayerScores[scoreIndex].koPoints = Math.max(0, newPlayerScores[scoreIndex].koPoints - multiplier);

        setPlayerScores(newPlayerScores);

        // Record in dart scores
        const newDartScores = [...dartScores];
        newDartScores[currentDartIndex] = target;
        setDartScores(newDartScores);

        const newDartMultipliers = [...dartMultipliers];
        newDartMultipliers[currentDartIndex] = multiplier;
        setDartMultipliers(newDartMultipliers);

        // Add to history
        const historyEntry: HistoryEntry = {
          playerIndex: currentPlayerIndex,
          dartIndex: currentDartIndex,
          action: 'ko',
          target,
          multiplier,
          koPointsRemoved: multiplier,
          playerScoresSnapshot,
          dartScoresSnapshot: [...dartScores],
          dartMultipliersSnapshot: [...dartMultipliers],
          dartPinHitsSnapshot: [...dartPinHits],
          dartSkipsSnapshot: [...dartSkips],
          skippedPlayersSnapshot: Array.from(skippedPlayers),
          wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
          lastSkippedPlayerSnapshot: lastSkippedPlayer,
        };
        setHistory([...history, historyEntry]);

        setCurrentDartIndex(currentDartIndex + 1);
        setMultiplier(1);
        return;
      }
    }

    // Normal scoring logic (for all variants and non-KO situations)
    // Check if current player/team already has 3 marks on this target
    if (currentPlayerScore.marks[target] >= 3) {
      // Target is already closed for this player/team, don't allow scoring
      return;
    }

    // Create snapshot before changes
    const playerScoresSnapshot = JSON.parse(JSON.stringify(playerScores)) as PlayerScore[];

    // Add the dart score and multiplier
    const newDartScores = [...dartScores];
    newDartScores[currentDartIndex] = target;
    setDartScores(newDartScores);

    const newDartMultipliers = [...dartMultipliers];
    newDartMultipliers[currentDartIndex] = multiplier;
    setDartMultipliers(newDartMultipliers);

    // Update marks and points
    const newPlayerScores = [...playerScores];
    const playerScore = newPlayerScores[scoreIndex];

    const marksToAdd = multiplier;
    const currentMarks = playerScore.marks[target];
    const actualMarksAdded = Math.min(currentMarks + marksToAdd, 3) - currentMarks;

    // Cap marks at 3 maximum
    playerScore.marks[target] = Math.min(currentMarks + marksToAdd, 3);

    let pointsAdded = 0;
    // Calculate points if applicable (Swamp Rules or Point Cricket)
    if (rules.swampRules || rules.point) {
      const targetValue = target === 'B' ? 25 : target === 'T' ? 20 : target === 'D' ? 20 : target;

      // If this player/team has closed the number (3+ marks) and opponent hasn't
      if (playerScore.marks[target] > 3) {
        // Check if all other players/teams have closed this number
        const allOpponentsClosed = playerScores.every((score, idx) =>
          idx === scoreIndex || score.marks[target] >= 3
        );

        if (!allOpponentsClosed) {
          // Award points for excess marks
          const excessMarks = playerScore.marks[target] - 3;
          pointsAdded = excessMarks * targetValue * multiplier;
          playerScore.points += pointsAdded;
        }
      }
    }

    setPlayerScores(newPlayerScores);

    // Add to history
    const historyEntry: HistoryEntry = {
      playerIndex: currentPlayerIndex,
      dartIndex: currentDartIndex,
      action: 'score',
      target,
      multiplier,
      marksAdded: actualMarksAdded,
      pointsAdded,
      playerScoresSnapshot,
      dartScoresSnapshot: [...dartScores],
      dartMultipliersSnapshot: [...dartMultipliers],
      dartPinHitsSnapshot: [...dartPinHits],
      dartSkipsSnapshot: [...dartSkips],
      skippedPlayersSnapshot: Array.from(skippedPlayers),
      wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
      lastSkippedPlayerSnapshot: lastSkippedPlayer,
    };
    setHistory([...history, historyEntry]);

    setCurrentDartIndex(currentDartIndex + 1);
    setMultiplier(1); // Reset multiplier after each dart
  };

  const handleMiss = () => {
    if (currentDartIndex >= 3) return;

    const newDartScores = [...dartScores];
    newDartScores[currentDartIndex] = null;
    setDartScores(newDartScores);

    const newDartMultipliers = [...dartMultipliers];
    newDartMultipliers[currentDartIndex] = 1;
    setDartMultipliers(newDartMultipliers);

    // Add to history
    const historyEntry: HistoryEntry = {
      playerIndex: currentPlayerIndex,
      dartIndex: currentDartIndex,
      action: 'miss',
      playerScoresSnapshot: JSON.parse(JSON.stringify(playerScores)) as PlayerScore[],
      dartScoresSnapshot: [...dartScores],
      dartMultipliersSnapshot: [...dartMultipliers],
      dartPinHitsSnapshot: [...dartPinHits],
      dartSkipsSnapshot: [...dartSkips],
      skippedPlayersSnapshot: Array.from(skippedPlayers),
      wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
      lastSkippedPlayerSnapshot: lastSkippedPlayer,
    };
    setHistory([...history, historyEntry]);

    setCurrentDartIndex(currentDartIndex + 1);
    setMultiplier(1);
  };

  // Handle KO button click
  const handleKOClick = (targetPlayerIndex: number) => {
    if (currentDartIndex >= 3) return;

    const currentPlayer = players[currentPlayerIndex];
    const currentBoardComplete = isBoardComplete(currentPlayerIndex);

    // Can't KO if current player hasn't completed their board
    if (!currentBoardComplete) return;

    const targetPlayer = players[targetPlayerIndex];
    const targetPlayerScore = playerScores[targetPlayerIndex];

    // Can't KO eliminated players
    if (targetPlayerScore.isEliminated) return;

    // Check if clicking own KO button to remove KO points
    if (targetPlayerIndex === currentPlayerIndex) {
      // Remove KO point from self
      if (targetPlayerScore.koPoints > 0) {
        const playerScoresSnapshot = JSON.parse(JSON.stringify(playerScores)) as PlayerScore[];

        const newPlayerScores = [...playerScores];
        newPlayerScores[targetPlayerIndex].koPoints = Math.max(0, newPlayerScores[targetPlayerIndex].koPoints - multiplier);

        setPlayerScores(newPlayerScores);

        // Add to history
        const historyEntry: HistoryEntry = {
          playerIndex: currentPlayerIndex,
          dartIndex: currentDartIndex,
          action: 'ko',
          koPointsRemoved: multiplier,
          playerScoresSnapshot,
          dartScoresSnapshot: [...dartScores],
          dartMultipliersSnapshot: [...dartMultipliers],
          dartPinHitsSnapshot: [...dartPinHits],
          dartSkipsSnapshot: [...dartSkips],
          skippedPlayersSnapshot: Array.from(skippedPlayers),
          wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
          lastSkippedPlayerSnapshot: lastSkippedPlayer,
        };
        setHistory([...history, historyEntry]);

        setCurrentDartIndex(currentDartIndex + 1);
        setMultiplier(1);
      }
    } else {
      // Add KO point to opponent
      const playerScoresSnapshot = JSON.parse(JSON.stringify(playerScores)) as PlayerScore[];

      const newPlayerScores = [...playerScores];
      newPlayerScores[targetPlayerIndex].koPoints += multiplier;

      // Check if opponent should be eliminated (3+ KO points)
      let eliminatedPlayerId: string | undefined = undefined;
      if (newPlayerScores[targetPlayerIndex].koPoints >= 3) {
        newPlayerScores[targetPlayerIndex].isEliminated = true;
        eliminatedPlayerId = targetPlayer.id;
      }

      setPlayerScores(newPlayerScores);

      // Add to history
      const historyEntry: HistoryEntry = {
        playerIndex: currentPlayerIndex,
        dartIndex: currentDartIndex,
        action: 'ko',
        koTargetPlayerId: targetPlayer.id,
        koPointsAdded: multiplier,
        playerEliminatedId: eliminatedPlayerId,
        playerScoresSnapshot,
        dartScoresSnapshot: [...dartScores],
        dartMultipliersSnapshot: [...dartMultipliers],
        dartPinHitsSnapshot: [...dartPinHits],
        dartSkipsSnapshot: [...dartSkips],
        skippedPlayersSnapshot: Array.from(skippedPlayers),
        wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
        lastSkippedPlayerSnapshot: lastSkippedPlayer,
      };
      setHistory([...history, historyEntry]);

      setCurrentDartIndex(currentDartIndex + 1);
      setMultiplier(1);
    }
  };

  const handleSkipPlayer = (playerId: string) => {
    // Can't skip yourself
    if (playerId === players[currentPlayerIndex].id) return;

    // Can't skip the same player twice consecutively
    if (lastSkippedPlayer === playerId) return;

    // Can't skip after 3 darts
    if (currentDartIndex >= 3) return;

    // Record the skip in dartSkips and advance dart index
    const player = players.find(p => p.id === playerId);
    if (player) {
      const newDartSkips = [...dartSkips];
      newDartSkips[currentDartIndex] = player.name;
      setDartSkips(newDartSkips);

      // Add to history
      const historyEntry: HistoryEntry = {
        playerIndex: currentPlayerIndex,
        dartIndex: currentDartIndex,
        action: 'skip',
        skippedPlayerId: playerId,
        skippedPlayerName: player.name,
        playerScoresSnapshot: JSON.parse(JSON.stringify(playerScores)) as PlayerScore[],
        dartScoresSnapshot: [...dartScores],
        dartMultipliersSnapshot: [...dartMultipliers],
        dartPinHitsSnapshot: [...dartPinHits],
        dartSkipsSnapshot: [...dartSkips],
        skippedPlayersSnapshot: Array.from(skippedPlayers),
        wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
        lastSkippedPlayerSnapshot: lastSkippedPlayer,
      };
      setHistory([...history, historyEntry]);

      // Add player to skipped set
      const newSkippedPlayers = new Set(skippedPlayers);
      newSkippedPlayers.add(playerId);
      setSkippedPlayers(newSkippedPlayers);
      setLastSkippedPlayer(playerId);

      // Advance to next dart (uses up a dart slot)
      setCurrentDartIndex(currentDartIndex + 1);
    }
  };

  const handlePin = () => {
    if (!isPinEnabled) return;
    if (gameWinner) return; // Game already won
    if (currentDartIndex >= 3) return; // Can't throw more than 3 darts

    const currentBoardComplete = isBoardComplete(currentPlayerIndex);
    let newPinCount = pinCount;
    let canPinAction = false;

    // Determine team (for tag-team) or player
    const teamIndex = getTeamIndex(currentPlayerIndex);

    if (teamIndex === 0) {
      // Team 0 (or Player 0)'s turn
      if (currentBoardComplete) {
        // Can pin opponent (move positive)
        newPinCount = pinCount + 1;
        canPinAction = true;
        setPinCount(newPinCount);
        if (newPinCount >= 3) {
          // Set winner - for tag-team it's the team, for singles it's the player
          setGameWinner(variant === 'tag-team' ? 'team-0' : players[0].id);
        }
      } else {
        // Can only remove opponent's pins (move toward 0), and only if there are pins to remove
        if (pinCount < 0) {
          newPinCount = pinCount + 1;
          canPinAction = true;
          setPinCount(newPinCount);
        }
      }
    } else {
      // Team 1 (or Player 1)'s turn
      if (currentBoardComplete) {
        // Can pin opponent (move negative)
        newPinCount = pinCount - 1;
        canPinAction = true;
        setPinCount(newPinCount);
        if (newPinCount <= -3) {
          // Set winner - for tag-team it's the team, for singles it's the player
          setGameWinner(variant === 'tag-team' ? 'team-1' : players[1].id);
        }
      } else {
        // Can only remove opponent's pins (move toward 0), and only if there are pins to remove
        if (pinCount > 0) {
          newPinCount = pinCount - 1;
          canPinAction = true;
          setPinCount(newPinCount);
        }
      }
    }

    // Only record and advance if a valid PIN action occurred
    if (canPinAction) {
      // Record the PIN hit and advance dart index (uses up a dart slot)
      const newDartPinHits = [...dartPinHits];
      newDartPinHits[currentDartIndex] = Math.abs(newPinCount);
      setDartPinHits(newDartPinHits);

      // Add to history
      const winnerSet = newPinCount >= 3 ? players[0].id : (newPinCount <= -3 ? players[1].id : null);
      const historyEntry: HistoryEntry = {
        playerIndex: currentPlayerIndex,
        dartIndex: currentDartIndex,
        action: 'pin',
        pinCountBefore: pinCount,
        pinCountAfter: newPinCount,
        gameWinnerSet: winnerSet,
        playerScoresSnapshot: JSON.parse(JSON.stringify(playerScores)) as PlayerScore[],
        dartScoresSnapshot: [...dartScores],
        dartMultipliersSnapshot: [...dartMultipliers],
        dartPinHitsSnapshot: [...dartPinHits],
        dartSkipsSnapshot: [...dartSkips],
        skippedPlayersSnapshot: Array.from(skippedPlayers),
        wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
        lastSkippedPlayerSnapshot: lastSkippedPlayer,
      };
      setHistory([...history, historyEntry]);

      // Advance to next dart (uses up a dart slot)
      setCurrentDartIndex(currentDartIndex + 1);
    }
  };

  const handleNextPlayer = () => {
    // Move to next player
    let nextIndex = (currentPlayerIndex + 1) % players.length;

    // Create new sets for state updates
    let newSkippedPlayers = new Set(skippedPlayers);
    let newWasSkippedPlayers = new Set(wasSkippedPlayers);

    let skippedPlayerRemoved: string | undefined = undefined;
    let wasSkippedPlayerAdded: string | undefined = undefined;
    let wasSkippedPlayerRemoved: string | undefined = undefined;

    // Skip both eliminated and skipped players together
    let attempts = 0;
    while (attempts < players.length) {
      const nextPlayerId = players[nextIndex].id;
      const isEliminated = playerScores[nextIndex]?.isEliminated;
      const isSkipped = skippedPlayers.has(nextPlayerId);

      // If eliminated, just skip to next
      if (isEliminated) {
        nextIndex = (nextIndex + 1) % players.length;
        attempts++;
        continue;
      }

      // If skipped, process the skip and move to next
      if (isSkipped) {
        skippedPlayerRemoved = nextPlayerId;
        wasSkippedPlayerAdded = nextPlayerId;
        newSkippedPlayers.delete(nextPlayerId);
        newWasSkippedPlayers.add(nextPlayerId);
        nextIndex = (nextIndex + 1) % players.length;
        attempts++;
        continue;
      }

      // Found a valid player
      break;
    }

    const nextPlayerId = players[nextIndex].id;

    // If the new current player was previously skipped, clear their wasSkipped status
    if (wasSkippedPlayers.has(nextPlayerId)) {
      wasSkippedPlayerRemoved = nextPlayerId;
      newWasSkippedPlayers.delete(nextPlayerId);
    }

    // Add to history before changing player
    const historyEntry: HistoryEntry = {
      playerIndex: currentPlayerIndex,
      dartIndex: currentDartIndex,
      action: 'turn_advance',
      previousPlayerIndex: currentPlayerIndex,
      skippedPlayerRemoved,
      wasSkippedPlayerAdded,
      wasSkippedPlayerRemoved,
      playerScoresSnapshot: JSON.parse(JSON.stringify(playerScores)) as PlayerScore[],
      dartScoresSnapshot: [...dartScores],
      dartMultipliersSnapshot: [...dartMultipliers],
      dartPinHitsSnapshot: [...dartPinHits],
      dartSkipsSnapshot: [...dartSkips],
      skippedPlayersSnapshot: Array.from(skippedPlayers),
      wasSkippedPlayersSnapshot: Array.from(wasSkippedPlayers),
      lastSkippedPlayerSnapshot: lastSkippedPlayer,
    };
    setHistory([...history, historyEntry]);

    // Update all state together
    setSkippedPlayers(newSkippedPlayers);
    setWasSkippedPlayers(newWasSkippedPlayers);
    setCurrentPlayerIndex(nextIndex);
    setDartScores([null, null, null]);
    setDartMultipliers([1, 1, 1]);
    setDartPinHits([null, null, null]);
    setDartSkips([null, null, null]);
    setCurrentDartIndex(0);
    setMultiplier(1);
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    // Pop the last history entry
    const lastEntry = history[history.length - 1];

    // Special handling for turn_advance: we need to undo BOTH the turn advance AND the last dart
    if (lastEntry.action === 'turn_advance') {
      if (history.length < 2) return; // Safety check

      // Pop both the turn_advance and the action before it (the 3rd dart)
      const newHistory = history.slice(0, -2);
      setHistory(newHistory);

      // Get the entry BEFORE the turn advance (the actual dart we want to restore to)
      const beforeTurnAdvance = history[history.length - 2];

      // Restore to the previous player
      if (lastEntry.previousPlayerIndex !== undefined) {
        setCurrentPlayerIndex(lastEntry.previousPlayerIndex);
      }

      // Restore game state from the snapshot BEFORE the last dart
      if (beforeTurnAdvance.playerScoresSnapshot) {
        setPlayerScores(JSON.parse(JSON.stringify(beforeTurnAdvance.playerScoresSnapshot)) as PlayerScore[]);
      }

      if (beforeTurnAdvance.dartScoresSnapshot) {
        setDartScores([...beforeTurnAdvance.dartScoresSnapshot]);
      }

      if (beforeTurnAdvance.dartMultipliersSnapshot) {
        setDartMultipliers([...beforeTurnAdvance.dartMultipliersSnapshot]);
      }

      if (beforeTurnAdvance.dartPinHitsSnapshot) {
        setDartPinHits([...beforeTurnAdvance.dartPinHitsSnapshot]);
      }

      if (beforeTurnAdvance.dartSkipsSnapshot) {
        setDartSkips([...beforeTurnAdvance.dartSkipsSnapshot]);
      }

      if (beforeTurnAdvance.skippedPlayersSnapshot) {
        setSkippedPlayers(new Set(beforeTurnAdvance.skippedPlayersSnapshot));
      }

      if (beforeTurnAdvance.wasSkippedPlayersSnapshot) {
        setWasSkippedPlayers(new Set(beforeTurnAdvance.wasSkippedPlayersSnapshot));
      }

      if (beforeTurnAdvance.lastSkippedPlayerSnapshot !== undefined) {
        setLastSkippedPlayer(beforeTurnAdvance.lastSkippedPlayerSnapshot);
      }

      // Restore dart index from before the last dart
      setCurrentDartIndex(beforeTurnAdvance.dartIndex);

      // Reset multiplier
      setMultiplier(1);

      return;
    }

    // For all other actions, normal undo
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    // Handle action-specific reversions
    if (lastEntry.action === 'pin') {
      // Restore PIN count and game winner
      if (lastEntry.pinCountBefore !== undefined) {
        setPinCount(lastEntry.pinCountBefore);
      }
      if (lastEntry.gameWinnerSet !== undefined) {
        setGameWinner(null); // Clear winner if it was set
      }
    }

    // Restore to the player who made the action
    setCurrentPlayerIndex(lastEntry.playerIndex);

    // Restore complete game state from snapshot
    if (lastEntry.playerScoresSnapshot) {
      setPlayerScores(JSON.parse(JSON.stringify(lastEntry.playerScoresSnapshot)) as PlayerScore[]);
    }

    // Restore dart arrays from snapshot
    if (lastEntry.dartScoresSnapshot) {
      setDartScores([...lastEntry.dartScoresSnapshot]);
    }

    if (lastEntry.dartMultipliersSnapshot) {
      setDartMultipliers([...lastEntry.dartMultipliersSnapshot]);
    }

    if (lastEntry.dartPinHitsSnapshot) {
      setDartPinHits([...lastEntry.dartPinHitsSnapshot]);
    }

    if (lastEntry.dartSkipsSnapshot) {
      setDartSkips([...lastEntry.dartSkipsSnapshot]);
    }

    if (lastEntry.skippedPlayersSnapshot) {
      setSkippedPlayers(new Set(lastEntry.skippedPlayersSnapshot));
    }

    if (lastEntry.wasSkippedPlayersSnapshot) {
      setWasSkippedPlayers(new Set(lastEntry.wasSkippedPlayersSnapshot));
    }

    if (lastEntry.lastSkippedPlayerSnapshot !== undefined) {
      setLastSkippedPlayer(lastEntry.lastSkippedPlayerSnapshot);
    }

    // Restore dart index
    setCurrentDartIndex(lastEntry.dartIndex);

    // Reset multiplier to 1
    setMultiplier(1);
  };

  const renderMarks = (count: number, isEliminated: boolean = false) => {
    if (count === 0) return null;

    const displayCount = Math.min(count, 3);
    let symbol = '';

    if (displayCount === 1) {
      symbol = '/';
    } else if (displayCount === 2) {
      symbol = 'X';
    } else if (displayCount >= 3) {
      symbol = 'O';
    }

    return (
      <div className="flex items-center justify-center w-full h-full">
        <span
          className="text-white font-bold"
          style={{
            fontSize: 'clamp(1.12rem, 4.48vw, 5.6rem)',
            lineHeight: 1,
            opacity: isEliminated ? 0.3 : 1
          }}
        >
          {symbol}
        </span>
      </div>
    );
  };

  const getPlayerColor = (color: 'blue' | 'red' | 'purple' | 'green'): string => {
    const colors = {
      blue: '#1a7a9d',
      red: '#9d1a1a',
      purple: '#6b1a8b',
      green: '#2d5016',
    };
    return colors[color];
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#333333] flex flex-col select-none">
      {/* Empty container matching header height to prevent accidental clicks */}
      <div className="h-20 bg-[#333333]"></div>

      <div className="flex-1 flex">
        {/* Left Side - Camera/Dartboard */}
        {cameraEnabled && (
          <div className="bg-black flex items-center justify-center relative overflow-hidden" style={{ width: `${dividerPosition}%` }}>
            <div
              className="absolute inset-0 flex items-center justify-center cursor-move"
              onMouseDown={handlePanStart}
              onTouchStart={handlePanStart}
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

            {/* Camera Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <button
                onClick={handleZoomIn}
                className="w-10 h-10 bg-[#8b1a1a] text-white rounded-full flex items-center justify-center hover:bg-[#9b2a2a] transition-colors"
              >
                +
              </button>
              <button
                onClick={handleResetZoom}
                className="w-10 h-10 bg-[#8b1a1a] text-white rounded-full flex items-center justify-center hover:bg-[#9b2a2a] transition-colors text-xs"
                title="Reset Zoom"
              >
                {Math.round(cameraZoom * 100)}%
              </button>
              <button
                onClick={handleZoomOut}
                className="w-10 h-10 bg-[#8b1a1a] text-white rounded-full flex items-center justify-center hover:bg-[#9b2a2a] transition-colors"
              >
                −
              </button>
            </div>

            {!cameraStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-xl">Loading camera...</div>
              </div>
            )}
          </div>
        )}

        {/* Resizable Divider */}
        {cameraEnabled && (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="w-1 bg-[#8b1a1a] hover:bg-[#9b2a2a] cursor-col-resize relative"
          >
            <div className="absolute inset-y-0 -left-1 -right-1"></div>
          </div>
        )}

        {/* Middle Section - Turn Order and Dart Scores */}
        <div className={`${cameraEnabled ? 'w-1/6' : 'w-1/4'} bg-[#1a1a1a] flex flex-col items-center justify-start px-6 border-l-2 border-r-2 border-white`}>
          {/* Empty container above Turn Order */}
          <div className="w-full h-16"></div>

          {/* Turn Order */}
          <div className="w-full mb-6">
            <div className="text-white text-4xl font-bold mb-6 text-center">TURN ORDER</div>
            <div className="space-y-3">
              {players.map((player, index) => {
                const willBeSkipped = skippedPlayers.has(player.id);
                const wasSkipped = wasSkippedPlayers.has(player.id);
                const isEliminated = playerScores[index]?.isEliminated || false;
                // A player is current only if they match currentPlayerIndex AND they're not skipped/eliminated
                const isCurrent = index === currentPlayerIndex && !willBeSkipped && !isEliminated;
                // For tag-team, use team colors; for others, use player scores
                const playerColor = variant === 'tag-team'
                  ? (getTeamIndex(index) === 0 ? 'blue' : 'red')
                  : (playerScores[index]?.color || 'blue');
                const isGreyedOut = willBeSkipped || wasSkipped || isEliminated;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-center gap-3 px-4 py-3 rounded ${
                      isCurrent ? 'bg-yellow-500/25' : ''
                    }`}
                  >
                    {isCurrent && <span className="text-white text-4xl flex-shrink-0">▶</span>}
                    <div
                      className={`w-12 h-12 rounded-full flex-shrink-0 border-2 border-white ${willBeSkipped ? 'opacity-25' : ''}`}
                      style={{ backgroundColor: getPlayerColor(playerColor) }}
                    />
                    <span className={`text-white font-bold whitespace-nowrap overflow-hidden text-ellipsis ${willBeSkipped ? 'line-through' : ''} ${isGreyedOut ? 'opacity-25' : ''}`} style={{ fontSize: 'clamp(0.875rem, 2vw, 2.5rem)' }}>
                      {player.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="w-full h-16"></div>

          {/* Dart Scores */}
          <div className="w-full mb-6">
            <div className="text-white text-4xl font-bold mb-6 text-center">DARTS THIS TURN</div>
            <div className="space-y-3">
              {dartScores.map((score, index) => {
                const mult = dartMultipliers[index];
                const pinHit = dartPinHits[index];
                const skipName = dartSkips[index];

                let displayText = '';
                if (pinHit !== null) {
                  // PIN hit - show PIN (count)
                  displayText = `PIN (${pinHit})`;
                } else if (skipName !== null) {
                  // Player skip - show skipped player name
                  displayText = skipName;
                } else if (score) {
                  // Regular dart score
                  displayText = mult > 1 ? `${score}(${mult})` : `${score}`;
                } else if (score === null && index < currentDartIndex) {
                  // Miss
                  displayText = 'MISS';
                } else {
                  // Empty slot
                  displayText = '-';
                }

                return (
                  <div
                    key={index}
                    className={`h-40 bg-[#333333] rounded flex items-center justify-center ${
                      index === currentDartIndex ? 'ring-2 ring-white' : ''
                    }`}
                  >
                    <span className="text-white text-6xl font-bold">
                      {displayText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side - Scoreboard */}
        <div className={`${cameraEnabled ? 'flex-1' : 'flex-1'} bg-[#333333] p-6 flex flex-col`}>
          {/* Player/Team Headers */}
          {(variant === 'triple-threat' || variant === 'fatal-4-way') ? (
            <>
              {/* New layout: Empty cell for numbers column, then all players in order */}
              <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `120px repeat(${players.length}, 1fr)` }}>
              {/* KO Phase indicator or empty cell above numbers column */}
              <div className="flex items-center justify-center">
                {isInKOPhase() && (
                  <div className="text-red-500 text-2xl font-bold animate-pulse">
                    KO
                  </div>
                )}
              </div>

              {/* All players in order */}
              {players.map((player, index) => {
                const playerIndex = index;
                const koNumber = selectedPlayers.cricket?.[variant]?.koNumbers?.[player.id] || null;
                const willBeSkipped = skippedPlayers.has(player.id);
                const wasSkipped = wasSkippedPlayers.has(player.id);
                const isEliminated = playerScores[playerIndex]?.isEliminated || false;
                // A player is current only if they match currentPlayerIndex AND they're not skipped/eliminated
                const isCurrent = playerIndex === currentPlayerIndex && !willBeSkipped && !isEliminated;
                const koPoints = playerScores[playerIndex]?.koPoints || 0;
                const isGreyedOut = willBeSkipped || wasSkipped || isEliminated;
                // Can't skip if: currently playing, was last skipped, already served skip penalty, or eliminated
                const canSkip = !isCurrent && lastSkippedPlayer !== player.id && !wasSkipped && !isEliminated;
                const teamColor = playerScores[playerIndex]?.color || 'blue';

                return (
                  <button
                    key={player.id}
                    onClick={() => handleSkipPlayer(player.id)}
                    disabled={!canSkip}
                    className="p-6 rounded flex flex-col items-center justify-center min-h-[140px] transition-all hover:brightness-110 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: getPlayerColor(teamColor),
                      filter: isCurrent ? 'none' : (isGreyedOut ? 'brightness(0.4)' : 'brightness(0.6)')
                    }}
                  >
                    <div className="text-white text-7xl font-bold mb-2 leading-none">
                      {koNumber || '00'}
                    </div>
                    <div className="text-white text-6xl font-bold text-center flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        {isCurrent && <span className="text-white text-2xl">▶</span>}
                        <span className={isEliminated || willBeSkipped ? 'line-through' : ''}>{player.name}</span>
                        {isCurrent && <span className="text-white text-2xl">◀</span>}
                      </div>
                      {/* Status text */}
                      {isEliminated && <span className="text-white text-2xl">ELIMINATED</span>}
                      {!isEliminated && isGreyedOut && <span className="text-white text-2xl">{wasSkipped ? 'Skip Served' : 'Skipped'}</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* KO Button Row - Only show during KO phase */}
            {isInKOPhase() && (
              <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `120px repeat(${players.length}, 1fr)` }}>
                {/* Empty cell for alignment */}
                <div></div>

                {/* KO Buttons */}
                {players.map((player, index) => {
                  const playerIndex = index;
                  const koPoints = playerScores[playerIndex]?.koPoints || 0;
                  const isEliminated = playerScores[playerIndex]?.isEliminated || false;
                  const isCurrent = playerIndex === currentPlayerIndex;
                  const currentBoardComplete = isBoardComplete(currentPlayerIndex);

                  // KO button is enabled if:
                  // - Current player has completed board
                  // - Target is not eliminated
                  // - There are darts remaining
                  const canKO = currentBoardComplete && !isEliminated && currentDartIndex < 3;

                  return (
                    <button
                      key={`ko-${player.id}`}
                      onClick={() => handleKOClick(playerIndex)}
                      disabled={!canKO}
                      className="p-3 rounded flex items-center justify-center transition-all hover:brightness-110 disabled:cursor-not-allowed bg-red-900"
                      style={{
                        filter: canKO ? 'none' : 'brightness(0.3)',
                        minHeight: '60px'
                      }}
                    >
                      {koPoints > 0 ? (
                        <div className="flex gap-1 text-3xl">
                          {Array.from({ length: koPoints }).map((_, i) => (
                            <span key={i}>💀</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-white text-2xl font-bold">KO</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            </>
          ) : (
            // Original layout: Split players with numbers/PIN counter in center
            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.ceil(players.length / 2)}, 1fr) 120px repeat(${Math.floor(players.length / 2)}, 1fr)` }}>
              {/* First half of players - Team 0 for tag-team, or left side for others */}
              {(variant === 'tag-team' ? [players[0], players[2]] : players.slice(0, Math.ceil(players.length / 2))).map((player) => {
              const playerIndex = players.indexOf(player);
              const koNumber = variant === 'tag-team'
                ? selectedPlayers.cricket?.['tag-team']?.koNumbers?.[player.id] || null
                : selectedPlayers.cricket?.singles?.koNumbers?.[player.id] || null;
              const isCurrent = playerIndex === currentPlayerIndex;
              const willBeSkipped = skippedPlayers.has(player.id);
              const wasSkipped = wasSkippedPlayers.has(player.id);
              const isGreyedOut = willBeSkipped || wasSkipped;

              // Get team color for this player
              const teamIndex = getTeamIndex(playerIndex);
              const teamColor = playerScores[teamIndex]?.color || 'blue';

              // For tag-team: can't skip current player, last skipped player, teammate, or already served penalty
              const canSkip = variant === 'tag-team'
                ? !isCurrent && lastSkippedPlayer !== player.id && getTeamIndex(currentPlayerIndex) !== teamIndex && !wasSkipped
                : !isCurrent && lastSkippedPlayer !== player.id && !wasSkipped;

              return (
                <button
                  key={player.id}
                  onClick={() => handleSkipPlayer(player.id)}
                  disabled={!canSkip}
                  className="p-6 rounded flex flex-col items-center justify-center min-h-[140px] transition-all hover:brightness-110 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: getPlayerColor(teamColor),
                    filter: isCurrent ? 'none' : (isGreyedOut ? 'brightness(0.4)' : 'brightness(0.6)')
                  }}
                >
                  <div className="text-white text-7xl font-bold mb-2 leading-none">
                    {koNumber || '00'}
                  </div>
                  <div className="text-white text-6xl font-bold text-center flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      {isCurrent && <span className="text-white text-2xl">▶</span>}
                      <span className={willBeSkipped ? 'line-through' : ''}>{player.name}</span>
                      {isCurrent && <span className="text-white text-2xl">◀</span>}
                    </div>
                    {isGreyedOut && <span className="text-white text-2xl">{wasSkipped ? 'Skip Served' : 'Skipped'}</span>}
                  </div>
                </button>
              );
            })}

            {/* PIN Counter in center header */}
            <div className="flex items-center justify-center">
              {isPinEnabled && pinCount !== 0 && (
                <span
                  className="text-8xl font-bold"
                  style={{ color: pinCount > 0 ? getPlayerColor(playerScores[0].color) : getPlayerColor(playerScores[1].color) }}
                >
                  {Math.abs(pinCount)}
                </span>
              )}
            </div>

            {/* Second half of players - Team 1 for tag-team, or right side for others */}
            {(variant === 'tag-team' ? [players[1], players[3]] : players.slice(Math.ceil(players.length / 2))).map((player) => {
              const playerIndex = players.indexOf(player);
              const koNumber = variant === 'tag-team'
                ? selectedPlayers.cricket?.['tag-team']?.koNumbers?.[player.id] || null
                : selectedPlayers.cricket?.singles?.koNumbers?.[player.id] || null;
              const isCurrent = playerIndex === currentPlayerIndex;
              const willBeSkipped = skippedPlayers.has(player.id);
              const wasSkipped = wasSkippedPlayers.has(player.id);
              const isGreyedOut = willBeSkipped || wasSkipped;

              // Get team color for this player
              const teamIndex = getTeamIndex(playerIndex);
              const teamColor = playerScores[teamIndex]?.color || 'blue';

              // For tag-team: can't skip current player, last skipped player, teammate, or already served penalty
              const canSkip = variant === 'tag-team'
                ? !isCurrent && lastSkippedPlayer !== player.id && getTeamIndex(currentPlayerIndex) !== teamIndex && !wasSkipped
                : !isCurrent && lastSkippedPlayer !== player.id && !wasSkipped;

              return (
                <button
                  key={player.id}
                  onClick={() => handleSkipPlayer(player.id)}
                  disabled={!canSkip}
                  className="p-6 rounded flex flex-col items-center justify-center min-h-[140px] transition-all hover:brightness-110 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: getPlayerColor(teamColor),
                    filter: isCurrent ? 'none' : (isGreyedOut ? 'brightness(0.4)' : 'brightness(0.6)')
                  }}
                >
                  <div className="text-white text-7xl font-bold mb-2 leading-none">
                    {koNumber || '00'}
                  </div>
                  <div className="text-white text-6xl font-bold text-center flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      {isCurrent && <span className="text-white text-2xl">▶</span>}
                      <span className={willBeSkipped ? 'line-through' : ''}>{player.name}</span>
                      {isCurrent && <span className="text-white text-2xl">◀</span>}
                    </div>
                    {isGreyedOut && <span className="text-white text-2xl">{wasSkipped ? 'Skip Served' : 'Skipped'}</span>}
                  </div>
                </button>
              );
            })}
            </div>
          )}

          {/* Scoreboard Grid */}
          <div className="flex-1 flex flex-col mb-4">
            {CRICKET_TARGETS.map((target, rowIndex) => (
              <div key={target} className="grid flex-1" style={{
                gridTemplateColumns: (variant === 'triple-threat' || variant === 'fatal-4-way')
                  ? `120px repeat(${players.length}, 1fr)`
                  : variant === 'tag-team'
                    ? '1fr 120px 1fr'
                    : `repeat(${Math.ceil(players.length / 2)}, 1fr) 120px repeat(${Math.floor(players.length / 2)}, 1fr)`
              }}>
                {/* For triple-threat and fatal-4-way: Number button first */}
                {(variant === 'triple-threat' || variant === 'fatal-4-way') && (
                  <button
                    onClick={() => handleTargetClick(target)}
                    disabled={currentDartIndex >= 3}
                    className="flex items-center justify-center hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                    style={{ backgroundColor: rowIndex % 2 === 0 ? '#333333' : '#555555' }}
                  >
                    <span className="text-white text-7xl font-bold">{target}</span>
                  </button>
                )}

                {/* For triple-threat and fatal-4-way: All players in order */}
                {(variant === 'triple-threat' || variant === 'fatal-4-way') && playerScores.map((score, scoreIndex) => {
                  const isDisabled = currentDartIndex >= 3 || scoreIndex !== currentPlayerIndex;
                  const isEliminated = score.isEliminated || false;

                  return (
                    <button
                      key={score.playerId}
                      onClick={() => handleTargetClick(target)}
                      disabled={isDisabled}
                      className="flex items-center justify-center hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                      style={{ backgroundColor: rowIndex % 2 === 0 ? '#333333' : '#555555' }}
                    >
                      {renderMarks(score.marks[target], isEliminated)}
                    </button>
                  );
                })}

                {/* For singles and tag-team: Original layout - Team 0 / First half of players */}
                {!(variant === 'triple-threat' || variant === 'fatal-4-way') && (variant === 'tag-team' ? playerScores.slice(0, 1) : playerScores.slice(0, Math.ceil(players.length / 2))).map((score, scoreIndex) => {
                  // For tag-team, always enabled (any team member can click)
                  const isDisabled = variant === 'tag-team'
                    ? currentDartIndex >= 3 || getTeamIndex(currentPlayerIndex) !== 0
                    : currentDartIndex >= 3 || scoreIndex !== currentPlayerIndex;

                  return (
                    <button
                      key={score.playerId}
                      onClick={() => handleTargetClick(target)}
                      disabled={isDisabled}
                      className="flex items-center justify-center hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                      style={{ backgroundColor: rowIndex % 2 === 0 ? '#333333' : '#555555' }}
                    >
                      {renderMarks(score.marks[target])}
                    </button>
                  );
                })}

                {/* For singles and tag-team: Target Number Button - centered */}
                {!(variant === 'triple-threat' || variant === 'fatal-4-way') && (
                  <button
                    onClick={() => handleTargetClick(target)}
                    disabled={currentDartIndex >= 3}
                    className="flex items-center justify-center hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                    style={{ backgroundColor: rowIndex % 2 === 0 ? '#333333' : '#555555' }}
                  >
                    <span className="text-white text-7xl font-bold">{target}</span>
                  </button>
                )}

                {/* For singles and tag-team: Team 1 / Second half of players */}
                {!(variant === 'triple-threat' || variant === 'fatal-4-way') && (variant === 'tag-team' ? playerScores.slice(1, 2) : playerScores.slice(Math.ceil(players.length / 2))).map((score, scoreIndex) => {
                  // For tag-team, check if current team, for regular check player index
                  const isDisabled = variant === 'tag-team'
                    ? currentDartIndex >= 3 || getTeamIndex(currentPlayerIndex) !== 1
                    : (() => {
                        const actualPlayerIndex = Math.ceil(players.length / 2) + scoreIndex;
                        return currentDartIndex >= 3 || actualPlayerIndex !== currentPlayerIndex;
                      })();

                  return (
                    <button
                      key={score.playerId}
                      onClick={() => handleTargetClick(target)}
                      disabled={isDisabled}
                      className="flex items-center justify-center hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                      style={{ backgroundColor: rowIndex % 2 === 0 ? '#333333' : '#555555' }}
                    >
                      {renderMarks(score.marks[target])}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-5 gap-3 h-24">
            <button
              onClick={() => setMultiplier(2)}
              className={`${
                multiplier === 2 ? 'bg-[#9d8b1a]' : 'bg-[#666666]'
              } text-white rounded font-bold text-5xl hover:bg-[#777777] transition-colors`}
            >
              2x
            </button>
            <button
              onClick={() => setMultiplier(3)}
              className={`${
                multiplier === 3 ? 'bg-[#9d8b1a]' : 'bg-[#666666]'
              } text-white rounded font-bold text-5xl hover:bg-[#777777] transition-colors`}
            >
              3x
            </button>
            <button
              onClick={handleMiss}
              disabled={currentDartIndex >= 3}
              className="bg-[#666666] text-white rounded font-bold text-5xl hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MISS
            </button>
            <button
              onClick={handlePin}
              disabled={!isPinEnabled || gameWinner !== null}
              className={`bg-[#666666] text-white rounded font-bold text-5xl hover:bg-[#777777] transition-colors ${
                !isPinEnabled || gameWinner ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              PIN
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="bg-[#666666] text-white rounded font-bold text-5xl hover:bg-[#777777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              UNDO
            </button>
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {gameWinner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] p-12 rounded-lg border-4 border-white text-center">
            <h2 className="text-white text-8xl font-bold mb-8">PINNED!</h2>
            <p className="text-white text-6xl mb-8">
              {variant === 'tag-team' && gameWinner.startsWith('team-')
                ? playerScores.find(s => s.playerId === gameWinner)?.playerName
                : players.find(p => p.id === gameWinner)?.name} WINS!
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#9d8b1a] text-white px-12 py-6 rounded text-4xl font-bold hover:bg-[#b39f2a] transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
