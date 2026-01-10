'use client';

import { GolfPlayerStats } from '@/app/types/stats';

interface ScoreProbabilityHeatmapProps {
  stats: GolfPlayerStats;
}

// Score range to display (2-9+)
const SCORE_RANGE = [2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Get color based on percentage and score value
 * Lower scores with higher percentages = greener
 * Higher scores with higher percentages = redder
 */
function getHeatmapColor(percentage: number, score: number): string {
  if (percentage === 0) return '#1a1a1a'; // Dark background for 0%

  // Normalize score (2 is best, 9+ is worst)
  // For score 2-3: green spectrum
  // For score 4-5: yellow spectrum
  // For score 6+: red spectrum

  const intensity = Math.min(percentage / 50, 1); // Scale intensity (50% = max)

  if (score <= 3) {
    // Green spectrum for good scores
    const greenValue = Math.floor(144 + (intensity * 100)); // 90EE90 to brighter
    return `rgb(${Math.floor(greenValue * 0.6)}, ${greenValue}, ${Math.floor(greenValue * 0.6)})`;
  } else if (score <= 5) {
    // Yellow spectrum for par-ish scores
    const yellowValue = Math.floor(200 + (intensity * 55));
    return `rgb(${yellowValue}, ${yellowValue}, ${Math.floor(yellowValue * 0.4)})`;
  } else {
    // Red spectrum for bad scores
    const redValue = Math.floor(180 + (intensity * 75));
    return `rgb(${redValue}, ${Math.floor(redValue * 0.4)}, ${Math.floor(redValue * 0.4)})`;
  }
}

export default function ScoreProbabilityHeatmap({ stats }: ScoreProbabilityHeatmapProps) {
  return (
    <div className="bg-[#333333] rounded-lg p-6 mb-8">
      <h2 className="text-white text-2xl font-bold mb-6">SCORE PROBABILITY HEATMAP</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-white text-sm font-bold p-2 border border-[#666666] bg-[#1a1a1a]">
                Score
              </th>
              {Array.from({ length: 18 }, (_, i) => (
                <th
                  key={i}
                  className="text-white text-xs font-bold p-2 border border-[#666666] bg-[#1a1a1a]"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCORE_RANGE.map(score => (
              <tr key={score}>
                <td className="text-white text-sm font-bold p-2 border border-[#666666] bg-[#1a1a1a] text-center">
                  {score === 9 ? '9+' : score}
                </td>
                {Array.from({ length: 18 }, (_, holeIndex) => {
                  const distribution = stats.holeScoreDistribution[holeIndex] || {};

                  // For "9+", sum all scores >= 9
                  let percentage = 0;
                  if (score === 9) {
                    percentage = Object.entries(distribution)
                      .filter(([s]) => parseInt(s) >= 9)
                      .reduce((sum, [, pct]) => sum + pct, 0);
                  } else {
                    percentage = distribution[score] || 0;
                  }

                  const bgColor = getHeatmapColor(percentage, score);

                  return (
                    <td
                      key={holeIndex}
                      className="p-2 border border-[#666666] text-center transition-all hover:opacity-80"
                      style={{ backgroundColor: bgColor }}
                      title={`Hole ${holeIndex + 1}, Score ${score === 9 ? '9+' : score}: ${percentage.toFixed(1)}%`}
                    >
                      <span className="text-white text-xs font-bold drop-shadow-lg">
                        {percentage > 0 ? percentage.toFixed(0) : '-'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info text */}
      <div className="text-gray-400 text-sm mt-4 text-center">
        Percentages show how often you score each number on each hole
      </div>
    </div>
  );
}
