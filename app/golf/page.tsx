'use client';

import Header from '../components/Header';
import Link from 'next/link';

export default function GolfModePage() {
  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - MODE SELECT" />

      <main className="pt-24 px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full grid grid-cols-3 gap-6">
          {/* Stroke Play */}
          <Link
            href="/golf/stroke-play/players"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold text-center">STROKE PLAY</span>
          </Link>

          {/* Match Play */}
          <Link
            href="/golf/match-play/players"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold text-center">MATCH PLAY</span>
          </Link>

          {/* Skins */}
          <Link
            href="/golf/skins/players"
            className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
          >
            <span className="text-white text-4xl font-bold text-center">SKINS</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
