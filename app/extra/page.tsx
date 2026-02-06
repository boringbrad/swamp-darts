'use client';

import Header from '../components/Header';
import Link from 'next/link';

export default function ExtraGamesPage() {
  return (
    <div className="min-h-screen bg-[#1a5a5a]">
      <Header title="EXTRA GAME MODES" />

      <main className="pt-24 px-4 sm:px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full">
          {/* Mode Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Elimination - Disabled */}
            <div className="bg-[#444444] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center opacity-40 cursor-not-allowed px-4">
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">ELIMINATION</span>
            </div>

            {/* Royal Rumble - Disabled */}
            <div className="bg-[#444444] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center opacity-40 cursor-not-allowed px-4">
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">ROYAL RUMBLE</span>
            </div>

            {/* Curling  - Active */}
            <Link
              href="/extra/curling"
              className="bg-[#0984e3] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center hover:bg-[#74b9ff] transition-colors px-4"
            >
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">CURLING (demo)</span>
            </Link>

            {/* Battle Royale - Disabled */}
            <div className="bg-[#444444] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center opacity-40 cursor-not-allowed px-4">
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">BATTLE ROYALE</span>
            </div>

            {/* x01 - Active */}
            <Link
              href="/extra/x01"
              className="bg-[#0984e3] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center hover:bg-[#74b9ff] transition-colors px-4"
            >
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">x01 (demo)</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
