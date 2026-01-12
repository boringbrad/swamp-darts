'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GolfVariant } from '../types/game';
import { StoredPlayer } from '../types/storage';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAppContext } from '../contexts/AppContext';
import { getCourseRecord } from '../lib/golfStats';

interface GolfGameProps {
  variant: GolfVariant;
}

interface PlayerScore {
  playerId: string;
  holes: (number | null)[]; // 18 holes, null if not yet played
}

const PAR_PER_HOLE = 4;
const TOTAL_HOLES = 18;

export default function GolfGame({ variant }: GolfGameProps) {
  const router = useRouter();
  const { localPlayers } = usePlayerContext();
  const { selectedPlayers, tieBreakerEnabled, golfCourseName, playMode, courseBannerImage, courseBannerOpacity, cameraEnabled, setCameraEnabled } = useAppContext();
  const [players, setPlayers] = useState<StoredPlayer[]>([]);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [currentHole, setCurrentHole] = useState(0); // 0-17 for holes 1-18, 18+ for tie breaker
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [courseRecord, setCourseRecord] = useState(getCourseRecord(golfCourseName));
  const [dividerPosition, setDividerPosition] = useState(() => {
    // Load saved divider position from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('golfCameraDividerPosition');
      return saved ? parseFloat(saved) : 50;
    }
    return 50;
  }); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1); // 1 = 100%, 2 = 200%, etc.
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraPan, setCameraPan] = useState({ x: 0, y: 0 }); // Pan position in pixels
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inTieBreaker, setInTieBreaker] = useState(false);
  const [tieBreakerHoles, setTieBreakerHoles] = useState<(number | null)[][]>([]); // [playerIndex][holeIndex]
  const [tieBreakerRound, setTieBreakerRound] = useState(0); // 0 = first round (holes 19-20), 1 = second round, etc.

  // Initialize players and scores from selected players
  useEffect(() => {
    const golfPlayers = selectedPlayers.golf[variant] || [];

    if (golfPlayers.length > 0) {
      // Convert Player[] to StoredPlayer[] by looking up in localPlayers
      const storedPlayers = golfPlayers.map(p => {
        const localPlayer = localPlayers.find(lp => lp.id === p.id);
        return localPlayer || {
          ...p,
          isGuest: true,
          addedDate: new Date(),
        };
      });
      setPlayers(storedPlayers);
      setScores(golfPlayers.map(p => ({
        playerId: p.id,
        holes: Array(TOTAL_HOLES).fill(null),
      })));
    } else {
      const mockPlayers: StoredPlayer[] = [
        { id: '1', name: 'MAYOR', avatar: 'fox', isGuest: false, addedDate: new Date() },
        { id: '2', name: 'PIPER ROSE', avatar: 'deer', isGuest: false, addedDate: new Date() },
        { id: '3', name: 'PONCHO MAN', avatar: 'bear', isGuest: false, addedDate: new Date() },
        { id: '4', name: 'KERRMISSIONER', avatar: 'rabbit', isGuest: false, addedDate: new Date() },
      ];
      setPlayers(mockPlayers);
      setScores(mockPlayers.map(p => ({
        playerId: p.id,
        holes: Array(TOTAL_HOLES).fill(null),
      })));
    }
  }, [selectedPlayers, localPlayers, variant]);

  // Handle divider dragging
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setDividerPosition(Math.min(Math.max(newPosition, 20), 80));
    }
  };

  // Touch support for divider
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

  // Save divider position to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('golfCameraDividerPosition', dividerPosition.toString());
    }
  }, [dividerPosition]);

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
  }, [cameraEnabled]);

  // Update video source when stream changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleZoomIn = () => {
    setCameraZoom(prev => Math.min(prev + 0.25, 3)); // Max 3x zoom
  };

  const handleZoomOut = () => {
    setCameraZoom(prev => Math.max(prev - 0.25, 0.5)); // Min 0.5x zoom
  };

  const handleResetZoom = () => {
    setCameraZoom(1);
    setCameraPan({ x: 0, y: 0 }); // Reset pan when resetting zoom
  };

  // Camera pan handlers
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

  // Check if there's a tie for first place
  const checkForTie = (): number[] | null => {
    const totals = scores.map((s, idx) => ({
      playerIndex: idx,
      total: calculateTotal(s.holes, 0, 18)
    }));

    // Sort by total score (ascending - lower is better in golf)
    totals.sort((a, b) => a.total - b.total);

    // Check if top score is tied
    const topScore = totals[0].total;
    const tiedPlayers = totals.filter(t => t.total === topScore).map(t => t.playerIndex);

    return tiedPlayers.length > 1 ? tiedPlayers : null;
  };

  // Check if tie breaker has a winner
  const checkTieBreakerWinner = (tiedPlayers: number[]): number | null => {
    if (tieBreakerHoles.length === 0) return null;

    // Calculate tie breaker totals for current round
    const roundStart = tieBreakerRound * 2;
    const roundEnd = roundStart + 2;

    const tieBreakerTotals = tiedPlayers.map(playerIdx => ({
      playerIndex: playerIdx,
      total: tieBreakerHoles[playerIdx]
        ? tieBreakerHoles[playerIdx].slice(roundStart, roundEnd).reduce((sum, score) => (sum ?? 0) + (score || 0), 0)
        : 0
    }));

    // Sort by total (ascending)
    tieBreakerTotals.sort((a, b) => (a.total ?? 0) - (b.total ?? 0));

    // Check if we have a unique winner
    const topScore = tieBreakerTotals[0].total;
    const stillTied = tieBreakerTotals.filter(t => t.total === topScore);

    return stillTied.length === 1 ? tieBreakerTotals[0].playerIndex : null;
  };

  const handleScoreInput = (score: number) => {
    if (inTieBreaker) {
      // Handle tie breaker scoring
      const newTieBreakerHoles = [...tieBreakerHoles];

      // Calculate absolute index in the tie breaker array based on round and hole
      const holeInRound = (currentHole - TOTAL_HOLES) % 2; // 0 for hole 19, 1 for hole 20
      const absoluteTieBreakerIndex = tieBreakerRound * 2 + holeInRound;

      if (!newTieBreakerHoles[currentPlayerIndex]) {
        newTieBreakerHoles[currentPlayerIndex] = [];
      }
      newTieBreakerHoles[currentPlayerIndex][absoluteTieBreakerIndex] = score;
      setTieBreakerHoles(newTieBreakerHoles);

      // Get tied players from the main game
      const tiedPlayers = checkForTie()!;
      const currentTiedIndex = tiedPlayers.indexOf(currentPlayerIndex);

      // Determine next player based on alternating order
      // Hole 19 (holeInRound 0): normal order
      // Hole 20 (holeInRound 1): reverse order
      if (holeInRound === 0) {
        // Hole 19: normal order
        if (currentTiedIndex < tiedPlayers.length - 1) {
          setCurrentPlayerIndex(tiedPlayers[currentTiedIndex + 1]);
        } else {
          // Move to hole 20
          setCurrentHole(currentHole + 1);
          setCurrentPlayerIndex(tiedPlayers[tiedPlayers.length - 1]); // Start from last player
        }
      } else {
        // Hole 20: reverse order
        if (currentTiedIndex > 0) {
          setCurrentPlayerIndex(tiedPlayers[currentTiedIndex - 1]);
        } else {
          // Round complete, check for winner
          const winner = checkTieBreakerWinner(tiedPlayers);
          if (winner !== null) {
            // We have a winner!
            handleGameComplete();
          } else {
            // Still tied, continue to next round
            setTieBreakerRound(prev => prev + 1);
            setCurrentHole(TOTAL_HOLES); // Reset to hole 19 (display-wise)
            setCurrentPlayerIndex(tiedPlayers[0]); // Start from first tied player
          }
        }
      }
    } else {
      // Handle regular game scoring
      const newScores = [...scores];
      newScores[currentPlayerIndex].holes[currentHole] = score;
      setScores(newScores);

      if (currentPlayerIndex < players.length - 1) {
        setCurrentPlayerIndex(currentPlayerIndex + 1);
      } else {
        if (currentHole < TOTAL_HOLES - 1) {
          setCurrentHole(currentHole + 1);
          setCurrentPlayerIndex(0);
        } else {
          // Game complete, check for tie
          if (tieBreakerEnabled) {
            const tiedPlayers = checkForTie();
            if (tiedPlayers && tiedPlayers.length > 1) {
              // Start tie breaker
              setInTieBreaker(true);
              setTieBreakerHoles(players.map(() => []));
              setCurrentHole(TOTAL_HOLES); // Hole 19
              setCurrentPlayerIndex(tiedPlayers[0]);
              setTieBreakerRound(0);
              return;
            }
          }
          handleGameComplete();
        }
      }
    }
  };

  const handleUndo = () => {
    if (inTieBreaker) {
      // Handle undo in tie breaker mode
      const tiedPlayers = checkForTie()!;
      const currentTiedIndex = tiedPlayers.indexOf(currentPlayerIndex);
      const holeInRound = (currentHole - TOTAL_HOLES) % 2;
      const absoluteTieBreakerIndex = tieBreakerRound * 2 + holeInRound;

      // Search backwards through ALL tie breaker holes to find the last entered score
      let lastScoredPlayerIdx = -1;
      let lastScoredHoleIdx = -1;

      // Start from current position and work backwards
      if (holeInRound === 1) {
        // Currently on hole 20, check players after current (they play in reverse order on hole 20)
        for (let i = currentTiedIndex + 1; i < tiedPlayers.length; i++) {
          const playerIdx = tiedPlayers[i];
          if (tieBreakerHoles[playerIdx]?.[absoluteTieBreakerIndex] != null) {
            lastScoredPlayerIdx = i;
            lastScoredHoleIdx = absoluteTieBreakerIndex;
            break;
          }
        }
        // If not found on hole 20, check all players on hole 19 (previous hole)
        if (lastScoredPlayerIdx === -1) {
          for (let i = tiedPlayers.length - 1; i >= 0; i--) {
            const playerIdx = tiedPlayers[i];
            if (tieBreakerHoles[playerIdx]?.[absoluteTieBreakerIndex - 1] != null) {
              lastScoredPlayerIdx = i;
              lastScoredHoleIdx = absoluteTieBreakerIndex - 1;
              break;
            }
          }
        }
      } else {
        // Currently on hole 19, check previous players on same hole
        for (let i = currentTiedIndex - 1; i >= 0; i--) {
          const playerIdx = tiedPlayers[i];
          if (tieBreakerHoles[playerIdx]?.[absoluteTieBreakerIndex] != null) {
            lastScoredPlayerIdx = i;
            lastScoredHoleIdx = absoluteTieBreakerIndex;
            break;
          }
        }
        // If not found and we're in a later round, check previous round
        if (lastScoredPlayerIdx === -1 && tieBreakerRound > 0) {
          for (let i = 0; i < tiedPlayers.length; i++) {
            const playerIdx = tiedPlayers[i];
            if (tieBreakerHoles[playerIdx]?.[absoluteTieBreakerIndex - 1] != null) {
              lastScoredPlayerIdx = i;
              lastScoredHoleIdx = absoluteTieBreakerIndex - 1;
              break;
            }
          }
        }
      }

      // If no score found anywhere in tie breaker, exit to regular game
      if (lastScoredPlayerIdx === -1) {
        // Clear the last player's score on hole 18
        const newScores = [...scores];
        newScores[players.length - 1].holes[TOTAL_HOLES - 1] = null;
        setScores(newScores);

        setInTieBreaker(false);
        setTieBreakerHoles([]);
        setTieBreakerRound(0);
        setCurrentHole(TOTAL_HOLES - 1);
        setCurrentPlayerIndex(players.length - 1);
        return;
      }

      // Undo the last score
      const newTieBreakerHoles = [...tieBreakerHoles];
      newTieBreakerHoles[tiedPlayers[lastScoredPlayerIdx]][lastScoredHoleIdx] = null;
      setTieBreakerHoles(newTieBreakerHoles);

      // Set position to where that score was
      const wasOnHole20 = lastScoredHoleIdx % 2 === 1;
      if (wasOnHole20) {
        setCurrentHole(TOTAL_HOLES + 1); // Hole 20
      } else {
        setCurrentHole(TOTAL_HOLES); // Hole 19
      }
      setCurrentPlayerIndex(tiedPlayers[lastScoredPlayerIdx]);
    } else if (gameComplete) {
      // If game is complete, we need to undo the last player's last score
      const newScores = [...scores];
      newScores[players.length - 1].holes[TOTAL_HOLES - 1] = null;
      setScores(newScores);
      setCurrentHole(TOTAL_HOLES - 1);
      setCurrentPlayerIndex(players.length - 1);
      setGameComplete(false);
    } else if (currentPlayerIndex > 0) {
      const newScores = [...scores];
      newScores[currentPlayerIndex - 1].holes[currentHole] = null;
      setScores(newScores);
      setCurrentPlayerIndex(currentPlayerIndex - 1);
    } else if (currentHole > 0) {
      const newScores = [...scores];
      newScores[players.length - 1].holes[currentHole - 1] = null;
      setScores(newScores);
      setCurrentHole(currentHole - 1);
      setCurrentPlayerIndex(players.length - 1);
    }
  };

  const handleGameComplete = () => {
    setGameComplete(true);
  };

  const saveGameToDatabase = async () => {
    // Generate unique match ID
    const matchId = `GOLF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine winner
    const totals = scores.map((s, idx) => ({
      playerIndex: idx,
      total: calculateTotal(s.holes, 0, 18) // Only count first 18 holes
    }));
    totals.sort((a, b) => a.total - b.total);

    let winnerId = players[totals[0].playerIndex].id;
    let wonByTieBreaker = false;

    // Check if it was won by tie breaker
    if (inTieBreaker) {
      const tiedPlayers = checkForTie();
      if (tiedPlayers && tiedPlayers.length > 1) {
        const winner = checkTieBreakerWinner(tiedPlayers);
        if (winner !== null) {
          winnerId = players[winner].id;
          wonByTieBreaker = true;
        }
      }
    }

    // Calculate variant-specific points
    const matchPlayPoints = variant === 'match-play' ? calculateMatchPlayPoints(0, 18) : undefined;
    const skinsPoints = variant === 'skins' ? calculateSkinsPoints(0, 18) : undefined;

    // Prepare match data
    const matchData = {
      matchId,
      variant,
      courseName: golfCourseName,
      playMode, // Add play mode to match data
      date: new Date().toISOString(),
      winnerId,
      wonByTieBreaker,
      players: players.map((player, index) => ({
        playerId: player.id,
        playerName: player.name,
        holeScores: scores[index].holes, // Only first 18 holes (tie breaker excluded)
        totalScore: calculateTotal(scores[index].holes, 0, 18), // Only count first 18 holes
        tieBreakerScores: inTieBreaker ? tieBreakerHoles[index] : undefined,
        matchPlayPoints: matchPlayPoints ? matchPlayPoints[index] : undefined,
        skinsPoints: skinsPoints ? skinsPoints[index] : undefined,
      })),
    };

    // TODO: Implement actual database save
    console.log('Saving match data:', matchData);

    // For now, we'll save to localStorage as a placeholder
    try {
      const existingMatches = JSON.parse(localStorage.getItem('golfMatches') || '[]');
      existingMatches.push(matchData);
      localStorage.setItem('golfMatches', JSON.stringify(existingMatches));
      console.log('Match saved successfully!');
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  const handleSaveAndPlayAgain = async () => {
    await saveGameToDatabase();
    router.push(`/golf/${variant}/players`);
  };

  const handleReturnHome = async () => {
    await saveGameToDatabase();
    router.push('/');
  };

  const calculateTotal = (playerScores: (number | null)[], startHole: number, endHole: number): number => {
    return playerScores.slice(startHole, endHole).reduce((sum, score) => (sum ?? 0) + (score || 0), 0) ?? 0;
  };

  const countPlayedHoles = (playerScores: (number | null)[], startHole: number, endHole: number): number => {
    return playerScores.slice(startHole, endHole).filter(score => score !== null).length;
  };

  const calculateParDiff = (total: number, holesPlayed: number): number => {
    return total - (PAR_PER_HOLE * holesPlayed);
  };

  const getScoreColor = (diff: number): string => {
    if (diff < 0) return '#90EE90';
    if (diff > 0) return '#FF6B6B';
    return '#FFFFFF';
  };

  // Calculate player standings and position relative to leader
  const getPlayerStanding = (playerIndex: number): { position: number; leader: boolean; diff: number; diffToLeader: number } => {
    const totals = scores.map((s, idx) => ({
      playerIndex: idx,
      total: calculateTotal(s.holes, 0, currentHole)
    }));

    // Sort by total score (ascending - lower is better in golf)
    totals.sort((a, b) => a.total - b.total);

    const currentPlayerData = totals.find(t => t.playerIndex === playerIndex);
    if (!currentPlayerData || totals.length === 0) {
      return { position: 1, leader: true, diff: 0, diffToLeader: 0 };
    }

    const currentPlayerTotal = currentPlayerData.total;
    const leaderTotal = totals[0].total;
    const position = totals.findIndex(t => t.playerIndex === playerIndex) + 1;
    const isLeader = position === 1;

    // Find the next best score (for leader to show advantage)
    const nextBestTotal = totals.length > 1 ? totals[1].total : leaderTotal;

    return {
      position,
      leader: isLeader,
      diff: currentPlayerTotal - leaderTotal, // Strokes behind leader (0 if leader)
      diffToLeader: isLeader ? nextBestTotal - leaderTotal : currentPlayerTotal - leaderTotal
    };
  };

  const formatScore = (total: number, holesPlayed: number): string => {
    if (total === 0 || holesPlayed === 0) return '-';
    const diff = calculateParDiff(total, holesPlayed);
    const sign = diff > 0 ? '+' : '';
    return `${total} (${sign}${diff})`;
  };

  // Match Play: Calculate points for each player (1 point for best score on each hole, 0 for tie)
  const calculateMatchPlayPoints = (startHole: number, endHole: number): number[] => {
    const points = Array(players.length).fill(0);

    for (let hole = startHole; hole < endHole; hole++) {
      const holeScores = scores.map(s => s.holes[hole]);

      // Only award points if ALL players have completed the hole
      if (holeScores.some(s => s === null)) continue;

      const bestScore = Math.min(...(holeScores as number[]));
      const winnersCount = holeScores.filter(s => s === bestScore).length;

      // Only award point if there's a clear winner (no tie)
      if (winnersCount === 1) {
        holeScores.forEach((score, idx) => {
          if (score === bestScore) {
            points[idx]++;
          }
        });
      }
    }

    return points;
  };

  // Skins: Calculate points with carryover for ties
  const calculateSkinsPoints = (startHole: number, endHole: number): number[] => {
    const points = Array(players.length).fill(0);
    let carryover = 0;

    for (let hole = startHole; hole < endHole; hole++) {
      const holeScores = scores.map(s => s.holes[hole]);

      // Only award points if ALL players have completed the hole
      if (holeScores.some(s => s === null)) continue;

      const bestScore = Math.min(...(holeScores as number[]));
      const winnersCount = holeScores.filter(s => s === bestScore).length;

      if (winnersCount === 1) {
        // Clear winner - award current point + carryover
        holeScores.forEach((score, idx) => {
          if (score === bestScore) {
            points[idx] += 1 + carryover;
            carryover = 0;
          }
        });
      } else {
        // Tie - add to carryover
        carryover++;
      }
    }

    return points;
  };

  // Check if a player won a specific hole (for green highlighting)
  const isHoleWinner = (playerIndex: number, hole: number): boolean => {
    const holeScores = scores.map(s => s.holes[hole]);
    const playerScore = holeScores[playerIndex];

    if (playerScore === null) return false;

    // Only award winner status if ALL players have completed the hole
    if (holeScores.some(s => s === null)) return false;

    const bestScore = Math.min(...(holeScores as number[]));
    const winnersCount = holeScores.filter(s => s === bestScore).length;

    // Winner if has best score and no tie
    return playerScore === bestScore && winnersCount === 1;
  };

  return (
    <div ref={containerRef} className="flex h-screen bg-[#000000] select-none">
      {/* Left Side - Camera Feed */}
      {cameraEnabled && (
        <div className="bg-[#000000] flex items-center justify-center relative overflow-hidden" style={{ width: `${dividerPosition}%` }}>
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
              className="w-10 h-10 bg-[#2d5016] text-white rounded-full flex items-center justify-center hover:bg-[#3d6026] transition-colors text-xl font-bold"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={handleResetZoom}
              className="w-10 h-10 bg-[#2d5016] text-white rounded-full flex items-center justify-center hover:bg-[#3d6026] transition-colors text-xs"
              title="Reset Zoom"
            >
              {Math.round(cameraZoom * 100)}%
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 bg-[#2d5016] text-white rounded-full flex items-center justify-center hover:bg-[#3d6026] transition-colors text-xl font-bold"
              title="Zoom Out"
            >
              −
            </button>
          </div>

          {/* Show message if camera not loaded */}
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
          className="w-1 bg-[#2d5016] hover:bg-[#3d6026] cursor-col-resize relative"
        >
          <div className="absolute inset-y-0 -left-1 -right-1"></div>
        </div>
      )}

      {/* Right Side - Scorecard */}
      <div className="flex-1 bg-[#1a1a1a] flex flex-col overflow-hidden relative" style={{ width: cameraEnabled ? `${100 - dividerPosition}%` : '100%' }}>

        {/* Course Header - fills available space with max limit */}
        <div className="bg-[#5a7a4a] text-center px-4 relative flex-grow flex flex-col items-center justify-center py-4 min-h-[80px] max-h-[40vh]">
          {/* Background image with opacity */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${courseBannerImage || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800'})`,
              opacity: courseBannerOpacity / 100
            }}
          ></div>
          <h1 className="text-white font-bold tracking-wider relative z-10" style={{ fontSize: 'clamp(1.5rem, 4vw, 4rem)' }}>{golfCourseName}</h1>
          <p className="text-white mt-1 opacity-90 relative z-10" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>COURSE RECORD: {courseRecord}</p>

          {/* Current Player Game Status - Anchored to Bottom of Banner */}
          {!gameComplete && currentHole < TOTAL_HOLES && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-6 py-3 text-center z-10">
              <div className="font-bold" style={{ fontSize: 'clamp(1rem, 2.5vw, 2.5rem)' }}>
                {players[currentPlayerIndex]?.name.toUpperCase()} - HOLE {currentHole + 1}
              </div>
              <div className="mt-0.5 opacity-90" style={{ fontSize: 'clamp(0.7rem, 1.6vw, 1.6rem)' }}>
                {(() => {
                  const playerScores = scores[currentPlayerIndex]?.holes || [];
                  const total = calculateTotal(playerScores, 0, currentHole);
                  const holesPlayed = countPlayedHoles(playerScores, 0, currentHole);

                  if (holesPlayed === 0) {
                    return 'Starting Score: Even Par';
                  }

                  const diff = calculateParDiff(total, holesPlayed);
                  const sign = diff > 0 ? '+' : '';
                  const scoreText = `Score: ${total} (${sign}${diff})`;

                  // For Match Play and Skins, show points-based standings
                  if (variant === 'match-play' || variant === 'skins') {
                    const points = variant === 'match-play'
                      ? calculateMatchPlayPoints(0, currentHole)
                      : calculateSkinsPoints(0, currentHole);

                    const currentPlayerPoints = points[currentPlayerIndex];
                    const maxPoints = Math.max(...points);
                    const leadersCount = points.filter(p => p === maxPoints).length;
                    const isLeader = currentPlayerPoints === maxPoints;

                    if (isLeader) {
                      if (leadersCount > 1) {
                        return (
                          <span>
                            {scoreText} - <span style={{ color: '#4ade80' }}>TIED FOR LEAD ({currentPlayerPoints} POINT{currentPlayerPoints !== 1 ? 'S' : ''})</span>
                          </span>
                        );
                      }
                      // Find second place points
                      const otherPoints = points.filter((_, idx) => idx !== currentPlayerIndex);
                      const secondPlace = Math.max(...otherPoints);
                      const advantage = currentPlayerPoints - secondPlace;
                      if (advantage === 0 || otherPoints.length === 0) {
                        return (
                          <span>
                            {scoreText} - <span style={{ color: '#4ade80' }}>LEADING ({currentPlayerPoints} POINT{currentPlayerPoints !== 1 ? 'S' : ''})</span>
                          </span>
                        );
                      }
                      return (
                        <span>
                          {scoreText} - <span style={{ color: '#4ade80' }}>LEADING BY {advantage} POINT{advantage !== 1 ? 'S' : ''} ({currentPlayerPoints} TOTAL)</span>
                        </span>
                      );
                    } else {
                      const behind = maxPoints - currentPlayerPoints;
                      return (
                        <span>
                          {scoreText} - <span style={{ color: '#ef4444' }}>{behind} POINT{behind !== 1 ? 'S' : ''} BEHIND ({currentPlayerPoints} TOTAL)</span>
                        </span>
                      );
                    }
                  }

                  // For Stroke Play, show stroke-based standings
                  const standing = getPlayerStanding(currentPlayerIndex);

                  if (standing.leader) {
                    const advantage = standing.diffToLeader;
                    if (advantage === 0) {
                      return (
                        <span>
                          {scoreText} - <span style={{ color: '#4ade80' }}>TIED FOR LEAD</span>
                        </span>
                      );
                    }
                    return (
                      <span>
                        {scoreText} - <span style={{ color: '#4ade80' }}>LEADING BY {advantage} STROKE{advantage !== 1 ? 'S' : ''}</span>
                      </span>
                    );
                  } else {
                    const behind = standing.diffToLeader;
                    return (
                      <span>
                        {scoreText} - <span style={{ color: '#ef4444' }}>{behind} STROKE{behind !== 1 ? 'S' : ''} BEHIND</span>
                      </span>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Scorecard Tables - scrollable if needed */}
        <div className="px-6 pt-2 pb-0 flex-shrink-0">
          {/* Single unified table */}
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#2d5016]">
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-left font-bold" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 2rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PLAYER</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => (
                  <th
                    key={hole}
                    className={`border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold ${
                      currentHole === hole - 1 ? 'bg-[#6a8a2a]' : ''
                    }`}
                    style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                  >
                    {hole}
                  </th>
                ))}
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {variant === 'match-play' || variant === 'skins' ? 'FRONT 9 PTS' : 'FRONT 9'}
                </th>
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {variant === 'match-play' || variant === 'skins' ? 'TOTAL PTS' : 'OVERALL'}
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, playerIndex) => {
                const playerScores = scores[playerIndex]?.holes || [];

                // Calculate points for Match Play and Skins
                const front9Points = variant === 'match-play'
                  ? calculateMatchPlayPoints(0, 9)[playerIndex]
                  : variant === 'skins'
                  ? calculateSkinsPoints(0, 9)[playerIndex]
                  : 0;

                const totalPoints = variant === 'match-play'
                  ? calculateMatchPlayPoints(0, 18)[playerIndex]
                  : variant === 'skins'
                  ? calculateSkinsPoints(0, 18)[playerIndex]
                  : 0;

                // Calculate stroke play totals
                const front9Total = calculateTotal(playerScores, 0, 9);
                const front9HolesPlayed = countPlayedHoles(playerScores, 0, 9);
                const front9Diff = calculateParDiff(front9Total, front9HolesPlayed);
                const overallTotal = calculateTotal(playerScores, 0, 18);
                const overallHolesPlayed = countPlayedHoles(playerScores, 0, 18);
                const overallDiff = calculateParDiff(overallTotal, overallHolesPlayed);

                return (
                  <tr
                    key={player.id}
                    className={`${
                      currentPlayerIndex === playerIndex && currentHole < 9 ? 'bg-[#3d3d00]' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <td className="border border-[#1a1a1a] p-[0.1vw] text-white font-bold" style={{ height: 'clamp(2rem, 4vw, 6rem)' }}>
                      <span style={{ fontSize: 'clamp(0.8rem, 1.5vw, 2.5rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{player.name.toUpperCase()}</span>
                    </td>
                    {playerScores.slice(0, 9).map((score, holeIndex) => {
                      const isWinner = (variant === 'match-play' || variant === 'skins') && isHoleWinner(playerIndex, holeIndex);
                      return (
                        <td
                          key={holeIndex}
                          className="border border-[#1a1a1a] p-[0.1vw] text-center"
                          style={{
                            fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)',
                            height: 'clamp(2rem, 4vw, 6rem)',
                            color: isWinner ? '#90EE90' : '#FFFFFF'
                          }}
                        >
                          {score !== null ? score : ''}
                        </td>
                      );
                    })}
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: variant === 'stroke-play' && front9Total > 0 ? getScoreColor(front9Diff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {variant === 'match-play' || variant === 'skins'
                        ? front9Points
                        : (front9HolesPlayed > 0 ? formatScore(front9Total, front9HolesPlayed) : '-')}
                    </td>
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: variant === 'stroke-play' && overallTotal > 0 ? getScoreColor(overallDiff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {variant === 'match-play' || variant === 'skins'
                        ? totalPoints
                        : (overallHolesPlayed > 0 ? formatScore(overallTotal, overallHolesPlayed) : '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Back 9 Table */}
          <table className="w-full border-collapse mt-2 table-fixed">
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#2d5016]">
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-left font-bold" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 2rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PLAYER</th>
                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => (
                  <th
                    key={hole}
                    className={`border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold ${
                      currentHole === hole - 1 ? 'bg-[#6a8a2a]' : ''
                    }`}
                    style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                  >
                    {hole}
                  </th>
                ))}
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {variant === 'match-play' || variant === 'skins' ? 'BACK 9 PTS' : 'BACK 9'}
                </th>
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {variant === 'match-play' || variant === 'skins' ? 'TOTAL PTS' : 'OVERALL'}
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, playerIndex) => {
                const playerScores = scores[playerIndex]?.holes || [];

                // Calculate points for Match Play and Skins
                const back9Points = variant === 'match-play'
                  ? calculateMatchPlayPoints(9, 18)[playerIndex]
                  : variant === 'skins'
                  ? calculateSkinsPoints(9, 18)[playerIndex]
                  : 0;

                const totalPoints = variant === 'match-play'
                  ? calculateMatchPlayPoints(0, 18)[playerIndex]
                  : variant === 'skins'
                  ? calculateSkinsPoints(0, 18)[playerIndex]
                  : 0;

                // Calculate stroke play totals
                const back9Total = calculateTotal(playerScores, 9, 18);
                const back9HolesPlayed = countPlayedHoles(playerScores, 9, 18);
                const back9Diff = calculateParDiff(back9Total, back9HolesPlayed);
                const overallTotal = calculateTotal(playerScores, 0, 18);
                const overallHolesPlayed = countPlayedHoles(playerScores, 0, 18);
                const overallDiff = calculateParDiff(overallTotal, overallHolesPlayed);

                return (
                  <tr
                    key={player.id}
                    className={`${
                      currentPlayerIndex === playerIndex && currentHole >= 9 ? 'bg-[#3d3d00]' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <td className="border border-[#1a1a1a] p-[0.1vw] text-white font-bold" style={{ height: 'clamp(2rem, 4vw, 6rem)' }}>
                      <span style={{ fontSize: 'clamp(0.8rem, 1.5vw, 2.5rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{player.name.toUpperCase()}</span>
                    </td>
                    {playerScores.slice(9, 18).map((score, holeIndex) => {
                      const actualHoleIndex = holeIndex + 9;
                      const isWinner = (variant === 'match-play' || variant === 'skins') && isHoleWinner(playerIndex, actualHoleIndex);
                      return (
                        <td
                          key={holeIndex}
                          className="border border-[#1a1a1a] p-[0.1vw] text-center"
                          style={{
                            fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)',
                            height: 'clamp(2rem, 4vw, 6rem)',
                            color: isWinner ? '#90EE90' : '#FFFFFF'
                          }}
                        >
                          {score !== null ? score : ''}
                        </td>
                      );
                    })}
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: variant === 'stroke-play' && back9Total > 0 ? getScoreColor(back9Diff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {variant === 'match-play' || variant === 'skins'
                        ? back9Points
                        : (back9HolesPlayed > 0 ? formatScore(back9Total, back9HolesPlayed) : '-')}
                    </td>
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: variant === 'stroke-play' && overallTotal > 0 ? getScoreColor(overallDiff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {variant === 'match-play' || variant === 'skins'
                        ? (currentHole >= 9 ? totalPoints : '')
                        : (currentHole >= 9 && overallHolesPlayed > 0 ? formatScore(overallTotal, overallHolesPlayed) : '')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Tie Breaker Table */}
          {inTieBreaker && (
            <table className="w-full border-collapse mt-4 table-fixed">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '42.5%' }} />
                <col style={{ width: '42.5%' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#8B0000]">
                  <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-left font-bold" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 2rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PLAYER</th>
                  <th
                    className={`border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold ${
                      currentHole === TOTAL_HOLES ? 'bg-[#A52A2A]' : ''
                    }`}
                    style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                  >
                    19
                  </th>
                  <th
                    className={`border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold ${
                      currentHole === TOTAL_HOLES + 1 ? 'bg-[#A52A2A]' : ''
                    }`}
                    style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                  >
                    20
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, playerIndex) => {
                  const tiedPlayers = checkForTie();
                  const isTiedPlayer = tiedPlayers?.includes(playerIndex);

                  if (!isTiedPlayer) return null; // Only show tied players

                  // Get all tie breaker scores for this player
                  const playerTieBreakerScores = tieBreakerHoles[playerIndex] || [];

                  // Always show the current round's holes (last 2 holes if we have them, or in progress)
                  const currentRoundStart = tieBreakerRound * 2;
                  const hole19Score = playerTieBreakerScores[currentRoundStart] ?? null;
                  const hole20Score = playerTieBreakerScores[currentRoundStart + 1] ?? null;

                  return (
                    <tr
                      key={player.id}
                      className={`${
                        currentPlayerIndex === playerIndex ? 'bg-[#3d3d00]' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <td className="border border-[#1a1a1a] p-[0.1vw] text-white font-bold" style={{ height: 'clamp(2rem, 4vw, 6rem)' }}>
                        <span style={{ fontSize: 'clamp(0.8rem, 1.5vw, 2.5rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{player.name.toUpperCase()}</span>
                      </td>
                      <td className="border border-[#1a1a1a] p-[0.1vw] text-white text-center" style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}>
                        {hole19Score !== null ? hole19Score : ''}
                      </td>
                      <td className="border border-[#1a1a1a] p-[0.1vw] text-white text-center" style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}>
                        {hole20Score !== null ? hole20Score : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Spacer above buttons */}
        <div className="h-4 flex-shrink-0"></div>

        {/* Score Input Buttons - spacing from scorecard */}
        <div className="px-6 pb-0 pt-0 flex-shrink-0">
          <div className="grid grid-cols-7 gap-4">
            {[1, 2, 3, 4, 5, 6].map(score => (
              <button
                key={score}
                onClick={() => handleScoreInput(score)}
                disabled={gameComplete}
                className="bg-[#FFD700] text-black text-6xl font-bold rounded hover:bg-[#FFC700] transition-colors opacity-50 hover:opacity-60 active:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed min-h-[100px] flex items-center justify-center"
              >
                {score}
              </button>
            ))}
            <button
              onClick={handleUndo}
              disabled={currentHole === 0 && currentPlayerIndex === 0}
              className="bg-[#FFD700] text-black text-3xl font-bold rounded hover:bg-[#FFC700] transition-colors opacity-50 hover:opacity-60 active:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed min-h-[100px] flex items-center justify-center"
            >
              UNDO
            </button>
          </div>

          {/* End-of-game buttons */}
          {gameComplete && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={handleSaveAndPlayAgain}
                className="bg-[#2d5016] text-white text-4xl font-bold rounded hover:bg-[#3d6026] transition-colors min-h-[120px] flex items-center justify-center"
              >
                SAVE & PLAY AGAIN
              </button>
              <button
                onClick={handleReturnHome}
                className="bg-[#666666] text-white text-4xl font-bold rounded hover:bg-[#777777] transition-colors min-h-[120px] flex items-center justify-center"
              >
                RETURN HOME
              </button>
            </div>
          )}
        </div>

        {/* Spacer below buttons */}
        <div className="h-4 flex-shrink-0"></div>
      </div>
    </div>
  );
}
