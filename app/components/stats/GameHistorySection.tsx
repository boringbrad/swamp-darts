'use client';

import { useState } from 'react';
import { GolfMatch } from '@/app/types/stats';

interface GameHistorySectionProps {
  matches: GolfMatch[];
  playerId: string;
  userId?: string;
}

export default function GameHistorySection({ matches, playerId, userId }: GameHistorySectionProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const gamesPerPage = 10;

  // Sort matches by date (newest first)
  const sortedMatches = [...matches].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate pagination
  const totalPages = Math.ceil(sortedMatches.length / gamesPerPage);
  const startIndex = currentPage * gamesPerPage;
  const endIndex = startIndex + gamesPerPage;
  const currentGames = sortedMatches.slice(startIndex, endIndex);

  const toggleGameExpansion = (matchId: string) => {
    setExpandedGame(expandedGame === matchId ? null : matchId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#333333] rounded-lg p-6 mb-8">
      <h3 className="text-white text-xl font-bold mb-6">GAME HISTORY</h3>

      {/* Games list */}
      <div className="space-y-3">
        {currentGames.map((match) => {
          let playerData;

          // Try userId first (most reliable for admin stats)
          if (userId) {
            playerData = match.players.find(p => (p as any).userId === userId);
          }

          // Try playerId if not found by userId
          if (!playerData) {
            playerData = match.players.find(p => p.playerId === playerId);
          }

          // If still not found and there's only one player, use that player
          if (!playerData && match.players.length === 1) {
            playerData = match.players[0];
          }

          if (!playerData) return null;

          const isWinner = match.winnerId === playerId || (userId && match.players.find(p => p.playerId === match.winnerId && (p as any).userId === userId));
          const isExpanded = expandedGame === match.matchId;

          return (
            <div key={match.matchId} className="bg-[#1a1a1a] rounded-lg overflow-hidden">
              {/* Game Summary - Clickable */}
              <button
                onClick={() => toggleGameExpansion(match.matchId)}
                className="w-full text-left p-4 hover:bg-[#252525] transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Left side: Date, Course, Variant */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="text-white font-bold">
                        {formatDate(match.date)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {formatTime(match.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="text-gray-300 text-sm">
                        {match.courseName}
                      </div>
                      <div className="text-gray-400 text-xs uppercase">
                        {match.variant}
                      </div>
                      <div className="text-gray-400 text-xs uppercase">
                        {match.playMode}
                      </div>
                    </div>
                  </div>

                  {/* Center: Score */}
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-bold ${isWinner ? 'text-[#90EE90]' : 'text-white'}`}>
                      {playerData.totalScore}
                    </div>
                    {isWinner && (
                      <div className="text-[#90EE90] text-sm font-bold">
                        WIN {match.wonByTieBreaker ? '(TB)' : ''}
                      </div>
                    )}
                  </div>

                  {/* Right side: Expand icon */}
                  <div className="text-white ml-4">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Details - Hole-by-hole scores */}
              {isExpanded && (
                <div className="border-t border-[#333333] p-4">
                  {/* All Players Final Scores */}
                  <div className="mb-4">
                    <div className="text-gray-400 text-sm mb-2 font-bold">FINAL SCORES</div>
                    <div className="space-y-2">
                      {match.players
                        .sort((a, b) => a.totalScore - b.totalScore)
                        .map((player) => (
                          <div
                            key={player.playerId}
                            className={`flex justify-between items-center px-3 py-2 rounded ${
                              player.playerId === playerId ? 'bg-[#2d5016]' : 'bg-[#252525]'
                            }`}
                          >
                            <span className="text-white">
                              {player.playerName}
                              {match.winnerId === player.playerId && ' 👑'}
                            </span>
                            <span className={`font-bold ${
                              match.winnerId === player.playerId ? 'text-[#90EE90]' : 'text-white'
                            }`}>
                              {player.totalScore}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Hole-by-hole scores for the player */}
                  <div>
                    <div className="text-gray-400 text-sm mb-2 font-bold">YOUR HOLE-BY-HOLE SCORES</div>
                    <div className="bg-[#252525] rounded p-3 overflow-x-auto">
                      <div className="flex gap-3 min-w-max">
                        {playerData.holeScores.map((score, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div className="text-gray-400 text-xs mb-1">
                              {index + 1}
                            </div>
                            <div className={`text-white font-bold ${
                              score === null ? 'text-gray-600' : ''
                            }`}>
                              {score !== null ? score : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tie breaker scores if present */}
                    {playerData.tieBreakerScores && playerData.tieBreakerScores.some(s => s !== null) && (
                      <div className="mt-4">
                        <div className="text-gray-400 text-sm mb-2 font-bold">TIE BREAKER</div>
                        <div className="flex gap-2">
                          {playerData.tieBreakerScores.map((score, index) => (
                            score !== null && (
                              <div
                                key={index}
                                className="bg-[#9d8b1a] rounded p-2 text-center min-w-[50px]"
                              >
                                <div className="text-gray-200 text-xs mb-1">
                                  TB{index + 1}
                                </div>
                                <div className="text-white font-bold">
                                  {score}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#666666]">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-[#666666] text-white font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            PREVIOUS
          </button>

          <div className="text-white text-sm">
            Page {currentPage + 1} of {totalPages} ({matches.length} total games)
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-4 py-2 bg-[#666666] text-white font-bold rounded hover:bg-[#777777] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            NEXT
          </button>
        </div>
      )}
    </div>
  );
}
