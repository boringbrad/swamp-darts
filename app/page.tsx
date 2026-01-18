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
        <main className="px-6 pb-28 flex flex-col lg:flex-row gap-6" style={{ minHeight: 'calc(100vh - 176px)' }}>
          {/* Left side - Game modes in 2x2 grid */}
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
            <GameModeCard title="CRICKET" href="/cricket" color="cricket" />
            <GameModeCard title="GOLF" href="/golf" color="golf" />
            <GameModeCard title="ROYAL RUMBLE" href="/extra/royal-rumble/setup" color="extra" />
            <GameModeCard title="PLAY ONLINE" href="/tbd" color="tbd" disabled={true} subtitle="Coming Soon" />
          </div>

          {/* Right side - Stats and options */}
          <div className="w-full lg:w-[500px] flex flex-col gap-4">
            <GameModeCard title="STATS" href="/stats" color="gray" size="large" />
            <GameModeCard title="MANAGE LEAGUE" href="/league/manage" color="gray" size="large" />
            <GameModeCard title="FRIENDS" href="/friends" color="gray" size="large" disabled={true} subtitle="Coming Soon" />
          </div>
        </main>

        {/* Bottom mode selector */}
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#1a1a1a] flex items-center justify-center gap-8 px-6">
          {/* Practice Mode */}
          <label
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPlayMode('practice')}
          >
            <input
              type="checkbox"
              checked={playMode === 'practice'}
              onChange={() => setPlayMode('practice')}
              className="w-6 h-6 cursor-pointer"
            />
            <span className="text-white text-xl font-bold">PRACTICE</span>
          </label>

          {/* Casual Mode */}
          <label
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPlayMode('casual')}
          >
            <input
              type="checkbox"
              checked={playMode === 'casual'}
              onChange={() => setPlayMode('casual')}
              className="w-6 h-6 cursor-pointer"
            />
            <span className="text-white text-xl font-bold">CASUAL</span>
          </label>

          {/* League Mode */}
          <label
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPlayMode('league')}
          >
            <input
              type="checkbox"
              checked={playMode === 'league'}
              onChange={() => setPlayMode('league')}
              className="w-6 h-6 cursor-pointer"
            />
            <span className="text-white text-xl font-bold">LEAGUE</span>
          </label>
        </div>
      </PageWrapper>
    </div>
  );
}
