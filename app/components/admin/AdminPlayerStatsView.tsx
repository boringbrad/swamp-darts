'use client';

import { useState, useEffect } from 'react';
import {
  getAllPlayers,
  PlayerInfo,
} from '../../lib/adminPlayerStats';
import AdminGolfStatsDisplay from './AdminGolfStatsDisplay';
import AdminCricketStatsDisplay from './AdminCricketStatsDisplay';

type GameType = 'all' | 'cricket' | 'golf';

export default function AdminPlayerStatsView() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [gameType, setGameType] = useState<GameType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all players
  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const playerList = await getAllPlayers();
      console.log('AdminPlayerStatsView: Loaded players:', playerList.length);
      setPlayers(playerList);
      if (playerList.length === 0) {
        setError('No players found. Make sure users have played games.');
      }
    } catch (err) {
      console.error('AdminPlayerStatsView: Error loading players:', err);
      setError('Failed to load players. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => {
    if (gameType === 'all') return true;
    if (gameType === 'cricket') return p.cricketMatches > 0;
    if (gameType === 'golf') return p.golfMatches > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Game Type Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setGameType('all')}
          className={`px-6 py-2 font-bold rounded transition-opacity ${
            gameType === 'all'
              ? 'bg-[#6b1a8b] text-white'
              : 'bg-[#666666] text-white hover:opacity-80'
          }`}
        >
          ALL GAMES
        </button>
        <button
          onClick={() => setGameType('cricket')}
          className={`px-6 py-2 font-bold rounded transition-opacity ${
            gameType === 'cricket'
              ? 'bg-[#6b1a8b] text-white'
              : 'bg-[#666666] text-white hover:opacity-80'
          }`}
        >
          CRICKET
        </button>
        <button
          onClick={() => setGameType('golf')}
          className={`px-6 py-2 font-bold rounded transition-opacity ${
            gameType === 'golf'
              ? 'bg-[#6b1a8b] text-white'
              : 'bg-[#666666] text-white hover:opacity-80'
          }`}
        >
          GOLF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player List */}
        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-xl font-bold">
              Select Player ({loading ? '...' : filteredPlayers.length})
            </h3>
            {!loading && (
              <button
                onClick={loadPlayers}
                className="px-3 py-1 bg-[#6b1a8b] text-white text-sm font-bold rounded hover:opacity-90"
              >
                Refresh
              </button>
            )}
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="text-white text-lg">Loading players...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 text-lg mb-4">{error}</div>
              <button
                onClick={loadPlayers}
                className="px-6 py-2 bg-[#6b1a8b] text-white font-bold rounded hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-white/50 text-lg">
                No players found for {gameType === 'all' ? 'any game' : gameType}
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`w-full text-left p-4 rounded transition-colors ${
                    selectedPlayer?.id === player.id
                      ? 'bg-[#6b1a8b] text-white'
                      : 'bg-[#1a1a1a] text-white hover:bg-[#333333]'
                  }`}
                >
                  <div className="font-bold">{player.displayName}</div>
                  <div className="text-sm opacity-75">
                    {player.totalMatches} matches
                    {gameType === 'cricket' && ` (${player.cricketMatches} cricket)`}
                    {gameType === 'golf' && ` (${player.golfMatches} golf)`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Player Stats & History */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedPlayer ? (
            <div className="bg-[#2a2a2a] rounded-lg p-12 text-center">
              <div className="text-white text-xl opacity-50">
                Select a player to view their stats
              </div>
            </div>
          ) : (
            <>
              {/* Player Summary */}
              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <h3 className="text-white text-2xl font-bold mb-2">
                  {selectedPlayer.displayName}
                </h3>
                <div className="text-white/75 text-sm mb-4">{selectedPlayer.email}</div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-white/75 text-sm">Total Matches</div>
                    <div className="text-white text-3xl font-bold">
                      {selectedPlayer.totalMatches}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/75 text-sm">Cricket</div>
                    <div className="text-white text-3xl font-bold">
                      {selectedPlayer.cricketMatches}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/75 text-sm">Golf</div>
                    <div className="text-white text-3xl font-bold">
                      {selectedPlayer.golfMatches}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Stats Displays */}
              {gameType === 'golf' && selectedPlayer.golfMatches > 0 && (
                <AdminGolfStatsDisplay
                  userId={selectedPlayer.id}
                  playerName={selectedPlayer.displayName}
                />
              )}

              {gameType === 'cricket' && selectedPlayer.cricketMatches > 0 && (
                <AdminCricketStatsDisplay
                  userId={selectedPlayer.id}
                  playerName={selectedPlayer.displayName}
                />
              )}

              {gameType === 'all' && (
                <>
                  {selectedPlayer.golfMatches > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-white text-2xl font-bold">GOLF STATS</h3>
                      <AdminGolfStatsDisplay
                        userId={selectedPlayer.id}
                        playerName={selectedPlayer.displayName}
                      />
                    </div>
                  )}

                  {selectedPlayer.cricketMatches > 0 && (
                    <div className="space-y-6 mt-8">
                      <h3 className="text-white text-2xl font-bold">CRICKET STATS</h3>
                      <AdminCricketStatsDisplay
                        userId={selectedPlayer.id}
                        playerName={selectedPlayer.displayName}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

