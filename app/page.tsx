'use client';

import Header from './components/Header';
import PageWrapper from './components/PageWrapper';
import GameModeCard from './components/GameModeCard';
import { useAppContext } from './contexts/AppContext';

export default function Home() {
  const { playMode, setPlayMode } = useAppContext();

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header showBackButton={false} />

      <PageWrapper>
        {/* Main content */}
        <main className="px-4 sm:px-6 pb-24 sm:pb-28 flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6">
          {/* Left side - Game modes in grid */}
          <div className="w-full lg:flex-1 grid grid-cols-2 gap-3 sm:gap-4">
            <GameModeCard title="CRICKET" href="/cricket" color="cricket" />
            <GameModeCard title="GOLF" href="/golf" color="golf" />
            <GameModeCard title="ROYAL RUMBLE" href="/extra/royal-rumble/setup" color="extra" />
            <GameModeCard title="PLAY ONLINE" href="/tbd" color="tbd" disabled={true} subtitle="Coming Soon" />
          </div>

          {/* Right side - Stats and options */}
          <div className="w-full lg:w-[500px] flex flex-col gap-3 sm:gap-4">
            <GameModeCard title="STATS" href="/stats" color="gray" size="large" />
            <GameModeCard title="MANAGE LEAGUE" href="/league/manage" color="gray" size="large" />
            <GameModeCard title="FRIENDS" href="/friends" color="gray" size="large" disabled={true} subtitle="Coming Soon" />
          </div>
        </main>

        {/* Bottom mode selector */}
        <div className="fixed bottom-0 left-0 right-0 h-16 sm:h-20 bg-[#1a1a1a] flex items-center justify-center gap-4 sm:gap-8 px-4 sm:px-6">
          {/* Practice Mode */}
          <label
            className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPlayMode('practice')}
          >
            <input
              type="checkbox"
              checked={playMode === 'practice'}
              onChange={() => setPlayMode('practice')}
              className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer"
            />
            <span className="text-white text-base sm:text-xl font-bold">PRACTICE</span>
          </label>

          {/* Casual Mode */}
          <label
            className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPlayMode('casual')}
          >
            <input
              type="checkbox"
              checked={playMode === 'casual'}
              onChange={() => setPlayMode('casual')}
              className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer"
            />
            <span className="text-white text-base sm:text-xl font-bold">CASUAL</span>
          </label>

          {/* League Mode */}
          <label
            className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPlayMode('league')}
          >
            <input
              type="checkbox"
              checked={playMode === 'league'}
              onChange={() => setPlayMode('league')}
              className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer"
            />
            <span className="text-white text-base sm:text-xl font-bold">LEAGUE</span>
          </label>
        </div>
      </PageWrapper>
    </div>
  );
}
