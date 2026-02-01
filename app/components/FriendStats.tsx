'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { getFriends, Friend } from '../lib/friends';
import GolfStatsDisplay from './stats/GolfStatsDisplay';
import CricketStatsDisplay from './stats/CricketStatsDisplay';
import { getAvatarById, getDefaultAvatar } from '../lib/avatars';
import { calculateCricketStats } from '../lib/cricketStats';
import { CricketPlayerStats } from '../types/stats';

const supabase = createClient();

type GameType = 'golf' | 'cricket';

export default function FriendStats() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [golfMatches, setGolfMatches] = useState<any[]>([]);
  const [cricketMatches, setCricketMatches] = useState<any[]>([]);
  const [cricketStats, setCricketStats] = useState<CricketPlayerStats[]>([]);
  const [gameType, setGameType] = useState<GameType>('golf');

  // Load friends list
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      const friendsList = await getFriends();
      setFriends(friendsList);

      // Auto-select first friend
      if (friendsList.length > 0) {
        setSelectedFriendId(friendsList[0].userId);
      }

      setIsLoading(false);
    };

    loadFriends();
  }, []);

  // Load stats for selected friend
  useEffect(() => {
    const loadFriendStats = async () => {
      if (!selectedFriendId) return;

      try {
        // Get current user to fetch their matches too
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all matches from user and their friends
        // We need to query matches where either the user or their friends are the owner
        // This ensures we get all matches that might contain the selected friend as a participant
        const [golfResponse, cricketResponse] = await Promise.all([
          supabase.from('golf_matches').select('*'),
          supabase.from('cricket_matches').select('*'),
        ]);

        // Filter matches where the selected friend participated
        const filterFriendMatches = (matches: any[]) => {
          return matches.filter(match => {
            if (!match.match_data?.players) return false;
            return match.match_data.players.some((p: any) => {
              const pId = p.userId || p.playerId || p.id;
              return pId === selectedFriendId;
            });
          });
        };

        const friendGolfMatches = filterFriendMatches(golfResponse.data || []);
        const friendCricketMatches = filterFriendMatches(cricketResponse.data || []);

        console.log('[FriendStats] Friend golf matches:', friendGolfMatches.length);
        console.log('[FriendStats] Match data being passed:', friendGolfMatches.map(m => ({
          id: m.id,
          players: m.match_data?.players?.map((p: any) => ({
            playerId: p.playerId,
            userId: p.userId,
            playerName: p.playerName
          }))
        })));

        setGolfMatches(friendGolfMatches);
        setCricketMatches(friendCricketMatches);

        // Calculate cricket stats
        if (friendCricketMatches.length > 0) {
          const cricketMatchData = friendCricketMatches.map(m => m.match_data);
          const calculatedStats = await calculateCricketStats(cricketMatchData, {
            playerId: selectedFriendId,
          });
          setCricketStats(calculatedStats);
        } else {
          setCricketStats([]);
        }
      } catch (error) {
        console.error('Error loading friend stats:', error);
      }
    };

    loadFriendStats();
  }, [selectedFriendId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 text-lg">Loading friends...</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="bg-[#333333] rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">No Friends Yet</h3>
        <p className="text-gray-400">Add friends to see their stats here!</p>
      </div>
    );
  }

  const selectedFriend = friends.find(f => f.userId === selectedFriendId);

  return (
    <div className="space-y-6">
      {/* Game Type Toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => setGameType('golf')}
          className={`px-6 py-3 font-bold rounded transition-colors ${
            gameType === 'golf'
              ? 'bg-green-600 text-white'
              : 'bg-[#333333] text-white hover:bg-[#444444]'
          }`}
        >
          GOLF
        </button>
        <button
          onClick={() => setGameType('cricket')}
          className={`px-6 py-3 font-bold rounded transition-colors ${
            gameType === 'cricket'
              ? 'bg-orange-600 text-white'
              : 'bg-[#333333] text-white hover:bg-[#444444]'
          }`}
        >
          CRICKET
        </button>
      </div>

      {/* Friend Selector */}
      <div className="bg-[#333333] rounded-lg p-6">
        <label className="block text-white font-bold mb-3">Select Friend</label>
        <select
          value={selectedFriendId}
          onChange={(e) => setSelectedFriendId(e.target.value)}
          className="w-full px-4 py-3 bg-[#2a2a2a] border-2 border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#90EE90] focus:border-transparent"
        >
          {friends.map(friend => (
            <option key={friend.userId} value={friend.userId}>
              {friend.displayName || friend.username}
            </option>
          ))}
        </select>

        {/* Selected Friend Info */}
        {selectedFriend && (
          <div className="mt-4 flex items-center gap-4 p-4 bg-[#2a2a2a] rounded">
            {selectedFriend.photoUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                <img
                  src={selectedFriend.photoUrl}
                  alt={selectedFriend.displayName || selectedFriend.username}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: selectedFriend.avatar
                    ? (getAvatarById(selectedFriend.avatar) || getDefaultAvatar()).color
                    : getDefaultAvatar().color
                }}
              >
                {selectedFriend.avatar
                  ? (getAvatarById(selectedFriend.avatar) || getDefaultAvatar()).emoji
                  : getDefaultAvatar().emoji}
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-xl">
                {selectedFriend.displayName || selectedFriend.username}
              </h3>
              <p className="text-gray-400 text-sm">@{selectedFriend.username}</p>
              <p className="text-gray-400 text-sm mt-1">
                {golfMatches.length} Golf • {cricketMatches.length} Cricket
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Golf Stats */}
      {gameType === 'golf' && golfMatches.length > 0 && (
        <div className="bg-[#333333] rounded-lg p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Golf Stats</h3>
          <GolfStatsDisplay
            matches={golfMatches.map(m => m.match_data)}
            playerFilter={selectedFriendId}
          />
        </div>
      )}

      {/* Cricket Stats */}
      {gameType === 'cricket' && cricketMatches.length > 0 && cricketStats.length > 0 && (
        <div className="bg-[#333333] rounded-lg p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Cricket Stats</h3>
          <CricketStatsDisplay
            stats={cricketStats}
            selectedPlayerId={selectedFriendId}
          />
        </div>
      )}

      {/* No Stats Message */}
      {gameType === 'golf' && golfMatches.length === 0 && selectedFriend && (
        <div className="bg-[#333333] rounded-lg p-8 text-center">
          <p className="text-gray-400">
            No golf games found for {selectedFriend.displayName || selectedFriend.username}.
          </p>
        </div>
      )}

      {gameType === 'cricket' && cricketMatches.length === 0 && selectedFriend && (
        <div className="bg-[#333333] rounded-lg p-8 text-center">
          <p className="text-gray-400">
            No cricket games found for {selectedFriend.displayName || selectedFriend.username}.
          </p>
        </div>
      )}
    </div>
  );
}
