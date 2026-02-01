'use client';

import Header from '../components/Header';
import Link from 'next/link';

export default function ExtraGamesPage() {
  return (
    <div className="min-h-screen bg-[#1a5a5a]">
      <Header title="EXTRA GAME MODES" />

      <main className="pt-24 px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full grid grid-cols-3 gap-6">
          {/* Elimination - Disabled */}
          <div className="bg-[#444444] rounded-lg h-64 flex items-center justify-center opacity-40 cursor-not-allowed">
            <span className="text-white text-4xl font-bold">ELIMINATION</span>
          </div>

          {/* Royal Rumble - Disabled */}
          <div className="bg-[#444444] rounded-lg h-64 flex items-center justify-center opacity-40 cursor-not-allowed">
            <span className="text-white text-4xl font-bold text-center">ROYAL RUMBLE</span>
          </div>

          {/* Curling  - Active */}
          <Link
            href="/extra/curling"
            className="bg-[#0984e3] rounded-lg h-64 flex items-center justify-center hover:bg-[#74b9ff] transition-colors"
          >
            <span className="text-white text-4xl font-bold">CURLING (demo)</span>
          </Link>

          {/* Battle Royale - Disabled */}
          <div className="bg-[#444444] rounded-lg h-64 flex items-center justify-center opacity-40 cursor-not-allowed">
            <span className="text-white text-4xl font-bold text-center">BATTLE ROYALE</span>
          </div>

          {/* x01 - Disabled */}
          <div className="bg-[#444444] rounded-lg h-64 flex items-center justify-center opacity-40 cursor-not-allowed">
            <span className="text-white text-4xl font-bold">x01</span>
          </div>
        </div>
      </main>
    </div>
  );
}
