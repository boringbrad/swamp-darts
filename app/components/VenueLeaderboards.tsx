'use client';

import { useState, useEffect } from 'react';
import { getVenueLeaderboards, VenueLeaderboards as LeaderboardData, GolfLeaderboardEntry, CricketLeaderboardEntry } from '../lib/venueLeaderboards';
import { getAvatarById, getDefaultAvatar } from '../lib/avatars';

interface VenueLeaderboardsProps {
  venueId: string;
}

type GameType = 'golf' | 'cricket';
type ViewType = 'venue-wide' | 'by-board';

export default function VenueLeaderboards({ venueId }: VenueLeaderboardsProps) {
  const [leaderboards, setLeaderboards] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameType, setGameType] = useState<GameType>('golf');
  const [viewType, setViewType] = useState<ViewType>('venue-wide');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // Load leaderboards
  useEffect(() => {
    const loadLeaderboards = async () => {
      setIsLoading(true);
      const data = await getVenueLeaderboards(venueId);
      setLeaderboards(data);

      // Auto-select first board if available
      if (data.byBoard.length > 0 && !selectedBoardId) {
        setSelectedBoardId(data.byBoard[0].boardId);
      }

      setIsLoading(false);
    };

    if (venueId) {
      loadLeaderboards();
    }
  }, [venueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 text-lg">Loading leaderboards...</p>
      </div>
    );
  }

  if (!leaderboards) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 text-lg">No leaderboard data available.</p>
      </div>
    );
  }

  const selectedBoard = leaderboards.byBoard.find(b => b.boardId === selectedBoardId);

  return (
    <div className="space-y-6">
      {/* Game Type Toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => setGameType('golf')}
          className={`px-6 py-3 font-bold rounded transition-colors ${
            gameType === 'golf'
              ? 'bg-green-600 text-white'
              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
          }`}
        >
          GOLF
        </button>
        <button
          onClick={() => setGameType('cricket')}
          className={`px-6 py-3 font-bold rounded transition-colors ${
            gameType === 'cricket'
              ? 'bg-orange-600 text-white'
              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
          }`}
        >
          CRICKET
        </button>
      </div>

      {/* Golf View */}
      {gameType === 'golf' && (
        <>
          {/* View Type Toggle (Venue-wide vs By Board) */}
          <div className="flex gap-4">
            <button
              onClick={() => setViewType('venue-wide')}
              className={`px-6 py-2 font-bold rounded transition-colors ${
                viewType === 'venue-wide'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
              }`}
            >
              VENUE-WIDE
            </button>
            <button
              onClick={() => setViewType('by-board')}
              className={`px-6 py-2 font-bold rounded transition-colors ${
                viewType === 'by-board'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
              }`}
            >
              BY BOARD
            </button>
          </div>

          {/* Board Selector (if by-board view) */}
          {viewType === 'by-board' && leaderboards.byBoard.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {leaderboards.byBoard.map(board => (
                <button
                  key={board.boardId}
                  onClick={() => setSelectedBoardId(board.boardId)}
                  className={`px-4 py-2 font-bold rounded transition-colors ${
                    selectedBoardId === board.boardId
                      ? 'bg-green-600 text-white'
                      : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                  }`}
                >
                  {board.boardName}
                </button>
              ))}
            </div>
          )}

          {/* Golf Leaderboard Display */}
          {viewType === 'venue-wide' && (
            <GolfLeaderboardDisplay
              entries={leaderboards.venueWide.golf}
              title="Venue-Wide Golf Leaderboard"
            />
          )}

          {viewType === 'by-board' && selectedBoard && (
            <GolfLeaderboardDisplay
              entries={selectedBoard.golf}
              title={`${selectedBoard.boardName} - Golf Leaderboard`}
              subtitle={`${selectedBoard.totalGames} total games played`}
            />
          )}

          {viewType === 'by-board' && leaderboards.byBoard.length === 0 && (
            <div className="bg-[#2a2a2a] rounded-lg p-8 text-center">
              <p className="text-gray-400">No boards found. Golf matches will auto-create boards based on course names.</p>
            </div>
          )}
        </>
      )}

      {/* Cricket View */}
      {gameType === 'cricket' && (
        <CricketLeaderboardDisplay
          entries={leaderboards.venueWide.cricket}
          title="Venue-Wide Cricket Leaderboard"
        />
      )}
    </div>
  );
}

// ============================================================================
// Golf Leaderboard Display Component
// ============================================================================

interface GolfLeaderboardDisplayProps {
  entries: GolfLeaderboardEntry[];
  title: string;
  subtitle?: string;
}

function GolfLeaderboardDisplay({ entries, title, subtitle }: GolfLeaderboardDisplayProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        {subtitle && <p className="text-gray-400 text-sm mb-4">{subtitle}</p>}
        <p className="text-gray-400 text-center">No games played yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] rounded-lg p-6">
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      {subtitle && <p className="text-gray-400 text-sm mb-4">{subtitle}</p>}

      {/* Leaderboard Table */}
      <div className="space-y-2 mt-4">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_100px_100px_80px_80px_100px] gap-4 px-4 py-2 text-gray-400 text-sm font-bold">
          <div>RANK</div>
          <div>PLAYER</div>
          <div className="text-right">BEST</div>
          <div className="text-right">AVG</div>
          <div className="text-right">GAMES</div>
          <div className="text-right">WINS</div>
          <div className="text-right">HOLES-IN-1</div>
        </div>

        {/* Entries */}
        {entries.map((entry, index) => {
          const photoUrl = entry.photoUrl;
          const avatar = entry.avatar ? getAvatarById(entry.avatar) || getDefaultAvatar() : getDefaultAvatar();
          const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-400';

          return (
            <div
              key={`${entry.playerId || entry.playerName}-${index}`}
              className="grid grid-cols-[60px_1fr_100px_100px_80px_80px_100px] gap-4 px-4 py-3 bg-[#1a1a1a] rounded items-center"
            >
              {/* Rank */}
              <div className={`text-2xl font-bold ${rankColor}`}>
                #{index + 1}
              </div>

              {/* Player */}
              <div className="flex items-center gap-3">
                {photoUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                    <img src={photoUrl} alt={entry.playerName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: avatar.color }}
                  >
                    {avatar.emoji}
                  </div>
                )}
                <span className="text-white font-bold">{entry.playerName}</span>
              </div>

              {/* Best Score */}
              <div className="text-white font-bold text-right text-lg">{entry.bestScore}</div>

              {/* Average Score */}
              <div className="text-gray-300 text-right">{entry.averageScore}</div>

              {/* Games */}
              <div className="text-gray-300 text-right">{entry.totalGames}</div>

              {/* Wins */}
              <div className="text-green-400 font-bold text-right">{entry.totalWins}</div>

              {/* Holes in One */}
              <div className="text-yellow-400 font-bold text-right">{entry.holesInOne}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Cricket Leaderboard Display Component
// ============================================================================

interface CricketLeaderboardDisplayProps {
  entries: CricketLeaderboardEntry[];
  title: string;
}

function CricketLeaderboardDisplay({ entries, title }: CricketLeaderboardDisplayProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        <p className="text-gray-400 text-center">No games played yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] rounded-lg p-6">
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>

      {/* Leaderboard Table */}
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 px-4 py-2 text-gray-400 text-sm font-bold">
          <div>RANK</div>
          <div>PLAYER</div>
          <div className="text-right">WIN RATE</div>
          <div className="text-right">WINS</div>
          <div className="text-right">GAMES</div>
        </div>

        {/* Entries */}
        {entries.map((entry, index) => {
          const photoUrl = entry.photoUrl;
          const avatar = entry.avatar ? getAvatarById(entry.avatar) || getDefaultAvatar() : getDefaultAvatar();
          const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-400';

          return (
            <div
              key={`${entry.playerId || entry.playerName}-${index}`}
              className="grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 px-4 py-3 bg-[#1a1a1a] rounded items-center"
            >
              {/* Rank */}
              <div className={`text-2xl font-bold ${rankColor}`}>
                #{index + 1}
              </div>

              {/* Player */}
              <div className="flex items-center gap-3">
                {photoUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                    <img src={photoUrl} alt={entry.playerName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: avatar.color }}
                  >
                    {avatar.emoji}
                  </div>
                )}
                <span className="text-white font-bold">{entry.playerName}</span>
              </div>

              {/* Win Rate */}
              <div className="text-green-400 font-bold text-right text-lg">{entry.winRate}%</div>

              {/* Wins */}
              <div className="text-white font-bold text-right">{entry.totalWins}</div>

              {/* Games */}
              <div className="text-gray-300 text-right">{entry.totalGames}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
