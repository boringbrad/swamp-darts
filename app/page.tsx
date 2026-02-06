'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import PageWrapper from './components/PageWrapper';
import GameModeCard from './components/GameModeCard';
import { useAppContext } from './contexts/AppContext';
import { checkIsAdmin } from './lib/adminAnalytics';
import { useFriendRequests } from './hooks/useFriendRequests';
import { useUserPresence } from './hooks/useUserPresence';
import { useVenueMode } from './hooks/useVenue';

export default function Home() {
  const { playMode, setPlayMode, userProfile } = useAppContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const { requestCount } = useFriendRequests();

  // Check if user has a venue account (not just venue mode enabled)
  const isVenueAccount = userProfile?.accountType === 'venue';

  // Update user presence to track online status
  useUserPresence();

  // Check if user is admin whenever page loads or user changes
  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkIsAdmin();
      console.log('Home: Admin status:', adminStatus);
      setIsAdmin(adminStatus);
    };
    checkAdmin();
  }, [userProfile]);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header showBackButton={false} />

      <PageWrapper>
        {/* Header spacer for mobile */}
        <div className="h-20 lg:hidden"></div>

        {/* Main content - Always fits viewport */}
        <main className="px-4 sm:px-6 flex flex-col landscape:flex-row lg:flex-row gap-2 landscape:gap-2 sm:gap-4 h-[calc(100vh-240px)] landscape:h-[calc(100vh-144px)] sm:h-[calc(100vh-256px)]">
          {/* Left side - Game modes in grid - Takes 2/3 of width */}
          {/* Portrait: 1 column (7 rows), Landscape/Desktop: 2x2 grid */}
          <div className="w-full landscape:w-2/3 lg:w-2/3 grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 auto-rows-fr gap-2 landscape:gap-3 sm:gap-4 h-full">
            <GameModeCard title="CRICKET" href="/cricket" color="cricket" />
            <GameModeCard title="GOLF" href="/golf" color="golf" />
            <GameModeCard title="EXTRA GAMES" href="/extra" color="extra" />
            <GameModeCard title="PLAY ONLINE" href="/tbd" color="tbd" disabled={true} />
            {/* Portrait only - show profile buttons AND venue hub if applicable */}
            <div className="landscape:hidden lg:hidden contents">
              <GameModeCard title="PROFILE" href="/stats" color="gray" />
              <GameModeCard title="FRIENDS" href="/friends" color="gray" badgeCount={requestCount} />
              {isVenueAccount && (
                <GameModeCard title="VENUE HUB" href="/venue" color="purple" />
              )}
              {isAdmin && (
                <GameModeCard title="ADMIN" href="/admin" color="purple" />
              )}
            </div>
          </div>

          {/* Right side - Profile and options (landscape/desktop only) - Takes 1/3 of width */}
          <div className="hidden landscape:flex landscape:w-1/3 lg:flex lg:w-1/3 flex-col gap-2 landscape:gap-3 sm:gap-4 h-full">
            <GameModeCard title="PROFILE" href="/stats" color="gray" />
            <GameModeCard title="FRIENDS" href="/friends" color="gray" badgeCount={requestCount} />
            {isVenueAccount && (
              <GameModeCard title="VENUE HUB" href="/venue" color="purple" />
            )}
            {isAdmin && (
              <GameModeCard title="ADMIN" href="/admin" color="purple" />
            )}
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
