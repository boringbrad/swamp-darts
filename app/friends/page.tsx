'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import { useAppContext } from '../contexts/AppContext';
import {
  getFriends,
  getFriendRequests,
  getSentFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  Friend,
  FriendRequest
} from '../lib/friends';
import { STOCK_AVATARS } from '../lib/avatars';
import { useUserPresence } from '../hooks/useUserPresence';
import { joinVenue, leaveVenue, getVenueByRoomCode, getCurrentVenueParticipation } from '../lib/venue';
import { getFriendsLastActivity, formatRelativeTime, FriendActivity } from '../lib/friendActivity';

// Lazy load QR code components to improve initial page load
const UserQRCode = lazy(() => import('../components/friends/UserQRCode'));
const QRScanner = lazy(() => import('../components/friends/QRScanner'));
const FriendLeaderboards = lazy(() => import('../components/FriendLeaderboards'));
const FriendStats = lazy(() => import('../components/FriendStats'));

type Tab = 'friends' | 'requests' | 'add' | 'qr' | 'venues' | 'leaderboards' | 'stats';

export default function FriendsPage() {
  const { userProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [qrMode, setQrMode] = useState<'show' | 'scan'>('show');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [venueRoomCode, setVenueRoomCode] = useState('');
  const [currentVenue, setCurrentVenue] = useState<{ id: string; venueName: string; roomCode: string } | null>(null);
  const [joiningVenue, setJoiningVenue] = useState(false);
  const [leavingVenue, setLeavingVenue] = useState(false);
  const [friendActivity, setFriendActivity] = useState<Map<string, FriendActivity>>(new Map());

  // Update user presence for online status tracking
  useUserPresence();

  useEffect(() => {
    loadData();

    // Refresh friends list every 60 seconds to update online status
    const interval = setInterval(() => {
      if (activeTab === 'friends') {
        loadData();
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  // Load current venue participation when VENUES tab is active
  useEffect(() => {
    const loadCurrentVenue = async () => {
      if (activeTab === 'venues') {
        const participation = await getCurrentVenueParticipation();
        setCurrentVenue(participation);
      }
    };
    loadCurrentVenue();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    const [friendsData, requestsData, sentData] = await Promise.all([
      getFriends(),
      getFriendRequests(),
      getSentFriendRequests()
    ]);
    setFriends(friendsData);
    setFriendRequests(requestsData);
    setSentRequests(sentData);

    // Load friend activity for the friends tab
    if (activeTab === 'friends' && friendsData.length > 0) {
      const friendUserIds = friendsData.map(f => f.userId);
      const activity = await getFriendsLastActivity(friendUserIds);
      setFriendActivity(activity);
    }

    setLoading(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const results = await searchUsers(query);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSendRequest = async (userId: string) => {
    const result = await sendFriendRequest(userId);
    if (result.success) {
      // Refresh data
      await loadData();
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } else {
      alert(result.error || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const result = await acceptFriendRequest(friendshipId);
    if (result.success) {
      await loadData();
      setActiveTab('friends'); // Switch to friends tab to see the new friend
    } else {
      alert(result.error || 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    const result = await declineFriendRequest(friendshipId);
    if (result.success) {
      await loadData();
    } else {
      alert(result.error || 'Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    if (confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
      const result = await removeFriend(friendshipId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error || 'Failed to remove friend');
      }
    }
  };

  const handleQRScan = async (qrData: string) => {
    try {
      const data = JSON.parse(qrData);

      // Validate QR code format
      if (data.type !== 'swamp_darts_friend' || !data.userId) {
        setScanResult({
          success: false,
          message: 'Invalid QR code. Please scan a Swamp Darts friend QR code.'
        });
        return;
      }

      // Check if trying to add yourself
      if (data.userId === userProfile?.id) {
        setScanResult({
          success: false,
          message: "You can't add yourself as a friend!"
        });
        return;
      }

      // Check if already friends
      const alreadyFriend = friends.some(f => f.userId === data.userId);
      if (alreadyFriend) {
        setScanResult({
          success: false,
          message: `You're already friends with ${data.displayName || data.username}!`
        });
        return;
      }

      // Send friend request
      const result = await sendFriendRequest(data.userId);

      if (result.success) {
        setScanResult({
          success: true,
          message: `Friend request sent to ${data.displayName || data.username}!`
        });
        await loadData();

        // Clear message after 3 seconds
        setTimeout(() => setScanResult(null), 3000);
      } else {
        setScanResult({
          success: false,
          message: result.error || 'Failed to send friend request'
        });
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
      setScanResult({
        success: false,
        message: 'Invalid QR code format'
      });
    }
  };

  const getAvatarColor = (avatarId?: string) => {
    const avatar = STOCK_AVATARS.find(a => a.id === avatarId);
    return avatar?.color || '#6b1a8b';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <Header />
        <PageWrapper>
          <div className="h-32"></div>
          <div className="text-white text-center text-xl">Loading...</div>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />

      <PageWrapper>
        <div className="h-32"></div>
        <main className="px-6 pb-6">
          <h1 className="text-white text-4xl font-bold text-center mb-8">FRIENDS</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 px-4 font-bold rounded transition-colors whitespace-nowrap ${
                activeTab === 'friends'
                  ? 'bg-[#90EE90] text-black'
                  : 'bg-[#333333] text-white hover:bg-[#444444]'
              }`}
            >
              FRIENDS ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 px-4 font-bold rounded transition-colors whitespace-nowrap relative ${
                activeTab === 'requests'
                  ? 'bg-[#90EE90] text-black'
                  : 'bg-[#333333] text-white hover:bg-[#444444]'
              }`}
            >
              REQUESTS ({friendRequests.length})
              {friendRequests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-3 px-4 font-bold rounded transition-colors whitespace-nowrap ${
                activeTab === 'add'
                  ? 'bg-[#90EE90] text-black'
                  : 'bg-[#333333] text-white hover:bg-[#444444]'
              }`}
            >
              ADD
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-3 px-4 font-bold rounded transition-colors whitespace-nowrap ${
                activeTab === 'qr'
                  ? 'bg-[#90EE90] text-black'
                  : 'bg-[#333333] text-white hover:bg-[#444444]'
              }`}
            >
              QR
            </button>
            <button
              onClick={() => setActiveTab('venues')}
              className={`flex-1 py-3 px-4 font-bold rounded transition-colors whitespace-nowrap ${
                activeTab === 'venues'
                  ? 'bg-[#90EE90] text-black'
                  : 'bg-[#333333] text-white hover:bg-[#444444]'
              }`}
            >
              VENUES
            </button>
            <button
              onClick={() => setActiveTab('leaderboards')}
              className={`flex-1 py-3 px-4 font-bold rounded transition-colors whitespace-nowrap ${
                activeTab === 'leaderboards'
                  ? 'bg-[#90EE90] text-black'
                  : 'bg-[#333333] text-white hover:bg-[#444444]'
              }`}
            >
              LEADERBOARDS
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 px-4 font-bold rounded transition-colors whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'bg-[#90EE90] text-black'
                  : 'bg-[#333333] text-white hover:bg-[#444444]'
              }`}
            >
              STATS
            </button>
          </div>

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="bg-[#333333] rounded-lg p-12 text-center">
                  <div className="text-white text-xl font-bold mb-2">No Friends Yet</div>
                  <div className="text-gray-400">
                    Add friends to see them here!
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div key={friend.id} className="bg-[#333333] rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {friend.photoUrl ? (
                            <img
                              src={friend.photoUrl}
                              alt={friend.displayName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                              style={{ backgroundColor: getAvatarColor(friend.avatar) }}
                            >
                              {STOCK_AVATARS.find(a => a.id === friend.avatar)?.emoji || '👤'}
                            </div>
                          )}
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#90EE90] rounded-full border-2 border-[#333333]"></div>
                          )}
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">{friend.displayName}</div>
                          <div className="text-gray-400 text-sm">@{friend.username}</div>
                          {friend.isOnline && (
                            <div className="text-[#90EE90] text-xs font-semibold">Online</div>
                          )}
                          {(() => {
                            const activity = friendActivity.get(friend.userId);
                            if (activity && activity.lastPlayedAt) {
                              return (
                                <div className="text-gray-500 text-xs mt-1">
                                  <span className="text-gray-400">{formatRelativeTime(activity.lastPlayedAt)}</span>
                                  {' • '}
                                  <span className={activity.game === 'golf' ? 'text-green-400' : 'text-orange-400'}>
                                    {activity.game?.toUpperCase()}
                                  </span>
                                  {activity.venueName && (
                                    <>
                                      {' • '}
                                      <span className="text-purple-400">{activity.venueName}</span>
                                    </>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.friendshipId, friend.displayName)}
                        className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
                      >
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Friend Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              <div className="mb-6">
                <h2 className="text-white text-xl font-bold mb-4">Received Requests</h2>
                {friendRequests.length === 0 ? (
                  <div className="bg-[#333333] rounded-lg p-8 text-center text-gray-400">
                    No pending friend requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="bg-[#333333] rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {request.fromPhotoUrl ? (
                            <img
                              src={request.fromPhotoUrl}
                              alt={request.fromDisplayName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                              style={{ backgroundColor: getAvatarColor(request.fromAvatar) }}
                            >
                              {STOCK_AVATARS.find(a => a.id === request.fromAvatar)?.emoji || '👤'}
                            </div>
                          )}
                          <div>
                            <div className="text-white font-bold text-lg">{request.fromDisplayName}</div>
                            <div className="text-gray-400 text-sm">@{request.fromUsername}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="px-4 py-2 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
                          >
                            ACCEPT
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request.id)}
                            className="px-4 py-2 bg-[#555555] text-white font-bold rounded hover:bg-[#666666] transition-colors"
                          >
                            DECLINE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-white text-xl font-bold mb-4">Sent Requests</h2>
                {sentRequests.length === 0 ? (
                  <div className="bg-[#333333] rounded-lg p-8 text-center text-gray-400">
                    No sent requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <div key={request.id} className="bg-[#333333] rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {request.photoUrl ? (
                            <img
                              src={request.photoUrl}
                              alt={request.displayName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                              style={{ backgroundColor: getAvatarColor(request.avatar) }}
                            >
                              {STOCK_AVATARS.find(a => a.id === request.avatar)?.emoji || '👤'}
                            </div>
                          )}
                          <div>
                            <div className="text-white font-bold text-lg">{request.displayName}</div>
                            <div className="text-gray-400 text-sm">@{request.username}</div>
                          </div>
                        </div>
                        <div className="text-yellow-500 font-bold">PENDING</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Friends Tab */}
          {activeTab === 'add' && (
            <div>
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by username, display name, or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full p-4 bg-[#333333] text-white rounded-lg border-2 border-transparent focus:border-[#90EE90] outline-none"
                />
              </div>

              {searching ? (
                <div className="text-white text-center">Searching...</div>
              ) : searchQuery.length < 2 ? (
                <div className="bg-[#333333] rounded-lg p-12 text-center text-gray-400">
                  Enter at least 2 characters to search for users
                </div>
              ) : searchResults.length === 0 ? (
                <div className="bg-[#333333] rounded-lg p-12 text-center text-gray-400">
                  No users found
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((user) => {
                    const alreadyFriend = friends.some(f => f.userId === user.id);
                    const requestSent = sentRequests.some(r => r.userId === user.id);
                    const requestReceived = friendRequests.some(r => r.fromUserId === user.id);

                    return (
                      <div key={user.id} className="bg-[#333333] rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {user.photo_url ? (
                            <img
                              src={user.photo_url}
                              alt={user.display_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                              style={{ backgroundColor: getAvatarColor(user.avatar) }}
                            >
                              {STOCK_AVATARS.find(a => a.id === user.avatar)?.emoji || '👤'}
                            </div>
                          )}
                          <div>
                            <div className="text-white font-bold text-lg">{user.display_name}</div>
                            <div className="text-gray-400 text-sm">@{user.username}</div>
                            <div className="text-gray-500 text-xs">{user.email}</div>
                          </div>
                        </div>
                        {alreadyFriend ? (
                          <div className="text-[#90EE90] font-bold">FRIENDS</div>
                        ) : requestSent ? (
                          <div className="text-yellow-500 font-bold">PENDING</div>
                        ) : requestReceived ? (
                          <button
                            onClick={() => {
                              const request = friendRequests.find(r => r.fromUserId === user.id);
                              if (request) handleAcceptRequest(request.id);
                            }}
                            className="px-4 py-2 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
                          >
                            ACCEPT REQUEST
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user.id)}
                            className="px-4 py-2 bg-[#6b1a8b] text-white font-bold rounded hover:opacity-90 transition-opacity"
                          >
                            ADD FRIEND
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div>
              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    setQrMode('show');
                    setScanResult(null);
                  }}
                  className={`flex-1 py-3 px-4 font-bold rounded transition-colors ${
                    qrMode === 'show'
                      ? 'bg-[#6b1a8b] text-white'
                      : 'bg-[#333333] text-white hover:bg-[#444444]'
                  }`}
                >
                  MY QR CODE
                </button>
                <button
                  onClick={() => {
                    setQrMode('scan');
                    setScanResult(null);
                  }}
                  className={`flex-1 py-3 px-4 font-bold rounded transition-colors ${
                    qrMode === 'scan'
                      ? 'bg-[#6b1a8b] text-white'
                      : 'bg-[#333333] text-white hover:bg-[#444444]'
                  }`}
                >
                  SCAN QR CODE
                </button>
              </div>

              {/* Scan Result Message */}
              {scanResult && (
                <div className={`mb-6 p-4 rounded-lg border-2 ${
                  scanResult.success
                    ? 'bg-green-900/30 border-green-500'
                    : 'bg-red-900/30 border-red-500'
                }`}>
                  <div className={`font-bold text-center ${
                    scanResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {scanResult.message}
                  </div>
                </div>
              )}

              {/* Show QR Code Mode */}
              {qrMode === 'show' && (
                <div className="bg-[#333333] rounded-lg p-8">
                  <div className="text-center mb-6">
                    <div className="text-white text-xl font-bold mb-2">Share Your QR Code</div>
                    <div className="text-gray-400 text-sm mb-4">
                      Show this code to friends - they can scan it with their phone's camera app!
                    </div>
                    <div className="bg-[#444444] rounded p-3 text-[#90EE90] text-xs">
                      📱 Works with native camera apps - no need to open the app
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Suspense fallback={<div className="text-white">Loading QR code...</div>}>
                      <UserQRCode size={280} />
                    </Suspense>
                  </div>
                </div>
              )}

              {/* Scan QR Code Mode */}
              {qrMode === 'scan' && (
                <div className="bg-[#333333] rounded-lg p-8">
                  <div className="text-center mb-6">
                    <div className="text-white text-xl font-bold mb-2">Scan Friend's QR Code</div>
                    <div className="text-gray-400 text-sm mb-4">
                      Use your phone's camera app to scan their QR code - it will automatically open and send a friend request!
                    </div>
                    <div className="bg-[#444444] rounded p-3 text-gray-300 text-xs mb-4">
                      💡 <strong>Tip:</strong> Just point your phone's camera at the QR code - no need to use this scanner!
                    </div>
                  </div>
                  <div className="border-t border-gray-600 pt-6">
                    <div className="text-center mb-4 text-gray-400 text-sm">
                      Or use the in-app scanner below:
                    </div>
                    <Suspense fallback={<div className="text-white text-center">Loading scanner...</div>}>
                      <QRScanner
                        onScan={handleQRScan}
                        onError={(error) => {
                          setScanResult({
                            success: false,
                            message: error
                          });
                        }}
                      />
                    </Suspense>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Venues Tab */}
          {activeTab === 'venues' && (
            <div>
              <div className="bg-[#333333] rounded-lg p-6 mb-6">
                <h2 className="text-white text-2xl font-bold mb-4">Join a Venue</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Enter a venue's room code to join their player pool. You can then be selected for games on any of their boards.
                </p>

                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={venueRoomCode}
                    onChange={(e) => setVenueRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    placeholder="Enter 6-character room code"
                    className="flex-1 px-4 py-3 bg-[#2a2a2a] border-2 border-gray-700 rounded text-white text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    maxLength={6}
                    disabled={joiningVenue}
                  />
                  <button
                    onClick={async () => {
                      if (!venueRoomCode || venueRoomCode.length !== 6) {
                        alert('Please enter a valid 6-character room code');
                        return;
                      }

                      setJoiningVenue(true);
                      try {
                        // First lookup the venue
                        const venueData = await getVenueByRoomCode(venueRoomCode);
                        if (!venueData) {
                          alert('Venue not found. Please check the room code.');
                          setJoiningVenue(false);
                          return;
                        }

                        // Join the venue
                        const result = await joinVenue(venueRoomCode);
                        if (result.success) {
                          setCurrentVenue({
                            id: result.venueId!,
                            venueName: venueData.venueName,
                            roomCode: venueRoomCode
                          });
                          setVenueRoomCode('');
                          alert(`Successfully joined ${venueData.venueName}!`);
                        } else {
                          alert(result.error || 'Failed to join venue');
                        }
                      } catch (error) {
                        console.error('Error joining venue:', error);
                        alert('Failed to join venue. Please try again.');
                      } finally {
                        setJoiningVenue(false);
                      }
                    }}
                    disabled={joiningVenue || !venueRoomCode || venueRoomCode.length !== 6}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"
                  >
                    {joiningVenue ? 'Joining...' : 'Join'}
                  </button>
                </div>

                <p className="text-gray-400 text-xs">
                  {venueRoomCode.length}/6 characters
                </p>
              </div>

              {/* Current Venue Status */}
              {currentVenue && (
                <div className="bg-[#333333] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white text-2xl font-bold">Current Venue</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-500 text-sm font-bold">Active</span>
                    </div>
                  </div>

                  <div className="bg-[#1a1a1a] rounded p-4 mb-4">
                    <div className="mb-3">
                      <span className="text-gray-400 text-sm">Venue Name:</span>
                      <p className="text-white font-bold text-lg">{currentVenue.venueName}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Room Code:</span>
                      <p className="text-white font-mono text-2xl tracking-wider">{currentVenue.roomCode}</p>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-4">
                    You're in the player pool for this venue. The venue owner can select you for games on any of their boards.
                  </p>

                  <button
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to leave ${currentVenue.venueName}?`)) return;

                      setLeavingVenue(true);
                      try {
                        const result = await leaveVenue(currentVenue.id);
                        if (result.success) {
                          setCurrentVenue(null);
                          alert('Successfully left the venue');
                        } else {
                          alert(result.error || 'Failed to leave venue');
                        }
                      } catch (error) {
                        console.error('Error leaving venue:', error);
                        alert('Failed to leave venue. Please try again.');
                      } finally {
                        setLeavingVenue(false);
                      }
                    }}
                    disabled={leavingVenue}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded transition-colors"
                  >
                    {leavingVenue ? 'Leaving...' : 'Leave Venue'}
                  </button>
                </div>
              )}

              {/* Info when not in a venue */}
              {!currentVenue && (
                <div className="bg-[#2a2a2a] rounded-lg p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-lg mb-2">Not in a Venue</p>
                  <p className="text-gray-400 text-sm">
                    Enter a room code above to join a venue's player pool
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboards Tab */}
          {activeTab === 'leaderboards' && (
            <Suspense fallback={<div className="flex items-center justify-center py-12"><p className="text-gray-400 text-lg">Loading leaderboards...</p></div>}>
              <FriendLeaderboards />
            </Suspense>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <Suspense fallback={<div className="flex items-center justify-center py-12"><p className="text-gray-400 text-lg">Loading stats...</p></div>}>
              <FriendStats />
            </Suspense>
          )}
        </main>
      </PageWrapper>
    </div>
  );
}
