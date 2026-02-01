'use client';

interface SessionWaitingScreenProps {
  hostName: string;
  gameMode: string;
}

export default function SessionWaitingScreen({ hostName, gameMode }: SessionWaitingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="max-w-md w-full bg-[#333333] rounded-lg p-8 text-center">
        {/* Animated icon */}
        <div className="mb-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-[#90EE90] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 flex items-center justify-center text-4xl">
              🎯
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-white text-2xl font-bold mb-3">Game in Progress</h2>
        <p className="text-gray-300 mb-2">
          {hostName} is currently playing
        </p>
        <p className="text-gray-400 text-sm mb-6">
          {formatGameMode(gameMode)}
        </p>

        <div className="bg-[#222222] rounded-lg p-4 mb-6">
          <p className="text-gray-400 text-sm">
            Your stats will be automatically updated when the game completes.
          </p>
        </div>

        <div className="text-gray-500 text-xs">
          Stay on this page or check back later for results
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
