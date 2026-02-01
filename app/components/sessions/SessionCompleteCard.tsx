'use client';

import { useRouter } from 'next/navigation';

interface SessionCompleteCardProps {
  gameMode: string;
  participantCount: number;
}

export default function SessionCompleteCard({ gameMode, participantCount }: SessionCompleteCardProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="max-w-md w-full bg-green-900/30 border-2 border-green-500 rounded-lg p-8 text-center">
        {/* Success icon */}
        <div className="text-6xl mb-4">✓</div>

        {/* Message */}
        <h2 className="text-white text-2xl font-bold mb-3">Game Completed!</h2>
        <p className="text-gray-300 mb-2">
          {formatGameMode(gameMode)} match finished
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Stats have been updated for all {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </p>

        <div className="bg-[#222222] rounded-lg p-4 mb-6">
          <p className="text-gray-300 text-sm">
            Check your stats page to see your updated performance!
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/stats')}
            className="w-full py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
          >
            VIEW STATS
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-4 bg-[#333333] text-white font-bold rounded hover:bg-[#444444] transition-colors"
          >
            GO HOME
          </button>
        </div>
      </div>
    </div>
  );
}

function formatGameMode(gameMode: string): string {
  const modeMap: Record<string, string> = {
    'cricket_singles': 'Cricket Singles',
    'cricket_tag_team': 'Cricket Tag Team',
    'cricket_triple_threat': 'Cricket Triple Threat',
    'cricket_fatal_4_way': 'Cricket Fatal 4-Way',
    'golf_stroke_play': 'Golf Stroke Play',
    'golf_match_play': 'Golf Match Play',
    'golf_skins': 'Golf Skins',
  };

  return modeMap[gameMode] || gameMode;
}
