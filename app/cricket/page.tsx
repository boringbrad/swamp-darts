'use client';

import Header from '../components/Header';
import Link from 'next/link';

export default function CricketModePage() {
  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET" />

      <main className="pt-24 px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full">
          {/* Mode Selection Grid */}
          <div className="grid grid-cols-2 gap-6">
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

            {/* Triple Threat - Disabled */}
            <div className="bg-[#666666]/40 rounded-lg h-64 flex flex-col items-center justify-center cursor-not-allowed">
              <span className="text-white/40 text-5xl font-bold">TRIPLE THREAT</span>
              <span className="text-white/40 text-2xl font-bold mt-2">COMING SOON</span>
            </div>

            {/* Fatal 4 Way - Disabled */}
            <div className="bg-[#666666]/40 rounded-lg h-64 flex flex-col items-center justify-center cursor-not-allowed">
              <span className="text-white/40 text-5xl font-bold">FATAL 4 WAY</span>
              <span className="text-white/40 text-2xl font-bold mt-2">COMING SOON</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
