'use client';

import { useState, useEffect } from 'react';
import { getFriendGolfLeaderboard, getFriendCricketLeaderboard, FriendGolfStats, FriendCricketStats } from '../lib/friendLeaderboards';
import { getAvatarById, getDefaultAvatar } from '../lib/avatars';

type GameType = 'golf' | 'cricket';
type TimePeriod = 'all-time' | 'month' | 'week';

export default function FriendLeaderboards() {
  const [golfLeaderboard, setGolfLeaderboard] = useState<FriendGolfStats[]>([]);
  const [cricketLeaderboard, setCricketLeaderboard] = useState<FriendCricketStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gameType, setGameType] = useState<GameType>('golf');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all-time');

  // Load leaderboards
  useEffect(() => {
    const loadLeaderboards = async () => {
      setIsLoading(true);
      const [golf, cricket] = await Promise.all([
        getFriendGolfLeaderboard(timePeriod),
        getFriendCricketLeaderboard(timePeriod),
      ]);
      setGolfLeaderboard(golf);
      setCricketLeaderboard(cricket);
      setIsLoading(false);
    };

    loadLeaderboards();
  }, [timePeriod]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 text-lg">Loading leaderboards...</p>
      </div>
    );
  }

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

      {/* Time Period Filter */}
      <div className="flex gap-4">
        <button
          onClick={() => setTimePeriod('all-time')}
          className={`px-6 py-2 font-bold rounded transition-colors ${
            timePeriod === 'all-time'
              ? 'bg-purple-600 text-white'
              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
          }`}
        >
          ALL-TIME
        </button>
        <button
          onClick={() => setTimePeriod('month')}
          className={`px-6 py-2 font-bold rounded transition-colors ${
            timePeriod === 'month'
              ? 'bg-purple-600 text-white'
              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
          }`}
        >
          MONTH
        </button>
        <button
          onClick={() => setTimePeriod('week')}
          className={`px-6 py-2 font-bold rounded transition-colors ${
            timePeriod === 'week'
              ? 'bg-purple-600 text-white'
              : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
          }`}
        >
          WEEK
        </button>
      </div>

      {/* Leaderboard Display */}
      {gameType === 'golf' && (
        <GolfLeaderboardDisplay entries={golfLeaderboard} />
      )}

      {gameType === 'cricket' && (
        <CricketLeaderboardDisplay entries={cricketLeaderboard} />
      )}
    </div>
  );
}

// ============================================================================
// Golf Leaderboard Display Component
// ============================================================================

interface GolfLeaderboardDisplayProps {
  entries: FriendGolfStats[];
}

function GolfLeaderboardDisplay({ entries }: GolfLeaderboardDisplayProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-4">Golf Leaderboard</h3>
        <p className="text-gray-400 text-center">No games played yet by you or your friends.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] rounded-lg p-6">
      <h3 className="text-2xl font-bold text-white mb-4">Golf Leaderboard - Friends</h3>
      <p className="text-gray-400 text-sm mb-6">Compare your golf stats with your friends!</p>

      {/* Leaderboard Table */}
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_100px_100px_80px_100px] gap-4 px-4 py-2 text-gray-400 text-sm font-bold">
          <div>RANK</div>
          <div>PLAYER</div>
          <div className="text-right">BEST</div>
          <div className="text-right">AVG</div>
          <div className="text-right">GAMES</div>
          <div className="text-right">HOLES-IN-1</div>
        </div>

        {/* Entries */}
        {entries.map((entry, index) => {
          const photoUrl = entry.photoUrl;
          const avatar = entry.avatar ? getAvatarById(entry.avatar) || getDefaultAvatar() : getDefaultAvatar();
          const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-400';

          return (
            <div
              key={entry.userId}
              className="grid grid-cols-[60px_1fr_100px_100px_80px_100px] gap-4 px-4 py-3 bg-[#1a1a1a] rounded items-center"
            >
              {/* Rank */}
              <div className={`text-2xl font-bold ${rankColor}`}>
                #{index + 1}
              </div>

              {/* Player */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {photoUrl ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                      <img src={photoUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: avatar.color }}
                    >
                      {avatar.emoji}
                    </div>
                  )}
                  {/* Online indicator */}
                  {entry.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#90EE90] rounded-full border-2 border-[#1a1a1a]" />
                  )}
                </div>
                <span className="text-white font-bold">{entry.displayName}</span>
              </div>

              {/* Best Score */}
              <div className="text-white font-bold text-right text-lg">{entry.bestScore}</div>

              {/* Average Score */}
              <div className="text-gray-300 text-right">{entry.averageScore}</div>

              {/* Games */}
              <div className="text-gray-300 text-right">{entry.totalGames}</div>

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
  entries: FriendCricketStats[];
}

function CricketLeaderboardDisplay({ entries }: CricketLeaderboardDisplayProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-4">Cricket Leaderboard</h3>
        <p className="text-gray-400 text-center">No games played yet by you or your friends.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2a2a] rounded-lg p-6">
      <h3 className="text-2xl font-bold text-white mb-4">Cricket Leaderboard - Friends</h3>
      <p className="text-gray-400 text-sm mb-6">Compare your cricket stats with your friends!</p>

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
              key={entry.userId}
              className="grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 px-4 py-3 bg-[#1a1a1a] rounded items-center"
            >
              {/* Rank */}
              <div className={`text-2xl font-bold ${rankColor}`}>
                #{index + 1}
              </div>

              {/* Player */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {photoUrl ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                      <img src={photoUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: avatar.color }}
                    >
                      {avatar.emoji}
                    </div>
                  )}
                  {/* Online indicator */}
                  {entry.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#90EE90] rounded-full border-2 border-[#1a1a1a]" />
                  )}
                </div>
                <span className="text-white font-bold">{entry.displayName}</span>
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
