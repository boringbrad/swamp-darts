'use client';

import { usePathname } from 'next/navigation';

interface CricketInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CricketInfoModal({ isOpen, onClose }: CricketInfoModalProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  // Determine which cricket variant we're in
  const isSingles = pathname.includes('singles');
  const isTagTeam = pathname.includes('tag-team');
  const isTripleThreat = pathname.includes('triple-threat');
  const isFatal4Way = pathname.includes('fatal-4-way');

  // Get variant-specific content
  const getVariantTitle = () => {
    if (isSingles) return 'SINGLES MATCH';
    if (isTagTeam) return 'TAG TEAM';
    if (isTripleThreat) return 'TRIPLE THREAT';
    if (isFatal4Way) return 'FATAL 4-WAY';
    return 'CRICKET';
  };

  const getVariantSpecificRules = () => {
    if (isSingles) {
      return (
        <div>
          <h3 className="text-white text-xl font-bold mb-2">Singles Match</h3>
          <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
            <li>1v1 head-to-head competition</li>
            <li>First player to close all 9 targets enters PIN Phase</li>
            <li>No elimination mechanics - straight race to PIN</li>
          </ul>
        </div>
      );
    }

    if (isTagTeam) {
      return (
        <div>
          <h3 className="text-white text-xl font-bold mb-2">Tag Team</h3>
          <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
            <li>2v2 team competition - Red Team vs Blue Team</li>
            <li>Teams alternate turns (Red 1, Blue 1, Red 2, Blue 2, repeat)</li>
            <li>Team shares the same board</li>
            <li>First team to close all 9 targets enters PIN Phase</li>
            <li>You cannot skip your own teammate</li>
          </ul>
        </div>
      );
    }

    if (isTripleThreat || isFatal4Way) {
      const playerCount = isTripleThreat ? '3' : '4';
      return (
        <div>
          <h3 className="text-white text-xl font-bold mb-2">{playerCount}-Player Game with KO System</h3>
          <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
            <li><strong>Two Phases:</strong> KO Phase → PIN Phase</li>
            <li><strong>KO Phase:</strong> Players accumulate KO points by hitting opponents' closed targets</li>
            <li>When a player reaches their <strong>KO Number</strong>, they are eliminated</li>
            <li>Once down to 2 players, the game enters the <strong>PIN Phase</strong></li>
            <li><strong>PIN Phase:</strong> Final 2 players compete to close out and PIN each other</li>
          </ul>
        </div>
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
        <div className="sticky top-0 bg-[#8b1a1a] px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-2xl font-bold">CRICKET - {getVariantTitle()} - HOW TO PLAY</h2>
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
              Close all 9 targets before your opponents, then PIN them to win!
            </p>
          </div>

          {/* Variant-Specific Rules */}
          {getVariantSpecificRules()}

          {/* Basic Rules */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Basic Rules - Closing Targets</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>9 Targets:</strong> 20, 19, 18, 17, 16, 15, Bull, Triples (T), & Doubles (D)</li>
              <li><strong>Closing a Target:</strong> Hit it 3 times (3 marks) to close it</li>
              <li><strong>Multipliers Count:</strong> Double = 2 marks, Triple = 3 marks</li>
              <li><strong>T and D Wildcards:</strong> Any triple counts toward "T", any double counts toward "D"</li>
              <li>Once all 9 targets are closed, you enter the PIN Phase</li>
            </ul>
          </div>

          {/* How Turns Work */}
          <div>
            <h3 className="text-white text-xl font-bold mb-2">How Turns Work</h3>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li>Each player gets <strong>3 darts per turn</strong></li>
              <li><strong>Mark your score:</strong> Press the area under your name to record each dart</li>
              <li><strong>Tap MISS:</strong> For any darts that don't score</li>
              <li>Once 3 darts are input, it will automatically go to the next player</li>
            </ul>
          </div>

          {/* 3 Darts / 3 Marks Bonus Rule */}
          <div className="bg-[#2d5016] p-4 rounded-lg">
            <h3 className="text-white text-xl font-bold mb-2">⚡ 3 DARTS / 3 MARKS BONUS RULE</h3>
            <p className="text-white opacity-90 mb-2">
              If all 3 darts in your turn score marks (hit any targets), you get a <strong>bonus turn immediately!</strong>
            </p>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Note:</strong> Hitting other players (SKIP) or PINning does NOT count toward this bonus</li>
              <li>This bonus can chain - keep scoring with all 3 darts to keep getting bonus turns</li>
              <li>Missing with even 1 dart ends the streak and passes to the next player</li>
              <li>Strategic mastery can allow you to take many consecutive turns</li>
            </ul>
          </div>

          {/* Skip Turn Rule */}
          <div className="bg-[#6b1a8b] p-4 rounded-lg">
            <h3 className="text-white text-xl font-bold mb-2">🔄 SKIP A TURN</h3>
            <p className="text-white opacity-90 mb-2">
              <strong>If you hit the number of an opponent, their next turn is skipped.</strong>
            </p>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Consecutive Skip Protection:</strong> A player cannot be skipped more than one consecutive turn</li>
              <li>Once a player has been skipped, they must throw darts again before they can be skipped</li>
              <li><strong>Multiple Skips:</strong> You may hit multiple opponents per turn (skip multiple players)</li>
              <li><strong>Tag Team:</strong> You cannot hit/skip your own teammate</li>
              <li>A skipped player's turn is completely removed from the rotation for that round</li>
            </ul>
          </div>

          {/* PIN System */}
          <div className="bg-[#1a5a7a] p-4 rounded-lg">
            <h3 className="text-white text-xl font-bold mb-2">📌 PIN SYSTEM</h3>
            <p className="text-white opacity-90 mb-2">
              The <strong>PIN System</strong> creates dramatic comebacks and decides the winner once boards are cleared.
            </p>

            <h4 className="text-white font-bold mt-3 mb-2">When PIN Phase Activates:</h4>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Singles/Tag Team:</strong> As soon as any player/team closes all 9 targets</li>
              <li><strong>3-4 Player Games:</strong> When down to the final 2 players (after KO eliminations)</li>
            </ul>

            <h4 className="text-white font-bold mt-3 mb-2">How PIN Works:</h4>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li>Once your board is cleared, you can build a PIN count</li>
              <li><strong>Building PIN:</strong> On your turn, hit 1, then 2, then 3 (in order) and press the PIN button to increase your PIN count</li>
              <li>Each successful sequence adds 1 to your PIN count</li>
              <li><strong>PIN Count of 3 = Win!</strong> First player to reach 3 wins the match</li>
            </ul>

            <h4 className="text-white font-bold mt-3 mb-2">Kicking Out (Reversing PIN):</h4>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li>You can <strong>kick out</strong> your opponent's PIN progress even without a cleared board</li>
              <li><strong>How to Kick Out:</strong> Hit the numbers in reverse order from where they are</li>
              <li>Example: If opponent is at PIN count 2, you must hit 2, then 1 to kick them out</li>
              <li>Successfully kicking out reduces their PIN count back toward 0</li>
              <li><strong>Note:</strong> You need a cleared board to build your own PIN, but NOT to kick out opponent's PIN</li>
            </ul>

            <h4 className="text-white font-bold mt-3 mb-2">PIN Strategy:</h4>
            <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
              <li><strong>Close Your Board:</strong> You can't build PIN without all 9 targets closed</li>
              <li><strong>Defense:</strong> Watch opponent's PIN count and kick them out before they reach 3</li>
              <li><strong>Offense:</strong> Build your PIN quickly when you have the chance</li>
              <li>The PIN mechanic creates exciting back-and-forth finishes!</li>
            </ul>
          </div>

          {/* KO System (for 3-4 players) */}
          {(isTripleThreat || isFatal4Way) && (
            <div className="bg-[#8b1a1a] p-4 rounded-lg">
              <h3 className="text-white text-xl font-bold mb-2">💥 KO SYSTEM ({isTripleThreat ? '3-Player' : '4-Player'} Games)</h3>

              <h4 className="text-white font-bold mt-3 mb-2">KO Phase:</h4>
              <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
                <li><strong>Clear Your Board First:</strong> Once you close all 9 targets, you can start KO'ing opponents</li>
                <li><strong>How to KO:</strong> Hit an opponent's skip number (their designated number)</li>
                <li>When you hit their skip number, you can choose to either <strong>SKIP</strong> them OR <strong>KO</strong> them (not both!)</li>
                <li>Each KO mark counts as 1 - a player needs <strong>3 KO marks to be eliminated</strong></li>
                <li><strong>Defending:</strong> Any player can remove their own KO marks by hitting their own number on their turn</li>
                <li>Only players with a finished Cricket board can add KOs to opponents</li>
                <li>The KO Phase continues until only 2 players remain</li>
              </ul>

              <h4 className="text-white font-bold mt-3 mb-2">KO Phase → PIN Phase Transition:</h4>
              <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
                <li>Once down to the final 2 players, the game enters the <strong>PIN Phase</strong></li>
                <li>All KO marks are cleared - it's a fresh battle</li>
                <li>The final 2 players compete using the PIN system to determine the winner</li>
                <li>First to build a PIN count of 3 wins!</li>
              </ul>

              <h4 className="text-white font-bold mt-3 mb-2">KO Strategy:</h4>
              <ul className="text-white opacity-90 space-y-2 list-disc pl-5">
                <li><strong>Close Your Board Fast:</strong> You can't KO anyone until your board is cleared</li>
                <li><strong>Target the Leader:</strong> Try to eliminate the strongest player before they eliminate you</li>
                <li><strong>Defense:</strong> Hit your own number to remove KO marks before you reach 3</li>
                <li><strong>Skip vs KO:</strong> Use SKIP strategically to prevent opponents from defending, or KO to apply pressure</li>
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#333333] px-6 py-4 border-t border-white/20">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[#8b1a1a] text-white font-bold rounded hover:bg-[#a52a2a] transition-colors"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
