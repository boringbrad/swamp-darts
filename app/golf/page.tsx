'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Link from 'next/link';
import { useAppContext } from '../contexts/AppContext';

export default function GolfModePage() {
  const { tieBreakerEnabled, setTieBreakerEnabled } = useAppContext();
  const [enableTieBreaker, setEnableTieBreaker] = useState(tieBreakerEnabled);

  const handleTieBreakerChange = (checked: boolean) => {
    setEnableTieBreaker(checked);
    setTieBreakerEnabled(checked);
  };

  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - MODE SELECT" />

      <main className="pt-24 px-6 pb-6 flex flex-col items-center justify-center min-h-screen">
        {/* Game Mode Grid */}
        <div className="grid grid-cols-3 gap-6 max-w-6xl w-full">
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

        {/* Spacer */}
        <div className="h-32"></div>

        {/* Tie Breaker Checkbox - Below buttons with spacing */}
        <div className="flex items-center justify-center">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableTieBreaker}
              onChange={(e) => handleTieBreakerChange(e.target.checked)}
              className="w-6 h-6 cursor-pointer"
            />
            <span className="text-white text-2xl font-bold">Enable Tie Breaker</span>
          </label>
        </div>
      </main>
    </div>
  );
}
