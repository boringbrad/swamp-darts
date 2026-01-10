'use client';

import { GolfPlayerStats } from '@/app/types/stats';

interface StatsSummaryCardsProps {
  stats: GolfPlayerStats;
}

export default function StatsSummaryCards({ stats }: StatsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-6 mb-8">
      {/* Total Games Played */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border-2 border-[#666666]">
        <h3 className="text-[#90EE90] text-lg font-bold mb-2">GAMES PLAYED</h3>
        <div className="text-white text-5xl font-bold">{stats.gamesPlayed}</div>
      </div>

      {/* Total Wins */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border-2 border-[#666666]">
        <h3 className="text-[#90EE90] text-lg font-bold mb-2">WINS</h3>
        <div className="text-white text-5xl font-bold">{stats.wins}</div>
        <div className="text-gray-400 text-sm mt-1">
          {stats.winRate.toFixed(1)}% win rate
        </div>
      </div>

      {/* Average Score */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border-2 border-[#666666]">
        <h3 className="text-[#90EE90] text-lg font-bold mb-2">AVERAGE SCORE</h3>
        <div className="text-white text-5xl font-bold">
          {stats.averageScore.toFixed(1)}
        </div>
        <div className="text-gray-400 text-sm mt-1">
          Best: {stats.bestScore} | Worst: {stats.worstScore}
        </div>
      </div>
    </div>
  );
}
