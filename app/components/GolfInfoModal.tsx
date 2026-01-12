'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';

interface GolfInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GolfInfoModal({ isOpen, onClose }: GolfInfoModalProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  // Determine which golf variant we're in
  const isStrokePlay = pathname.includes('stroke-play');
  const isMatchPlay = pathname.includes('match-play');
  const isSkins = pathname.includes('skins');

  // Get variant-specific content
  const getVariantTitle = () => {
    if (isStrokePlay) return 'STROKE PLAY';
    if (isMatchPlay) return 'MATCH PLAY';
    if (isSkins) return 'SKINS';
    return 'GOLF';
  };

  const getVariantRules = () => {
    if (isStrokePlay) {
      return (
        <>
          <h3 className="text-white text-xl font-bold mb-2">Stroke Play Rules</h3>
          <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
            <li>The player with the <strong>lowest total score</strong> wins</li>
            <li>Each turn players may use up to <strong> 3 Darts,</strong> however you may end your turn at any time.</li>
            <li>Only the last dart you thrown per turn counts, so choose your attempts wisely.</li>
            <li>18 Holes are played in regulation.</li>
            <li>In case of a tie, sudden death tiebreaker holes are played (if tie breaker is enabled)</li>
          </ul>
        </>
      );
    }

    if (isMatchPlay) {
      return (
        <>
          <h3 className="text-white text-xl font-bold mb-2">Match Play Rules</h3>
          <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
            <li>Win individual holes to earn <strong>points</strong></li>
            <li>Each turn players may use up to <strong> 3 Darts,</strong> however you may end your turn at any time.</li>
            <li>Only the last dart you thrown per turn counts, so choose your attempts wisely.</li>
            <li>The player with the <strong>lowest score on each hole wins 1 point</strong></li>
            <li>If players tie on a hole, <strong>no points</strong> are awarded to anyone</li>
            <li>After 18 holes, the player with the most points wins</li>
            <li>In case of a tie, sudden death tiebreaker holes are played (if tie breaker is enabled)</li>
          </ul>
        </>
      );
    }

    if (isSkins) {
      return (
        <>
          <h3 className="text-white text-xl font-bold mb-2">Skins Rules</h3>
          <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
            <li>Win individual holes to earn <strong>skins (points)</strong></li>
            <li>Each turn players may use up to <strong> 3 Darts,</strong> however you may end your turn at any time.</li>
            <li>Only the last dart you thrown per turn counts, so choose your attempts wisely.</li>
            <li>The player with the <strong>lowest score on each hole wins 1 skin</strong></li>
            <li>If players tie on a hole, the skin <strong>carries over</strong> to the next hole</li>
            <li>Carryovers accumulate - the next winner gets all carried skins plus the current hole's skin</li>
            <li>After 18 holes, the player with the most skins wins</li>
            <li>In case of a tie, sudden death tiebreaker holes are played (if tie breaker is enabled)</li>
          </ul>
        </>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-[#333333] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#2d5016] px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-2xl font-bold">{getVariantTitle()} - HOW TO PLAY</h2>
          <button
            onClick={onClose}
            className="text-white text-3xl hover:opacity-80 transition-opacity leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rules Section */}
          <div>
            {getVariantRules()}
          </div>

          {/* How Turns Work */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">How Turns Work</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li>Players take turns throwing at each hole</li>
              <li>The turn order stays the same throughout the game</li>
              <li>The banner shows whose turn it is and which hole they're playing</li>
              <li>After all players complete a hole, move on to the next hole</li>
            </ul>
          </div>

          {/* How to Input Score */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">How to Input Score</h3>
            <p className="text-white opacity-90 mb-3">
              After each throw, tap the corresponding score button to record it. Here's how the scoring works:
            </p>

            {/* Score Example Image */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
              <Image
                src="/golf-score-example.png"
                alt="Golf scoring example showing dart board target areas"
                width={800}
                height={600}
                className="w-full h-auto rounded"
              />
            </div>

            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li>Tap the score button immediately after each throw</li>
              <li>Your score is added to the scorecard automatically</li>
              <li>The game advances to the next player when you submit your score</li>
            </ul>
          </div>

          {/* Par Information */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Understanding Par</h3>
            <p className="text-white opacity-90">
              <strong>Par</strong> is the target number of strokes for each hole:
            </p>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5 mt-2">
              <li>In this game every hole is <strong>Par 4.</strong></li>
              <li><strong>Par 5</strong> holes: 5 strokes is expected</li>
              <li>Scoring under par is good (birdie, eagle)</li>
              <li>Scoring over par is less favorable (bogey, double bogey)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#333333] px-6 py-4 border-t border-white/20">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[#2d5016] text-white font-bold rounded hover:bg-[#3d6026] transition-colors"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
