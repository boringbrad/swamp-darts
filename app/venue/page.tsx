'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import VenueQRCode from '../components/VenueQRCode';
import AddGuestPlayerModal from '../components/AddGuestPlayerModal';
import VenueLeaderboards from '../components/VenueLeaderboards';
import VenueStats from '../components/VenueStats';
import { useVenueMode, useVenueInfo, useVenueParticipants, useVenueBoards, useVenueGuests } from '../hooks/useVenue';
import { useVenueContext } from '../contexts/VenueContext';
import { createBoard, createVenueGuest, updateVenueGuest, deleteVenueGuest, regenerateRoomCode, updateVenueName, removeParticipant } from '../lib/venue';
import { getAvatarById, getDefaultAvatar, STOCK_AVATARS } from '../lib/avatars';

export default function VenueDashboardPage() {
  const router = useRouter();
  const { venueMode } = useVenueMode();
  const { venueInfo, refresh: refreshVenueInfo } = useVenueInfo();
  const { activeParticipants, refresh: refreshParticipants } = useVenueParticipants(venueInfo?.id || null);
  const { boards, refresh: refreshBoards } = useVenueBoards(venueInfo?.id || null);
  const { guests, refresh: refreshGuests } = useVenueGuests(venueInfo?.id || null);
  const { refreshParticipants: refreshVenueContext } = useVenueContext();

  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'boards' | 'guests' | 'leaderboards' | 'stats'>('overview');
  const [showQRCode, setShowQRCode] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<{id: string; name: string; avatar: string; photoUrl?: string} | null>(null);
  const [isEditingVenueName, setIsEditingVenueName] = useState(false);
  const [editVenueName, setEditVenueName] = useState('');

  // Redirect if not in venue mode or not a venue
  if (!venueMode) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Venue Mode Disabled</h1>
          <p className="text-gray-400 mb-6">Enable venue mode in settings to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!venueInfo) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">No Venue Account</h1>
          <p className="text-gray-400 mb-6">You need a venue account to access this page. Request venue status in settings.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !venueInfo?.id) return;

    setIsCreatingBoard(true);
    try {
      await createBoard(venueInfo.id, newBoardName.trim());
      setNewBoardName('');
      await refreshBoards();
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board');
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const handleAddOrEditGuest = async (name: string, avatar: string, photoUrl?: string) => {
    if (!venueInfo?.id) return;

    try {
      if (editingGuest) {
        // Editing existing guest
        const result = await updateVenueGuest(editingGuest.id, name.trim(), avatar, photoUrl);
        if (result.success) {
          await refreshGuests();
          await refreshParticipants(); // Refresh venue dashboard participants
          refreshVenueContext(); // Refresh player pool participants
          setEditingGuest(null);
          setShowGuestModal(false);
        } else {
          alert(result.error || 'Failed to update guest');
        }
      } else {
        // Creating new guest
        const result = await createVenueGuest(venueInfo.id, name.trim(), avatar, photoUrl);
        if (result.success) {
          await refreshGuests();
          await refreshParticipants(); // Refresh venue dashboard participants
          refreshVenueContext(); // Refresh player pool participants
          setShowGuestModal(false);
        } else {
          alert(result.error || 'Failed to create guest');
        }
      }
    } catch (error) {
      console.error('Error saving guest:', error);
      alert('Failed to save guest');
    }
  };

  const handleStartEditGuest = (guest: any) => {
    setEditingGuest({
      id: guest.id,
      name: guest.guestName,
      avatar: guest.avatar || 'avatar-1',
      photoUrl: guest.photoUrl,
    });
    setShowGuestModal(true);
  };

  const handleCloseGuestModal = () => {
    setEditingGuest(null);
    setShowGuestModal(false);
  };

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    if (!confirm(`Are you sure you want to delete "${guestName}"? This will remove them from all games and cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteVenueGuest(guestId);
      if (result.success) {
        await refreshGuests();
        await refreshParticipants(); // Refresh venue dashboard participants
        refreshVenueContext(); // Refresh player pool participants
      } else {
        alert(result.error || 'Failed to delete guest');
      }
    } catch (error) {
      console.error('Error deleting guest:', error);
      alert('Failed to delete guest');
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Remove "${participantName}" from the venue?`)) {
      return;
    }

    try {
      const result = await removeParticipant(participantId);
      if (result.success) {
        await refreshParticipants(); // Refresh venue dashboard participants
        refreshVenueContext(); // Refresh player pool participants immediately
      } else {
        alert(result.error || 'Failed to remove participant');
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      alert('Failed to remove participant');
    }
  };

  const handleRegenerateRoomCode = async () => {
    if (!confirm('Are you sure you want to generate a new room code? The old code will no longer work.')) return;

    try {
      await regenerateRoomCode();
      await refreshVenueInfo();
      alert('Room code regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating room code:', error);
      alert('Failed to regenerate room code');
    }
  };

  const handleUpdateVenueName = async () => {
    if (!editVenueName.trim()) return;

    try {
      await updateVenueName(editVenueName.trim());
      await refreshVenueInfo();
      setIsEditingVenueName(false);
      setEditVenueName('');
    } catch (error) {
      console.error('Error updating venue name:', error);
      alert('Failed to update venue name');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header showBackButton={true} />

      <PageWrapper>
        {/* Header spacer for all screen sizes */}
        <div className="h-20"></div>

        {/* Main content */}
        <main className="w-full px-4 sm:px-6 py-8 flex justify-center">
          <div className="w-full max-w-4xl">
            {/* Venue Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {isEditingVenueName ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editVenueName}
                      onChange={(e) => setEditVenueName(e.target.value)}
                      placeholder="Venue name"
                      className="px-4 py-2 bg-[#2a2a2a] border border-gray-700 rounded text-white text-2xl font-bold"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateVenueName}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingVenueName(false);
                        setEditVenueName('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">{venueInfo.venueName}</h1>
                    <button
                      onClick={() => {
                        setEditVenueName(venueInfo.venueName);
                        setIsEditingVenueName(true);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded"
                >
                  {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                </button>
              </div>

              {/* QR Code Modal */}
              {showQRCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setShowQRCode(false)}>
                  <div className="bg-[#2a2a2a] rounded-lg p-8" onClick={(e) => e.stopPropagation()}>
                    <VenueQRCode roomCode={venueInfo.roomCode} venueName={venueInfo.venueName} />
                    <button
                      onClick={() => setShowQRCode(false)}
                      className="mt-6 w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#2a2a2a] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Room Code</p>
                  <p className="text-white font-mono text-xl font-bold">{venueInfo.roomCode}</p>
                  <button
                    onClick={handleRegenerateRoomCode}
                    className="text-xs text-purple-400 hover:text-purple-300 mt-1"
                  >
                    Regenerate
                  </button>
                </div>
                <div className="bg-[#2a2a2a] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Active Participants</p>
                  <p className="text-white text-2xl font-bold">{activeParticipants.filter(p => p.userId).length}</p>
                </div>
                <div className="bg-[#2a2a2a] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Boards</p>
                  <p className="text-white text-2xl font-bold">{boards.length}</p>
                </div>
                <div className="bg-[#2a2a2a] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Venue Guests</p>
                  <p className="text-white text-2xl font-bold">{guests.length}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b-2 border-gray-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-bold transition-colors ${
                  activeTab === 'overview'
                    ? 'text-white border-b-4 border-purple-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                OVERVIEW
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`px-6 py-3 font-bold transition-colors ${
                  activeTab === 'participants'
                    ? 'text-white border-b-4 border-purple-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                PARTICIPANTS ({activeParticipants.filter(p => p.userId).length})
              </button>
              <button
                onClick={() => setActiveTab('boards')}
                className={`px-6 py-3 font-bold transition-colors ${
                  activeTab === 'boards'
                    ? 'text-white border-b-4 border-purple-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                BOARDS ({boards.length})
              </button>
              <button
                onClick={() => setActiveTab('guests')}
                className={`px-6 py-3 font-bold transition-colors ${
                  activeTab === 'guests'
                    ? 'text-white border-b-4 border-purple-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                GUESTS ({guests.length})
              </button>
              <button
                onClick={() => setActiveTab('leaderboards')}
                className={`px-6 py-3 font-bold transition-colors ${
                  activeTab === 'leaderboards'
                    ? 'text-white border-b-4 border-purple-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                LEADERBOARDS
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-3 font-bold transition-colors ${
                  activeTab === 'stats'
                    ? 'text-white border-b-4 border-purple-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                STATS
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-[#2a2a2a] rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Welcome to your Venue Dashboard</h2>
                    <p className="text-gray-400 mb-4">
                      Manage your venue, boards, and participants from this dashboard. Players can join your venue by scanning the QR code or entering your room code.
                    </p>
                    <ul className="space-y-2 text-gray-400">
                      <li>• <strong className="text-white">Participants:</strong> View all players who have joined your venue</li>
                      <li>• <strong className="text-white">Boards:</strong> Manage your dart boards and start games on specific boards</li>
                      <li>• <strong className="text-white">Guests:</strong> Create venue-specific guest players</li>
                      <li>• <strong className="text-white">Universal Player Pool:</strong> All participants can play on any board</li>
                    </ul>
                  </div>

                  <div className="bg-[#2a2a2a] rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
                    <p className="text-gray-400 text-sm">Activity tracking coming soon...</p>
                  </div>
                </div>
              )}

              {/* Participants Tab */}
              {activeTab === 'participants' && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Active Participants</h2>
                    <button
                      onClick={refreshParticipants}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded text-sm"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {activeParticipants.filter(p => p.userId).length === 0 ? (
                      <div className="bg-[#2a2a2a] rounded-lg p-8 text-center">
                        <p className="text-gray-400">No participants yet. Share your room code to get started!</p>
                      </div>
                    ) : (
                      activeParticipants
                        .filter(participant => participant.userId) // Only show authenticated users, not guests
                        .map((participant) => {
                          const photoUrl = participant.photoUrl;
                          const avatarId = participant.avatar;
                          const avatar = avatarId ? getAvatarById(avatarId) || getDefaultAvatar() : getDefaultAvatar();

                          return (
                            <div key={participant.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4">
                              {/* Avatar */}
                              {photoUrl ? (
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                                  <img
                                    src={photoUrl}
                                    alt={participant.displayName || participant.username || 'Player'}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                                  style={{ backgroundColor: avatar.color }}
                                >
                                  {avatar.emoji}
                                </div>
                              )}
                              {/* Info */}
                              <div className="flex-1">
                                <p className="text-white font-bold">
                                  {participant.displayName || participant.username || 'Unknown'}
                                </p>
                                <p className="text-gray-400 text-sm">Authenticated User</p>
                              </div>
                              {/* Actions */}
                              <button
                                onClick={() => handleRemoveParticipant(participant.id, participant.displayName || participant.username || 'Unknown')}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Boards Tab */}
              {activeTab === 'boards' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Dart Boards</h2>
                    <div className="bg-[#2a2a2a] rounded-lg p-4 flex gap-3">
                      <input
                        type="text"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        placeholder="Board name (e.g., Board 1, Main Board)"
                        className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded text-white"
                        disabled={isCreatingBoard}
                      />
                      <button
                        onClick={handleCreateBoard}
                        disabled={isCreatingBoard || !newBoardName.trim()}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded"
                      >
                        {isCreatingBoard ? 'Creating...' : 'Add Board'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {boards.length === 0 ? (
                      <div className="bg-[#2a2a2a] rounded-lg p-8 text-center">
                        <p className="text-gray-400">No boards yet. Create your first board above!</p>
                      </div>
                    ) : (
                      boards.map((board, index) => (
                        <div key={board.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-bold text-lg">{board.boardName}</p>
                            <p className="text-gray-400 text-sm">Board #{index + 1}</p>
                          </div>
                          <button
                            onClick={() => {
                              // TODO: Navigate to game selection for this board
                              alert('Board game selection coming soon!');
                            }}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
                          >
                            Start Game
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Guests Tab */}
              {activeTab === 'guests' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Venue Guests</h2>
                    <p className="text-gray-400 text-sm mb-4">
                      Create guest players that are specific to this venue. These guests can be used across all boards and can have custom photos for your guestbook.
                    </p>
                    <button
                      onClick={() => setShowGuestModal(true)}
                      className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold rounded transition-colors"
                    >
                      + ADD GUEST
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {guests.length === 0 ? (
                      <div className="bg-[#2a2a2a] rounded-lg p-8 text-center">
                        <p className="text-gray-400">No venue guests yet. Click "ADD GUEST" above to create your first guest!</p>
                      </div>
                    ) : (
                      guests.map((guest) => {
                        const photoUrl = guest.photoUrl;
                        const guestAvatar = getAvatarById(guest.avatar || 'avatar-1') || getDefaultAvatar();

                        return (
                          <div key={guest.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4">
                            {/* Avatar/Photo */}
                            {photoUrl ? (
                              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
                                <img
                                  src={photoUrl}
                                  alt={guest.guestName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                                style={{ backgroundColor: guestAvatar.color }}
                              >
                                {guestAvatar.emoji}
                              </div>
                            )}
                            {/* Info */}
                            <div className="flex-1">
                              <p className="text-white font-bold text-lg">{guest.guestName}</p>
                              <p className="text-gray-400 text-sm">Venue Guest • {guest.totalGames || 0} games</p>
                            </div>
                            {/* Actions */}
                            <button
                              onClick={() => handleStartEditGuest(guest)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteGuest(guest.id, guest.guestName)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Leaderboards Tab */}
              {activeTab === 'leaderboards' && venueInfo?.id && (
                <VenueLeaderboards venueId={venueInfo.id} />
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && venueInfo?.id && (
                <VenueStats venueId={venueInfo.id} />
              )}
            </div>
          </div>
        </main>
      </PageWrapper>

      {/* Add/Edit Guest Modal */}
      <AddGuestPlayerModal
        isOpen={showGuestModal}
        onClose={handleCloseGuestModal}
        onAdd={handleAddOrEditGuest}
        initialName={editingGuest?.name}
        initialAvatar={editingGuest?.avatar}
        initialPhotoUrl={editingGuest?.photoUrl}
        title={editingGuest ? 'EDIT VENUE GUEST' : 'ADD VENUE GUEST'}
      />
    </div>
  );
}
