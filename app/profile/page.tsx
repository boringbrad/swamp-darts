'use client';

import { useState } from 'react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import ProfileEditModal from '../components/ProfileEditModal';
import StatsFilterDropdown, { FilterOption } from '../components/StatsFilterDropdown';
import { useAppContext } from '../contexts/AppContext';
import { STOCK_AVATARS } from '../lib/avatars';

type GameType = 'all' | 'cricket' | 'golf' | 'extra';

// Filter options
const GAME_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Games' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'golf', label: 'Golf' },
  { value: 'extra', label: 'Extra' },
];

const SCOPE_OPTIONS: FilterOption[] = [
  { value: 'global', label: 'Global Stats' },
  { value: 'friends', label: 'Friends Only' },
];

const VENUE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Venues' },
  { value: 'the-mullet', label: 'The Mullet' },
  { value: 'home', label: 'Home' },
];

const OPPONENT_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Opponents' },
  { value: 'piper-rose', label: 'Piper Rose' },
  { value: 'stove', label: 'Stove' },
  { value: 'poncho-man', label: 'Poncho Man' },
];

export default function ProfilePage() {
  const { userProfile, updateUserProfile } = useAppContext();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filter states
  const [selectedGame, setSelectedGame] = useState<GameType>('all');
  const [selectedScope, setSelectedScope] = useState('global');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [selectedOpponent, setSelectedOpponent] = useState('all');

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
          <div className="max-w-4xl mx-auto mb-8">
            <div className="grid grid-cols-4 gap-4">
              <StatsFilterDropdown
                label="GAME TYPE"
                options={GAME_TYPE_OPTIONS}
                value={selectedGame}
                onChange={(value) => setSelectedGame(value as GameType)}
              />
              <StatsFilterDropdown
                label="SCOPE"
                options={SCOPE_OPTIONS}
                value={selectedScope}
                onChange={setSelectedScope}
              />
              <StatsFilterDropdown
                label="VENUE"
                options={VENUE_OPTIONS}
                value={selectedVenue}
                onChange={setSelectedVenue}
              />
              <StatsFilterDropdown
                label="OPPONENT"
                options={OPPONENT_OPTIONS}
                value={selectedOpponent}
                onChange={setSelectedOpponent}
              />
            </div>
          </div>

          {/* Stats Display */}
          <div className="max-w-4xl mx-auto bg-[#333333] rounded-lg p-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Games Played */}
              <div className="bg-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-white text-xl font-bold mb-4">GAMES PLAYED</h3>
                <div className="text-white text-5xl font-bold">{userProfile?.stats.gamesPlayed || 0}</div>
              </div>

              {/* Games Won */}
              <div className="bg-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-white text-xl font-bold mb-4">GAMES WON</h3>
                <div className="text-white text-5xl font-bold">{userProfile?.stats.gamesWon || 0}</div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="space-y-4">
              <div className="bg-[#1a1a1a] rounded-lg p-6 flex justify-between items-center">
                <span className="text-white text-lg font-bold">Win Rate</span>
                <span className="text-white text-2xl font-bold">
                  {userProfile?.stats.gamesPlayed
                    ? ((userProfile.stats.gamesWon / userProfile.stats.gamesPlayed) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>

              {(selectedGame === 'cricket' || selectedGame === 'all') && (
                <>
                  <div className="bg-[#1a1a1a] rounded-lg p-6 flex justify-between items-center">
                    <span className="text-white text-lg font-bold">Average MPR</span>
                    <span className="text-white text-2xl font-bold">{userProfile?.stats.cricketStats?.averageMPR?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-6 flex justify-between items-center">
                    <span className="text-white text-lg font-bold">Best Single Game</span>
                    <span className="text-white text-2xl font-bold">0.0 MPR</span>
                  </div>
                </>
              )}

              {(selectedGame === 'golf' || selectedGame === 'all') && (
                <>
                  <div className="bg-[#1a1a1a] rounded-lg p-6 flex justify-between items-center">
                    <span className="text-white text-lg font-bold">Average Score</span>
                    <span className="text-white text-2xl font-bold">{userProfile?.stats.golfStats?.averageScore || 0}</span>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-6 flex justify-between items-center">
                    <span className="text-white text-lg font-bold">Best Round</span>
                    <span className="text-white text-2xl font-bold">0</span>
                  </div>
                </>
              )}
            </div>
          </div>
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
