'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import GolfStatsDisplay from './stats/GolfStatsDisplay';
import CricketStatsDisplay from './stats/CricketStatsDisplay';
import { getAvatarById, getDefaultAvatar } from '../lib/avatars';
import { calculateCricketStats } from '../lib/cricketStats';
import { CricketPlayerStats } from '../types/stats';

const supabase = createClient();

interface VenueStatsProps {
  venueId: string;
}

interface VenuePlayer {
  id: string;
  name: string;
  avatar?: string;
  photoUrl?: string;
  isGuest: boolean;
}

type GameType = 'golf' | 'cricket';

export default function VenueStats({ venueId }: VenueStatsProps) {
  const [players, setPlayers] = useState<VenuePlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [golfMatches, setGolfMatches] = useState<any[]>([]);
  const [cricketMatches, setCricketMatches] = useState<any[]>([]);
  const [cricketStats, setCricketStats] = useState<CricketPlayerStats[]>([]);
  const [gameType, setGameType] = useState<GameType>('golf');

  // Load all players who have played at this venue
  useEffect(() => {
    const loadPlayers = async () => {
      setIsLoading(true);

      try {
        // Get all matches for this venue
        const [golfResponse, cricketResponse] = await Promise.all([
          supabase.from('golf_matches').select('match_data').eq('venue_id', venueId),
          supabase.from('cricket_matches').select('match_data').eq('venue_id', venueId),
        ]);

        const allMatches = [
          ...(golfResponse.data || []),
          ...(cricketResponse.data || []),
        ];

        // Extract unique players from all matches
        const playerMap = new Map<string, VenuePlayer>();

        allMatches.forEach(match => {
          const matchData = match.match_data;
          if (!matchData?.players) return;

          matchData.players.forEach((player: any) => {
            const playerId = player.playerId || player.id || player.playerName || player.name;
            const playerName = player.playerName || player.name || 'Unknown';

            if (!playerMap.has(playerId)) {
              playerMap.set(playerId, {
                id: playerId,
                name: playerName,
                avatar: player.avatar,
                photoUrl: player.photoUrl,
                isGuest: !player.userId, // Guest if no userId
              });
            }
          });
        });

        const playersList = Array.from(playerMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setPlayers(playersList);

        // Auto-select first player
        if (playersList.length > 0) {
          setSelectedPlayerId(playersList[0].id);
        }
      } catch (error) {
        console.error('Error loading venue players:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (venueId) {
      loadPlayers();
    }
  }, [venueId]);

  // Load stats for selected player
  useEffect(() => {
    const loadPlayerStats = async () => {
      if (!selectedPlayerId || !venueId) return;

      try {
        // Fetch all matches for this venue
        const [golfResponse, cricketResponse] = await Promise.all([
          supabase.from('golf_matches').select('*').eq('venue_id', venueId),
          supabase.from('cricket_matches').select('*').eq('venue_id', venueId),
        ]);

        // Filter matches where this player participated
        const filterPlayerMatches = (matches: any[]) => {
          return matches.filter(match => {
            if (!match.match_data?.players) return false;
            return match.match_data.players.some((p: any) => {
              const pId = p.playerId || p.id || p.playerName || p.name;
              return pId === selectedPlayerId;
            });
          });
        };

        const playerGolfMatches = filterPlayerMatches(golfResponse.data || []);
        const playerCricketMatches = filterPlayerMatches(cricketResponse.data || []);

        setGolfMatches(playerGolfMatches);
        setCricketMatches(playerCricketMatches);

        // Calculate cricket stats
        if (playerCricketMatches.length > 0) {
          const cricketMatchData = playerCricketMatches.map(m => m.match_data);
          const calculatedStats = await calculateCricketStats(cricketMatchData, {
            playerId: selectedPlayerId,
          });
          setCricketStats(calculatedStats);
        } else {
          setCricketStats([]);
        }
      } catch (error) {
        console.error('Error loading player stats:', error);
      }
    };

    loadPlayerStats();
  }, [selectedPlayerId, venueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 text-lg">Loading players...</p>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="bg-[#2a2a2a] rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">No Games Yet</h3>
        <p className="text-gray-400">No games have been played at this venue yet.</p>
      </div>
    );
  }

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

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

      {/* Player Selector */}
      <div className="bg-[#2a2a2a] rounded-lg p-6">
        <label className="block text-white font-bold mb-3">Select Player</label>
        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        >
          {players.map(player => {
            const avatar = player.avatar ? getAvatarById(player.avatar) || getDefaultAvatar() : getDefaultAvatar();
            return (
              <option key={player.id} value={player.id}>
                {player.name} {player.isGuest ? '(Guest)' : ''}
              </option>
            );
          })}
        </select>

        {/* Selected Player Info */}
        {selectedPlayer && (
          <div className="mt-4 flex items-center gap-4 p-4 bg-[#1a1a1a] rounded">
            {selectedPlayer.photoUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                <img
                  src={selectedPlayer.photoUrl}
                  alt={selectedPlayer.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: selectedPlayer.avatar
                    ? (getAvatarById(selectedPlayer.avatar) || getDefaultAvatar()).color
                    : getDefaultAvatar().color
                }}
              >
                {selectedPlayer.avatar
                  ? (getAvatarById(selectedPlayer.avatar) || getDefaultAvatar()).emoji
                  : getDefaultAvatar().emoji}
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-xl">{selectedPlayer.name}</h3>
              <p className="text-gray-400 text-sm">
                {selectedPlayer.isGuest ? 'Venue Guest' : 'Registered Player'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {golfMatches.length} Golf • {cricketMatches.length} Cricket
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Golf Stats */}
      {gameType === 'golf' && golfMatches.length > 0 && (
        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Golf Stats</h3>
          <GolfStatsDisplay
            matches={golfMatches.map(m => m.match_data)}
            playerFilter={selectedPlayerId}
          />
        </div>
      )}

      {/* Cricket Stats */}
      {gameType === 'cricket' && cricketMatches.length > 0 && cricketStats.length > 0 && (
        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Cricket Stats</h3>
          <CricketStatsDisplay
            stats={cricketStats}
            selectedPlayerId={selectedPlayerId}
          />
        </div>
      )}

      {/* No Stats Message */}
      {gameType === 'golf' && golfMatches.length === 0 && selectedPlayer && (
        <div className="bg-[#2a2a2a] rounded-lg p-8 text-center">
          <p className="text-gray-400">
            No golf games found for {selectedPlayer.name} at this venue.
          </p>
        </div>
      )}

      {gameType === 'cricket' && cricketMatches.length === 0 && selectedPlayer && (
        <div className="bg-[#2a2a2a] rounded-lg p-8 text-center">
          <p className="text-gray-400">
            No cricket games found for {selectedPlayer.name} at this venue.
          </p>
        </div>
      )}
    </div>
  );
}
