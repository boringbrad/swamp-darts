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
import {
  getFriendSessions,
  joinPlayerSession,
  leavePlayerSession,
  getMyJoinedSessionId,
  PlayerSessionInfo,
} from '../lib/playerSessions';
import { STOCK_AVATARS } from '../lib/avatars';
import { useUserPresence } from '../hooks/useUserPresence';
import { getFriendsLastActivity, formatRelativeTime, FriendActivity } from '../lib/friendActivity';

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

// Lazy load QR code components to improve initial page load
const UserQRCode = lazy(() => import('../components/friends/UserQRCode'));
const QRScanner = lazy(() => import('../components/friends/QRScanner'));
const FriendLeaderboards = lazy(() => import('../components/FriendLeaderboards'));
const FriendStats = lazy(() => import('../components/FriendStats'));

type Tab = 'friends' | 'requests' | 'add' | 'qr' | 'leaderboards' | 'stats';

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
  const [friendActivity, setFriendActivity] = useState<Map<string, FriendActivity>>(new Map());
  const [friendSessions, setFriendSessions] = useState<PlayerSessionInfo[]>([]);
  const [myJoinedSessionId, setMyJoinedSessionId] = useState<string | null>(null);
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, requestsData, sentData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
        getSentFriendRequests()
      ]);
      setFriends(friendsData);
      setFriendRequests(requestsData);
      setSentRequests(sentData);

      // Load game night sessions separately — errors here must not wipe the friends list
      if (activeTab === 'friends' && friendsData.length > 0) {
        try {
          const friendUserIds = friendsData.map(f => f.userId);
          const [activity, sessions] = await Promise.all([
            getFriendsLastActivity(friendUserIds),
            getFriendSessions(friendUserIds),
          ]);
          setFriendActivity(activity);
          setFriendSessions(sessions);
          if (sessions.length > 0) {
            const joinedId = await getMyJoinedSessionId(sessions.map(s => s.id));
            setMyJoinedSessionId(joinedId);
          } else {
            setMyJoinedSessionId(null);
          }
        } catch (sessionErr) {
          console.error('Error loading game night sessions:', sessionErr);
          setFriendSessions([]);
          setMyJoinedSessionId(null);
        }
      } else if (activeTab === 'friends') {
        setFriendSessions([]);
        setMyJoinedSessionId(null);
      }

    } catch (error) {
      console.error('Error loading friends data:', error);
      // Set empty arrays on error so the UI can still render
      setFriends([]);
      setFriendRequests([]);
      setSentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (session: PlayerSessionInfo) => {
    setJoiningSessionId(session.id);
    const success = await joinPlayerSession(session.id, {
      displayName: userProfile?.displayName || '',
      avatar: userProfile?.avatar,
      photoUrl: (userProfile as any)?.photoUrl,
    });
    if (success) setMyJoinedSessionId(session.id);
    setJoiningSessionId(null);
  };

  const handleLeaveSession = async (sessionId: string) => {
    setJoiningSessionId(sessionId);
    await leavePlayerSession(sessionId);
    setMyJoinedSessionId(null);
    setJoiningSessionId(null);
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
              {/* ── GAME NIGHTS ─────────────────────────────── */}
              {friendSessions.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">Game Nights</h2>
                  <div className="space-y-3">
                    {friendSessions.map(session => {
                      const hostName = session.hostProfile.displayName || 'A friend';
                      const hostAvatarData = STOCK_AVATARS.find(a => a.id === session.hostProfile.avatar) || STOCK_AVATARS[0];
                      const isJoined = myJoinedSessionId === session.id;
                      const isLoading = joiningSessionId === session.id;
                      return (
                        <div key={session.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center gap-4">
                          {/* Host avatar */}
                          {session.hostProfile.photoUrl ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#4CAF50]/60 flex-shrink-0">
                              <img src={session.hostProfile.photoUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-[#4CAF50]/60 flex-shrink-0"
                              style={{ backgroundColor: hostAvatarData.color }}
                            >
                              {hostAvatarData.emoji}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse inline-block flex-shrink-0" />
                              <p className="text-white font-bold truncate">{hostName} is hosting</p>
                            </div>
                            <p className="text-white/40 text-xs">{timeRemaining(session.expiresAt)}</p>
                            {isJoined && (
                              <p className="text-[#4CAF50] text-xs font-bold">You're in!</p>
                            )}
                          </div>
                          {isJoined ? (
                            <button
                              onClick={() => handleLeaveSession(session.id)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-[#444] text-white/70 text-sm font-bold rounded hover:bg-[#555] transition-colors disabled:opacity-50 flex-shrink-0"
                            >
                              {isLoading ? '...' : 'LEAVE'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleJoinSession(session)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-[#4CAF50] text-white text-sm font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
                            >
                              {isLoading ? '...' : 'JOIN'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── FRIENDS LIST ────────────────────────────── */}
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
