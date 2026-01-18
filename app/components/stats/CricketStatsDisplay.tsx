'use client';

import { CricketPlayerStats } from '@/app/types/stats';

interface CricketStatsDisplayProps {
  stats: CricketPlayerStats[];
  selectedPlayerId?: string;
}

export default function CricketStatsDisplay({ stats, selectedPlayerId }: CricketStatsDisplayProps) {
  // If player selected, show only that player's stats
  const displayStats = selectedPlayerId
    ? stats.filter(s => s.playerId === selectedPlayerId)
    : stats;

  if (displayStats.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        <p className="text-xl">No Cricket stats available</p>
        <p className="text-sm mt-2">Play some Cricket games to see stats here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {displayStats.map(playerStats => (
        <div key={playerStats.playerId} className="space-y-6">
          {/* Player Header */}
          <div className="bg-[#1a1a1a] rounded-lg p-4">
            <h2 className="text-2xl font-bold text-white">{playerStats.playerName}</h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Games Played</p>
              <p className="text-white text-3xl font-bold">{playerStats.gamesPlayed}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Wins</p>
              <p className="text-white text-3xl font-bold">{playerStats.wins}</p>
              <p className="text-gray-400 text-xs">
                {playerStats.winRate.toFixed(1)}% Win Rate
              </p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Average MPR</p>
              <p className="text-white text-3xl font-bold">{playerStats.averageMPR.toFixed(2)}</p>
              <p className="text-gray-400 text-xs">Best: {playerStats.bestMPR.toFixed(2)}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Accuracy</p>
              <p className="text-white text-3xl font-bold">
                {playerStats.averageAccuracy.toFixed(1)}%
              </p>
              <p className="text-gray-400 text-xs">
                {playerStats.totalMarks} / {playerStats.totalDarts} darts
              </p>
            </div>
          </div>

          {/* Skip Stats */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">SKIP STATISTICS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Players Skipped</p>
                <p className="text-white text-2xl font-bold">{playerStats.totalPlayersSkipped}</p>
                <p className="text-gray-400 text-xs">
                  {playerStats.avgPlayersSkippedPerGame.toFixed(2)} per game
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Times Skipped</p>
                <p className="text-white text-2xl font-bold">{playerStats.totalTimesSkipped}</p>
                <p className="text-gray-400 text-xs">
                  {playerStats.avgTimesSkippedPerGame.toFixed(2)} per game
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Skip Ratio</p>
                <p className="text-white text-2xl font-bold">
                  {playerStats.totalTimesSkipped > 0
                    ? (playerStats.totalPlayersSkipped / playerStats.totalTimesSkipped).toFixed(2)
                    : 'N/A'}
                </p>
                <p className="text-gray-400 text-xs">Given / Received</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Net Skips</p>
                <p
                  className={`text-2xl font-bold ${
                    playerStats.totalPlayersSkipped > playerStats.totalTimesSkipped
                      ? 'text-green-400'
                      : playerStats.totalPlayersSkipped < playerStats.totalTimesSkipped
                      ? 'text-red-400'
                      : 'text-white'
                  }`}
                >
                  {playerStats.totalPlayersSkipped > playerStats.totalTimesSkipped ? '+' : ''}
                  {playerStats.totalPlayersSkipped - playerStats.totalTimesSkipped}
                </p>
                <p className="text-gray-400 text-xs">Given minus Received</p>
              </div>
            </div>
          </div>

          {/* PIN Stats */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">PIN STATISTICS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">PIN Attempts</p>
                <p className="text-white text-2xl font-bold">{playerStats.totalPinAttempts}</p>
                <p className="text-gray-400 text-xs">Partial hits (1-2)</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">PIN Kickouts</p>
                <p className="text-white text-2xl font-bold">{playerStats.totalPinKickouts}</p>
                <p className="text-gray-400 text-xs">Reversed opponent</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">PIN Closeouts</p>
                <p className="text-white text-2xl font-bold">{playerStats.totalPinCloseouts}</p>
                <p className="text-gray-400 text-xs">Winning PIN (3)</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Success Rate</p>
                <p className="text-white text-2xl font-bold">
                  {playerStats.pinSuccessRate.toFixed(1)}%
                </p>
                <p className="text-gray-400 text-xs">
                  Closeouts / Total Attempts
                </p>
              </div>
            </div>
          </div>

          {/* KO Stats (if applicable) */}
          {(playerStats.totalKOPointsGiven > 0 || playerStats.timesEliminated > 0) && (
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">KO STATISTICS</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">KO Points Given</p>
                  <p className="text-white text-2xl font-bold">{playerStats.totalKOPointsGiven}</p>
                  <p className="text-gray-400 text-xs">
                    {playerStats.avgKOPointsPerGame.toFixed(1)} per game
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Eliminations Caused</p>
                  <p className="text-white text-2xl font-bold">
                    {playerStats.totalKOEliminationsCaused}
                  </p>
                  <p className="text-gray-400 text-xs">Players eliminated</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Times Eliminated</p>
                  <p className="text-white text-2xl font-bold">{playerStats.timesEliminated}</p>
                  <p className="text-gray-400 text-xs">Knocked out of games</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">KO Efficiency</p>
                  <p className="text-white text-2xl font-bold">
                    {playerStats.totalKOEliminationsCaused > 0
                      ? (playerStats.totalKOPointsGiven / playerStats.totalKOEliminationsCaused).toFixed(1)
                      : 'N/A'}
                  </p>
                  <p className="text-gray-400 text-xs">Points per elimination</p>
                </div>
              </div>
            </div>
          )}

          {/* Relationship Stats */}
          {(playerStats.biggestRivalry || playerStats.bestPartner) && (
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">RELATIONSHIPS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {playerStats.biggestRivalry && (
                  <div className="bg-[#2a2a2a] rounded p-4">
                    <p className="text-gray-400 text-sm mb-2">Biggest Rivalry</p>
                    <p className="text-white text-xl font-bold mb-2">
                      {playerStats.biggestRivalry.opponentName}
                    </p>
                    <div className="text-gray-400 text-sm space-y-1">
                      <p>Games: {playerStats.biggestRivalry.gamesPlayed}</p>
                      <p>
                        Record: {playerStats.biggestRivalry.wins}W -{' '}
                        {playerStats.biggestRivalry.losses}L
                      </p>
                      <p className="text-xs italic">Most competitive matchup</p>
                    </div>
                  </div>
                )}
                {playerStats.bestPartner && (
                  <div className="bg-[#2a2a2a] rounded p-4">
                    <p className="text-gray-400 text-sm mb-2">Best Partner</p>
                    <p className="text-white text-xl font-bold mb-2">
                      {playerStats.bestPartner.partnerName}
                    </p>
                    <div className="text-gray-400 text-sm space-y-1">
                      <p>Games: {playerStats.bestPartner.gamesPlayed}</p>
                      <p>
                        Record: {playerStats.bestPartner.wins}W - {playerStats.bestPartner.losses}L
                      </p>
                      <p>Win Rate: {playerStats.bestPartner.winRate.toFixed(1)}%</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Streaks */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">STREAKS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Longest Dart Streak</p>
                <p className="text-white text-2xl font-bold">{playerStats.longestDartStreak}</p>
                <p className="text-gray-400 text-xs">Consecutive scoring darts</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Longest Win Streak</p>
                <p className="text-white text-2xl font-bold">{playerStats.longestWinStreak}</p>
                <p className="text-gray-400 text-xs">Consecutive wins</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Longest Loss Streak</p>
                <p className="text-white text-2xl font-bold">{playerStats.longestLossStreak}</p>
                <p className="text-gray-400 text-xs">Consecutive losses</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Current Streak</p>
                <p
                  className={`text-2xl font-bold ${
                    playerStats.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {playerStats.currentStreak.count}
                  {playerStats.currentStreak.type === 'win' ? 'W' : 'L'}
                </p>
                <p className="text-gray-400 text-xs">
                  {playerStats.currentStreak.type === 'win' ? 'Winning' : 'Losing'} streak
                </p>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">EFFICIENCY & ACHIEVEMENTS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Perfect Rounds</p>
                <p className="text-white text-2xl font-bold">{playerStats.perfectRounds}</p>
                <p className="text-gray-400 text-xs">All 3 darts scored</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Avg Marks/Dart</p>
                <p className="text-white text-2xl font-bold">
                  {playerStats.avgDartsPerMark > 0 ? (1 / playerStats.avgDartsPerMark).toFixed(2) : '0.00'}
                </p>
                <p className="text-gray-400 text-xs">Higher is better</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Comeback Wins</p>
                <p className="text-white text-2xl font-bold">{playerStats.comebackWins}</p>
                <p className="text-gray-400 text-xs">Won from behind</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Marks</p>
                <p className="text-white text-2xl font-bold">{playerStats.totalMarks}</p>
                <p className="text-gray-400 text-xs">All games combined</p>
              </div>
            </div>
          </div>

          {/* Variant Breakdown */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">PERFORMANCE BY VARIANT</h3>
            <div className="space-y-3">
              {Object.entries(playerStats.variantStats)
                .filter(([_, stats]) => (stats as any).gamesPlayed > 0)
                .map(([variant, stats]) => {
                  const variantStats = stats as any;
                  const winRate =
                    variantStats.gamesPlayed > 0
                      ? (variantStats.wins / variantStats.gamesPlayed) * 100
                      : 0;

                  return (
                    <div key={variant} className="bg-[#2a2a2a] rounded p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-white font-bold capitalize">
                          {variant.replace('-', ' ')}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {variantStats.gamesPlayed} games
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-gray-400 text-xs">Wins</p>
                          <p className="text-white font-bold">{variantStats.wins}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Win Rate</p>
                          <p className="text-white font-bold">{winRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Avg MPR</p>
                          <p className="text-white font-bold">
                            {variantStats.averageMPR.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
