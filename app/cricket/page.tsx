'use client';

import Header from '../components/Header';
import Link from 'next/link';

export default function CricketModePage() {
  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET" />

      <main className="pt-24 px-4 sm:px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full">
          {/* Mode Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Singles */}
            <Link
              href="/cricket/singles/players"
              className="bg-[#666666] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center hover:bg-[#777777] transition-colors px-4"
            >
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">SINGLES</span>
            </Link>

            {/* Tag Team */}
            <Link
              href="/cricket/tag-team/players"
              className="bg-[#666666] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center hover:bg-[#777777] transition-colors px-4"
            >
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">TAG TEAM</span>
            </Link>

            {/* Triple Threat */}
            <Link
              href="/cricket/triple-threat/players"
              className="bg-[#666666] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center hover:bg-[#777777] transition-colors px-4"
            >
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">TRIPLE THREAT</span>
            </Link>

            {/* Fatal 4 Way */}
            <Link
              href="/cricket/fatal-4-way/players"
              className="bg-[#666666] rounded-lg min-h-[140px] sm:h-64 flex items-center justify-center hover:bg-[#777777] transition-colors px-4"
            >
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center">FATAL 4 WAY</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
