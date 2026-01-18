'use client';

import { GolfPlayerStats } from '@/app/types/stats';

interface ScoreProbabilityHeatmapProps {
  stats: GolfPlayerStats;
}

// Score range to display (1-6 only)
const SCORE_RANGE = [1, 2, 3, 4, 5, 6];

/**
 * Get color based on percentage frequency (traditional heatmap)
 * Low percentage (rare) = GREEN (cool)
 * Medium percentage = YELLOW (warming)
 * High percentage (common) = RED (hot)
 */
function getHeatmapColor(percentage: number): string {
  if (percentage === 0) return '#1a1a1a'; // Dark background for 0%

  // Normalize percentage to 0-1 (assuming 50% is max)
  const normalized = Math.min(percentage / 50, 1);

  // Create green → yellow → red gradient based on frequency
  // 0-0.5: Green → Yellow
  // 0.5-1.0: Yellow → Red

  if (normalized < 0.5) {
    // Green → Yellow transition
    const t = normalized * 2; // 0-0.5 mapped to 0-1
    const r = Math.floor(50 + (205 * t));   // 50 → 255 (green to yellow)
    const g = Math.floor(150 + (105 * t));  // 150 → 255
    const b = Math.floor(50 - (50 * t));    // 50 → 0
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow → Red transition
    const t = (normalized - 0.5) * 2; // 0.5-1.0 mapped to 0-1
    const r = Math.floor(255);              // 255 (stay bright red)
    const g = Math.floor(255 - (148 * t)); // 255 → 107 (yellow to red)
    const b = Math.floor(0);                // 0
    return `rgb(${r}, ${g}, ${b})`;
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
                  {score}
                </td>
                {Array.from({ length: 18 }, (_, holeIndex) => {
                  const distribution = stats.holeScoreDistribution[holeIndex] || {};
                  const percentage = distribution[score] || 0;
                  const bgColor = getHeatmapColor(percentage);

                  return (
                    <td
                      key={holeIndex}
                      className="p-2 border border-[#666666] text-center transition-all hover:opacity-80"
                      style={{ backgroundColor: bgColor }}
                      title={`Hole ${holeIndex + 1}, Score ${score}: ${percentage.toFixed(1)}%`}
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
