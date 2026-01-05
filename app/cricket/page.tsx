'use client';

import Header from '../components/Header';
import Link from 'next/link';
import { useState } from 'react';

export default function CricketModePage() {
  const [swampRules, setSwampRules] = useState(true);
  const [noPoint, setNoPoint] = useState(false);
  const [point, setPoint] = useState(false);

  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET" />

      <main className="pt-24 px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full">
          {/* Mode Selection Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Singles */}
            <Link
              href="/cricket/singles/players"
              className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
            >
              <span className="text-white text-5xl font-bold">SINGLES</span>
            </Link>

            {/* Tag Team */}
            <Link
              href="/cricket/tag-team/players"
              className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
            >
              <span className="text-white text-5xl font-bold">TAG TEAM</span>
            </Link>

            {/* Triple Threat */}
            <Link
              href="/cricket/triple-threat/players"
              className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
            >
              <span className="text-white text-5xl font-bold">TRIPLE THREAT</span>
            </Link>

            {/* Fatal 4 Way */}
            <Link
              href="/cricket/fatal-4-way/players"
              className="bg-[#666666] rounded-lg h-64 flex items-center justify-center hover:bg-[#777777] transition-colors"
            >
              <span className="text-white text-5xl font-bold">FATAL 4 WAY</span>
            </Link>
          </div>

          {/* Rules Selection */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                setSwampRules(true);
                setNoPoint(false);
                setPoint(false);
              }}
              className="flex items-center gap-4 text-white text-2xl font-bold"
            >
              <div className={`w-8 h-8 border-4 border-white flex items-center justify-center ${swampRules ? 'bg-white' : ''}`}>
                {swampRules && <div className="w-4 h-4 bg-[#8b1a1a]"></div>}
              </div>
              SWAMP RULES
            </button>

            <button
              onClick={() => {
                setSwampRules(false);
                setNoPoint(true);
                setPoint(false);
              }}
              className="flex items-center gap-4 text-white text-2xl font-bold"
            >
              <div className={`w-8 h-8 border-4 border-white flex items-center justify-center ${noPoint ? 'bg-white' : ''}`}>
                {noPoint && <div className="w-4 h-4 bg-[#8b1a1a]"></div>}
              </div>
              NO POINT
            </button>

            <button
              onClick={() => {
                setSwampRules(false);
                setNoPoint(false);
                setPoint(true);
              }}
              className="flex items-center gap-4 text-white text-2xl font-bold"
            >
              <div className={`w-8 h-8 border-4 border-white flex items-center justify-center ${point ? 'bg-white' : ''}`}>
                {point && <div className="w-4 h-4 bg-[#8b1a1a]"></div>}
              </div>
              POINT
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
