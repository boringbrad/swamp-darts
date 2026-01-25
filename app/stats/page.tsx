'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import ProfileEditModal from '../components/ProfileEditModal';
import StatsFilters from '../components/stats/StatsFilters';
import GolfStatsDisplay from '../components/stats/GolfStatsDisplay';
import CricketStatsDisplay from '../components/stats/CricketStatsDisplay';
import { useAppContext } from '../contexts/AppContext';
import { STOCK_AVATARS } from '../lib/avatars';
import { loadCricketMatches, calculateCricketStats } from '../lib/cricketStats';
import { CricketPlayerStats } from '../types/stats';

type GameType = 'golf' | 'cricket';

export default function StatsPage() {
  const { userProfile, updateUserProfile } = useAppContext();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filter states
  const [selectedGame, setSelectedGame] = useState<GameType>('golf');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [playModeFilter, setPlayModeFilter] = useState('all');

  // Cricket stats state
  const [cricketStats, setCricketStats] = useState<CricketPlayerStats[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for stats refresh events (when players are deleted)
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('statsRefresh', handleRefresh);
    return () => window.removeEventListener('statsRefresh', handleRefresh);
  }, []);

  // Load and calculate cricket stats when filters change
  useEffect(() => {
    if (selectedGame === 'cricket') {
      const matches = loadCricketMatches();
      const stats = calculateCricketStats(matches, {
        playerId: playerFilter !== 'all' ? playerFilter : undefined,
      });
      setCricketStats(stats);
    }
  }, [selectedGame, playerFilter, refreshTrigger]);

  // Get avatar data
  const currentAvatar = STOCK_AVATARS.find(a => a.id === userProfile?.avatar) || STOCK_AVATARS[0];

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />

      <PageWrapper>
        <main className="px-6 pb-6">
          {/* Profile Header with Avatar and Edit Button */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Avatar */}
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-6xl"
              style={{ backgroundColor: currentAvatar.color }}
            >
              {currentAvatar.emoji}
            </div>

            {/* Name and Edit Button */}
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-bold text-white">
                {userProfile?.displayName || 'THE MAYOR'}
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
