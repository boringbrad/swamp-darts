'use client';

import Header from '../components/Header';
import Link from 'next/link';

export default function ExtraGamesPage() {
  return (
    <div className="min-h-screen bg-[#1a5a5a]">
      <Header title="EXTRA GAME MODES" />

      <main className="pt-24 px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full grid grid-cols-3 gap-6">
          {/* Ladder */}
          <Link
            href="/extra/ladder"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold">LADDER</span>
          </Link>

          {/* Elimination */}
          <Link
            href="/extra/elimination"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold">ELIMINATION</span>
          </Link>

          {/* Royal Rumble */}
          <Link
            href="/extra/royal-rumble/setup"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold text-center">ROYAL RUMBLE</span>
          </Link>

          {/* Cage */}
          <Link
            href="/extra/cage"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold">CAGE</span>
          </Link>

          {/* Battle Royale */}
          <Link
            href="/extra/battle-royale"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold text-center">BATTLE ROYALE</span>
          </Link>

          {/* x01 */}
          <Link
            href="/extra/x01"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold">x01</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
