'use client';

import Header from './components/Header';
import PageWrapper from './components/PageWrapper';
import GameModeCard from './components/GameModeCard';
import { useAppContext } from './contexts/AppContext';

export default function Home() {
  const { setPlayMode } = useAppContext();

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header showBackButton={false} />

      <PageWrapper>
        {/* Main content */}
        <main className="px-6 pb-28 flex gap-6" style={{ minHeight: 'calc(100vh - 176px)' }}>
          {/* Left side - Game modes in 2x2 grid */}
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
            <GameModeCard title="CRICKET" href="/cricket" color="cricket" />
            <GameModeCard title="GOLF" href="/golf" color="golf" />
            <GameModeCard title="EXTRA" href="/extra" color="extra" />
            <GameModeCard title="????" href="/tbd" color="tbd" />
          </div>

          {/* Right side - Profile and options */}
          <div className="w-[500px] flex flex-col gap-4">
            <GameModeCard title="PROFILE" href="/profile" color="gray" size="large" />
            <GameModeCard title="MANAGE LEAGUE" href="/league/manage" color="gray" size="large" />
            <GameModeCard title="FRIENDS" href="/friends" color="gray" size="large" />
          </div>
        </main>

        {/* Bottom mode selector */}
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#1a1a1a] flex items-center justify-center gap-4 px-6">
          <button
            onClick={() => setPlayMode('practice')}
            className="px-8 py-3 bg-[#333333] text-white text-xl font-bold rounded hover:bg-[#4a4a4a] transition-colors"
          >
            PRACTICE
          </button>
          <button
            onClick={() => setPlayMode('casual')}
            className="px-8 py-3 bg-[#333333] text-white text-xl font-bold rounded hover:bg-[#4a4a4a] transition-colors"
          >
            CASUAL
          </button>
          <button
            onClick={() => setPlayMode('league')}
            className="px-8 py-3 bg-[#6b1a8b] text-white text-xl font-bold rounded hover:opacity-90 transition-opacity"
          >
            LEAGUE
          </button>
        </div>
      </PageWrapper>
    </div>
  );
}
