'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import ProfileEditModal from '../components/ProfileEditModal';
import StatsFilters from '../components/stats/StatsFilters';
import GolfStatsDisplay from '../components/stats/GolfStatsDisplay';
import CricketStatsDisplay from '../components/stats/CricketStatsDisplay';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { STOCK_AVATARS } from '../lib/avatars';
import { loadCricketMatches, calculateCricketStats } from '../lib/cricketStats';
import { CricketPlayerStats } from '../types/stats';
import { playerStorage } from '../lib/playerStorage';
import { useCricketMatchesQuery } from '../lib/queries/useMatchesQuery';
import { getQueryClient } from '../lib/queries/queryClient';

type GameType = 'golf' | 'cricket';

export default function ProfilePage() {
  const { userProfile, updateUserProfile } = useAppContext();
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Always show only the current user's stats (no venue mode)
  const hidePlayerFilter = true;

  // Find the current user's player ID
  const [userPlayerId, setUserPlayerId] = useState<string>('all');

  // Filter states
  const [selectedGame, setSelectedGame] = useState<GameType>('golf');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [playModeFilter, setPlayModeFilter] = useState('all');

  // Cricket stats state
  const [cricketStats, setCricketStats] = useState<CricketPlayerStats[]>([]);

  // Cricket matches from TanStack Query cache; fallback to localStorage for logged-out users
  const { data: queriedCricketMatches } = useCricketMatchesQuery();
  const localCricketMatches = useMemo(() => !user ? loadCricketMatches() : [], [user]);
  const allCricketMatches = queriedCricketMatches ?? localCricketMatches;

  // Find and set the user's player ID
  useEffect(() => {
    if (userProfile?.displayName) {
      const allPlayers = playerStorage.getAllPlayers();
      let currentPlayer = allPlayers.find(
        p => p.name.toLowerCase() === userProfile.displayName.toLowerCase()
      );

      // If no local player exists, create one for the logged-in user
      if (!currentPlayer && userProfile.id !== 'default-user') {
        currentPlayer = {
          id: `user-${userProfile.id}`,
          name: userProfile.displayName,
          avatar: userProfile.avatar,
          photoUrl: (userProfile as any).photoUrl,
          isGuest: false,
          addedDate: new Date(),
        };
        playerStorage.getAllPlayers().push(currentPlayer);
        localStorage.setItem('localPlayers', JSON.stringify(playerStorage.getAllPlayers()));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('playersChanged'));
        }
      }

      if (currentPlayer) {
        setUserPlayerId(currentPlayer.id);
        if (hidePlayerFilter) {
          setPlayerFilter(currentPlayer.id);
        }
      }
    }
  }, [userProfile, hidePlayerFilter]);

  // Invalidate cricket matches query on statsRefresh events (same-tab game saves)
  useEffect(() => {
    const handleRefresh = () => {
      getQueryClient().invalidateQueries({ queryKey: ['cricket-matches'] });
    };
    window.addEventListener('statsRefresh', handleRefresh);
    return () => window.removeEventListener('statsRefresh', handleRefresh);
  }, []);

  // Calculate cricket stats whenever matches or filters change
  useEffect(() => {
    if (selectedGame !== 'cricket') return;

    calculateCricketStats(allCricketMatches, {
      playerId: playerFilter !== 'all' ? playerFilter : undefined,
      userId: (user && playerFilter !== 'all') ? user.id : undefined,
    })
      .then(stats => setCricketStats(stats))
      .catch(err => console.error('stats/page: failed to calculate cricket stats', err));
  }, [selectedGame, playerFilter, allCricketMatches, user]);

  // Get avatar data
  const currentAvatar = STOCK_AVATARS.find(a => a.id === userProfile?.avatar) || STOCK_AVATARS[0];

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />

      <PageWrapper>
        <div className="h-32"></div>
        <main className="px-6 pb-6">
          {/* Profile Header with Avatar and Edit Button */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Avatar */}
            {(userProfile as any)?.photoUrl ? (
              <div className="w-16 h-16 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/20">
                <img
                  src={(userProfile as any).photoUrl}
                  alt={userProfile?.displayName || 'Profile'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-3xl sm:text-6xl"
                style={{ backgroundColor: currentAvatar.color }}
              >
                {currentAvatar.emoji}
              </div>
            )}

            {/* Name and Edit Button */}
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-bold text-white">
                {userProfile?.displayName || 'Unknown User'}
              </h1>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-2 bg-[#6b1a8b] text-white font-bold rounded hover:opacity-90 transition-opacity"
              >
                EDIT PROFILE
              </button>
            </div>
          </div>

          {/* Stats Filters */}
          <StatsFilters
            gameType={selectedGame}
            onGameTypeChange={setSelectedGame}
            playerFilter={playerFilter}
            onPlayerFilterChange={setPlayerFilter}
            courseFilter={courseFilter}
            onCourseFilterChange={setCourseFilter}
            playModeFilter={playModeFilter}
            onPlayModeFilterChange={setPlayModeFilter}
            hidePlayerFilter={hidePlayerFilter}
          />

          {/* Stats Display based on game type */}
          {selectedGame === 'golf' && (
            <GolfStatsDisplay
              playerFilter={playerFilter}
              courseFilter={courseFilter}
              playModeFilter={playModeFilter}
            />
          )}

          {selectedGame === 'cricket' && (
            <CricketStatsDisplay
              stats={cricketStats}
              selectedPlayerId={playerFilter !== 'all' ? playerFilter : undefined}
            />
          )}
        </main>

        {/* Profile Edit Modal */}
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentProfile={userProfile}
          onSave={updateUserProfile}
        />
      </PageWrapper>
    </div>
  );
}
