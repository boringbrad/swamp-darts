'use client';

import { GolfPlayerStats } from '@/app/types/stats';

interface HoleAverageChartProps {
  stats: GolfPlayerStats;
}

const PAR = 3; // Standard par for dart golf

export default function HoleAverageChart({ stats }: HoleAverageChartProps) {
  // Find max average to scale bars
  const maxAverage = Math.max(...stats.holeAverages, PAR + 2);

  return (
    <div className="bg-[#333333] rounded-lg p-6 mb-8">
      <h2 className="text-white text-2xl font-bold mb-6">HOLE AVERAGES</h2>

      <div className="grid grid-cols-18 gap-1">
        {stats.holeAverages.map((average, index) => {
          const holeNumber = index + 1;
          const heightPercent = (average / maxAverage) * 100;

          // Color based on performance relative to par
          let barColor = '#90EE90'; // Green (under par)
          if (average === PAR) {
            barColor = '#FFD700'; // Yellow (par)
          } else if (average > PAR) {
            barColor = '#FF6B6B'; // Red (over par)
          }

          return (
            <div key={holeNumber} className="flex flex-col items-center">
              {/* Bar container */}
              <div className="w-full h-40 flex flex-col justify-end mb-2">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    backgroundColor: barColor,
                    height: `${heightPercent}%`,
                    minHeight: average > 0 ? '8px' : '0',
                  }}
                  title={`Hole ${holeNumber}: ${average.toFixed(2)} avg`}
                />
              </div>

              {/* Hole number label */}
              <div className="text-white text-xs font-bold">{holeNumber}</div>

              {/* Average value */}
              <div className="text-gray-400 text-xs mt-1">
                {average > 0 ? average.toFixed(1) : '-'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#90EE90' }} />
          <span className="text-white text-sm">Under Par</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFD700' }} />
          <span className="text-white text-sm">Par</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF6B6B' }} />
          <span className="text-white text-sm">Over Par</span>
        </div>
      </div>
    </div>
  );
}
