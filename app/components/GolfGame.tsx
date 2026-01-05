'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GolfVariant } from '../types/game';
import { StoredPlayer } from '../types/storage';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAppContext } from '../contexts/AppContext';

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
  const { selectedPlayers } = useAppContext();
  const [players, setPlayers] = useState<StoredPlayer[]>([]);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [currentHole, setCurrentHole] = useState(0); // 0-17 for holes 1-18
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [courseName, setCourseName] = useState('SWAMPY MEADOWS');
  const [courseRecord, setCourseRecord] = useState('PONCHO MAN (51)');
  const [dividerPosition, setDividerPosition] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1); // 1 = 100%, 2 = 200%, etc.
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraPan, setCameraPan] = useState({ x: 0, y: 0 }); // Pan position in pixels
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize players and scores from selected players
  useEffect(() => {
    const golfPlayers = selectedPlayers.golf['stroke-play']?.players || [];

    if (golfPlayers.length > 0) {
      setPlayers(golfPlayers);
      setScores(golfPlayers.map(p => ({
        playerId: p.id,
        holes: Array(TOTAL_HOLES).fill(null),
      })));
    } else {
      const mockPlayers: StoredPlayer[] = [
        { id: '1', name: 'MAYOR', avatar: 'fox', isGuest: false },
        { id: '2', name: 'PIPER ROSE', avatar: 'deer', isGuest: false },
        { id: '3', name: 'PONCHO MAN', avatar: 'bear', isGuest: false },
        { id: '4', name: 'KERRMISSIONER', avatar: 'rabbit', isGuest: false },
      ];
      setPlayers(mockPlayers);
      setScores(mockPlayers.map(p => ({
        playerId: p.id,
        holes: Array(TOTAL_HOLES).fill(null),
      })));
    }
  }, [selectedPlayers, localPlayers]);

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

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Camera stream management
  useEffect(() => {
    if (cameraVisible && !cameraStream) {
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
    } else if (!cameraVisible && cameraStream) {
      // Stop camera
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraVisible]);

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

  const handleScoreInput = (score: number) => {
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
        handleGameComplete();
      }
    }
  };

  const handleUndo = () => {
    // If game is complete, we need to undo the last player's last score
    if (gameComplete) {
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

    // Prepare match data
    const matchData = {
      matchId,
      variant,
      courseName,
      date: new Date().toISOString(),
      players: players.map((player, index) => ({
        playerId: player.id,
        playerName: player.name,
        holeScores: scores[index].holes,
        totalScore: calculateTotal(scores[index].holes, 0, 18),
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
    return playerScores.slice(startHole, endHole).reduce((sum, score) => sum + (score || 0), 0);
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

  const formatScore = (total: number, holesPlayed: number): string => {
    if (total === 0 || holesPlayed === 0) return '-';
    const diff = calculateParDiff(total, holesPlayed);
    const sign = diff > 0 ? '+' : '';
    return `${total} (${sign}${diff})`;
  };

  return (
    <div ref={containerRef} className="flex h-screen bg-[#000000] select-none">
      {/* Left Side - Camera Feed */}
      {cameraVisible && (
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

          {/* Camera controls - Hide button at bottom left */}
          <div className="absolute bottom-4 left-4 z-10">
            <button
              onClick={() => setCameraVisible(false)}
              className="bg-[#2d5016] text-white px-3 py-1 text-sm rounded hover:bg-[#3d6026] transition-colors"
            >
              Hide Camera
            </button>
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
      {cameraVisible && (
        <div onMouseDown={handleMouseDown} className="w-1 bg-[#2d5016] hover:bg-[#3d6026] cursor-col-resize relative">
          <div className="absolute inset-y-0 -left-1 -right-1"></div>
        </div>
      )}

      {/* Right Side - Scorecard */}
      <div className="flex-1 bg-[#1a1a1a] flex flex-col overflow-hidden relative" style={{ width: cameraVisible ? `${100 - dividerPosition}%` : '100%' }}>
        {!cameraVisible && (
          <button
            onClick={() => setCameraVisible(true)}
            className="absolute top-24 left-4 bg-[#2d5016] text-white px-4 py-2 text-sm rounded hover:bg-[#3d6026] transition-colors z-20"
          >
            Show Camera
          </button>
        )}

        {/* Course Header - compact */}
        <div className="bg-[#5a7a4a] text-center px-4 relative flex-shrink-0 flex flex-col items-center justify-center py-4">
          {/* Background image with opacity */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800)' }}
          ></div>
          <h1 className="text-white font-bold tracking-wider relative z-10" style={{ fontSize: 'clamp(1.5rem, 4vw, 4rem)' }}>{courseName}</h1>
          <p className="text-white mt-1 opacity-90 relative z-10" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>COURSE RECORD: {courseRecord}</p>
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
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>FRONT 9</th>
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>OVERALL</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, playerIndex) => {
                const playerScores = scores[playerIndex]?.holes || [];
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
                    {playerScores.slice(0, 9).map((score, holeIndex) => (
                      <td key={holeIndex} className="border border-[#1a1a1a] p-[0.1vw] text-white text-center" style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}>
                        {score !== null ? score : ''}
                      </td>
                    ))}
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: front9Total > 0 ? getScoreColor(front9Diff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {front9HolesPlayed > 0 ? formatScore(front9Total, front9HolesPlayed) : '-'}
                    </td>
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: overallTotal > 0 ? getScoreColor(overallDiff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {overallHolesPlayed > 0 ? formatScore(overallTotal, overallHolesPlayed) : '-'}
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
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>BACK 9</th>
                <th className="border border-[#1a1a1a] p-[0.1vw] text-white text-center font-bold" style={{ fontSize: 'clamp(0.5rem, 1.3vw, 1.8rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>OVERALL</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, playerIndex) => {
                const playerScores = scores[playerIndex]?.holes || [];
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
                    {playerScores.slice(9, 18).map((score, holeIndex) => (
                      <td key={holeIndex} className="border border-[#1a1a1a] p-[0.1vw] text-white text-center" style={{ fontSize: 'clamp(1.1rem, 2.4vw, 3.9rem)', height: 'clamp(2rem, 4vw, 6rem)' }}>
                        {score !== null ? score : ''}
                      </td>
                    ))}
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: back9Total > 0 ? getScoreColor(back9Diff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {back9HolesPlayed > 0 ? formatScore(back9Total, back9HolesPlayed) : '-'}
                    </td>
                    <td
                      className="border border-[#1a1a1a] p-[0.1vw] text-center font-bold"
                      style={{ color: overallTotal > 0 ? getScoreColor(overallDiff) : '#FFFFFF', fontSize: 'clamp(0.8rem, 1.6vw, 2.8rem)', height: 'clamp(2rem, 4vw, 6rem)' }}
                    >
                      {currentHole >= 9 && overallHolesPlayed > 0 ? formatScore(overallTotal, overallHolesPlayed) : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Score Input Buttons - spacing from scorecard */}
        <div className="px-6 pb-4 pt-4 flex-shrink-0">
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
      </div>
    </div>
  );
}
