'use client';

interface RoyalRumbleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoyalRumbleInfoModal({ isOpen, onClose }: RoyalRumbleInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-[#333333] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a5a5a] px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-2xl font-bold">ROYAL RUMBLE - HOW TO PLAY</h2>
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
          {/* Game Objective */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Objective</h3>
            <p className="text-white opacity-90">
              Be the last player standing! Eliminate all opponents by landing hits on their KO Numbers while protecting yourself from incoming attacks. Heal yourself by hitting your own number, but watch out - the No Heal timer will eventually prevent all healing!
            </p>
          </div>

          {/* Setup */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Game Setup</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Players:</strong> 4-20 players compete in one massive free-for-all</li>
              <li><strong>KO Numbers:</strong> Each player is assigned a number (1-20) - this is their weakness</li>
              <li><strong>Entry Order:</strong> Can be randomized or set by user - determines when players enter the match</li>
              <li><strong>Starting Players:</strong> The first 2 players in the entry order start in the game</li>
              <li><strong>Entrance Music:</strong> Optional - players can upload songs that play when they enter</li>
            </ul>
          </div>

          {/* How to Play */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">How to Play</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li>Players take turns throwing 3 darts</li>
              <li>Hit an opponent's KO Number to damage them (+1 hit)</li>
              <li>Hit your own KO Number to heal yourself (-1 hit)</li>
              <li>Use the 2x button to double your next heal (2x heal gives -2 hits instead of -1)</li>
              <li>Players are eliminated when they reach 10 hits</li>
            </ul>
          </div>

          {/* New Player Entries */}
          <div className="bg-[#2d5016] p-4 rounded-lg">
            <h3 className="text-white text-xl font-bold mb-2">🎵 New Player Entries</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Entry Timer:</strong> A new player enters every X seconds (customizable, default 2 minutes)</li>
              <li><strong>Entrance Music:</strong> If enabled, the player's entrance song plays for 30 seconds (customizable)</li>
              <li><strong>Turn Order:</strong> New players are inserted into the turn order right after the current player</li>
              <li>Entry timer pauses when the game is paused</li>
            </ul>
          </div>

          {/* No Heal Mode */}
          <div className="bg-[#8b1a1a] p-4 rounded-lg">
            <h3 className="text-white text-xl font-bold mb-2">⚠️ No Heal Mode</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Activates After:</strong> X minutes into the game (customizable, default 5 minutes)</li>
              <li>Once active, players can NO LONGER heal themselves</li>
              <li>Hitting your own number does nothing - no damage, no healing</li>
              <li>This prevents the game from going on forever and forces players to be more aggressive</li>
              <li>The timer is displayed prominently and warns players before activation</li>
            </ul>
          </div>

          {/* Winning */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Winning the Match</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li>The game ends when only 1 player remains active</li>
              <li>All other players must be eliminated (10 hits) AND all players must have entered the match</li>
              <li>The last player standing is declared the Royal Rumble Winner! 🏆</li>
            </ul>
          </div>

          {/* Strategy Tips */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Strategy Tips</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Early Game:</strong> Balance attacking and healing - don't take too much damage</li>
              <li><strong>Target Priority:</strong> Focus on players with high hit counts - eliminate them before they heal</li>
              <li><strong>Save Your Heals:</strong> Before No Heal activates, get your hit count as low as possible</li>
              <li><strong>Late Game:</strong> Once No Heal is active, every dart counts - play aggressively</li>
              <li><strong>New Entries:</strong> Fresh players enter at 0 hits - they're dangerous!</li>
              <li><strong>2x Multiplier:</strong> Use it strategically to drop from 2 hits to 0 hits in one turn</li>
            </ul>
          </div>

          {/* Controls */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Controls</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Number Keypad:</strong> Click a number (1-20) to record a hit on that player</li>
              <li><strong>Click Player Cards:</strong> You can also click directly on a player's card to hit their number</li>
              <li><strong>MISS Button:</strong> Record a missed dart</li>
              <li><strong>2x Button:</strong> Toggle 2x healing multiplier for your next self-heal</li>
              <li><strong>UNDO Button:</strong> Undo the last dart thrown</li>
              <li><strong>Settings Gear:</strong> Pause game, adjust timers, or restart</li>
            </ul>
          </div>

       
        </div>
      </div>
    </div>
  );
}
