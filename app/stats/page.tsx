'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import ProfileEditModal from '../components/ProfileEditModal';
import StatsFilters from '../components/stats/StatsFilters';
import GolfStatsDisplay from '../components/stats/GolfStatsDisplay';
import CricketStatsDisplay from '../components/stats/CricketStatsDisplay';
import { useAppContext } from '../contexts/AppContext';
import { useVenueMode } from '../hooks/useVenue';
import { STOCK_AVATARS } from '../lib/avatars';
import { loadCricketMatches, calculateCricketStats } from '../lib/cricketStats';
import { loadCricketMatchesFromSupabase } from '../lib/supabaseSync';
import { createClient } from '../lib/supabase/client';
import { CricketPlayerStats } from '../types/stats';
import { playerStorage } from '../lib/playerStorage';

const supabase = createClient();

type GameType = 'golf' | 'cricket';

export default function ProfilePage() {
  const { userProfile, updateUserProfile } = useAppContext();
  const { venueMode } = useVenueMode();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // In player mode (not venue mode), only show the current user's stats
  // In venue mode, allow selecting different players (for future dropdown)
  const hidePlayerFilter = !venueMode;

  // Find the current user's player ID
  const [userPlayerId, setUserPlayerId] = useState<string>('all');

  // Filter states
  const [selectedGame, setSelectedGame] = useState<GameType>('golf');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [playModeFilter, setPlayModeFilter] = useState('all');

  // Cricket stats state
  const [cricketStats, setCricketStats] = useState<CricketPlayerStats[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Find and set the user's player ID
  useEffect(() => {
    if (userProfile?.displayName) {
      const allPlayers = playerStorage.getAllPlayers();
      let currentPlayer = allPlayers.find(
        p => p.name.toLowerCase() === userProfile.displayName.toLowerCase()
      );

      // If no local player exists, create one for the logged-in user
      if (!currentPlayer && userProfile.id !== 'default-user') {
        console.log('Creating local player for logged-in user:', userProfile.displayName);
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

        // Dispatch event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('playersChanged'));
        }
      }

      if (currentPlayer) {
        setUserPlayerId(currentPlayer.id);
        // In player mode (not venue mode), automatically set the filter to their player ID
        if (hidePlayerFilter) {
          setPlayerFilter(currentPlayer.id);
        }
      }
    }
  }, [userProfile, hidePlayerFilter]);

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
    const loadCricketStatsData = async () => {
      if (selectedGame === 'cricket') {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();

        let matches: any[] = [];

        if (user) {
          // For logged-in users, query Supabase directly by user_id
          console.log('Loading cricket matches from Supabase for user:', user.id);
          const { data: supabaseMatches, error } = await supabase
            .from('cricket_matches')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error loading cricket matches:', error);
          } else {
            // Extract match_data from each row
            matches = (supabaseMatches || []).map(m => m.match_data);
            console.log('Loaded cricket matches from Supabase:', matches.length);
          }
        } else {
          // Fallback to localStorage for non-logged-in users
          console.log('Loading cricket matches from localStorage');
          matches = loadCricketMatches();
        }

        const stats = await calculateCricketStats(matches, {
          playerId: playerFilter !== 'all' ? playerFilter : undefined,
          userId: (user && playerFilter !== 'all') ? user.id : undefined,
        });
        setCricketStats(stats);
      }
    };

    loadCricketStatsData();
  }, [selectedGame, playerFilter, refreshTrigger]);

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
