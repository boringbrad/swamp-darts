'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import AdminPlayerStatsView from '../components/admin/AdminPlayerStatsView';
import {
  checkIsAdmin,
  getUserActivitySummary,
  getGameAnalytics,
  getGuestPlayerAnalytics,
  UserActivitySummary,
  GameAnalytics,
  GuestPlayerAnalytics,
} from '../lib/adminAnalytics';

type ViewMode = 'overview' | 'players';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const [userActivity, setUserActivity] = useState<UserActivitySummary | null>(null);
  const [gameAnalytics, setGameAnalytics] = useState<GameAnalytics | null>(null);
  const [guestAnalytics, setGuestAnalytics] = useState<GuestPlayerAnalytics | null>(null);

  // Check admin access
  useEffect(() => {
    checkIsAdmin().then(admin => {
      setIsAdmin(admin);
      if (!admin) {
        // Redirect non-admins to home
        router.push('/');
      }
    });
  }, [router]);

  // Load analytics data
  useEffect(() => {
    if (isAdmin === true) {
      loadAnalytics();
    }
  }, [isAdmin]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [users, games, guests] = await Promise.all([
        getUserActivitySummary(),
        getGameAnalytics(),
        getGuestPlayerAnalytics(),
      ]);

      setUserActivity(users);
      setGameAnalytics(games);
      setGuestAnalytics(guests);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking admin status
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-xl">Checking access...</div>
      </div>
    );
  }

  // Don't render anything for non-admins (they'll be redirected)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header title="ADMIN DASHBOARD" />

      <PageWrapper>
        <div className="h-32"></div>
        <main className="px-6 pb-6">
          {/* View Mode Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-6 py-3 font-bold rounded transition-opacity ${
                viewMode === 'overview'
                  ? 'bg-[#6b1a8b] text-white'
                  : 'bg-[#666666] text-white hover:opacity-80'
              }`}
            >
              OVERVIEW
            </button>
            <button
              onClick={() => setViewMode('players')}
              className={`px-6 py-3 font-bold rounded transition-opacity ${
                viewMode === 'players'
                  ? 'bg-[#6b1a8b] text-white'
                  : 'bg-[#666666] text-white hover:opacity-80'
              }`}
            >
              PLAYER STATS
            </button>
          </div>

          {/* Player Stats View */}
          {viewMode === 'players' && (
            <div className="bg-[#333333] rounded-lg p-6">
              <h2 className="text-white text-2xl font-bold mb-6">PLAYER STATISTICS</h2>
              <AdminPlayerStatsView />
            </div>
          )}

          {/* Overview View */}
          {viewMode === 'overview' && (
            <>
              {/* Refresh Button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={loadAnalytics}
                  disabled={loading}
                  className="px-6 py-2 bg-[#6b1a8b] text-white font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'LOADING...' : 'REFRESH DATA'}
                </button>
              </div>

              {loading ? (
                <div className="text-white text-center text-xl">Loading analytics...</div>
              ) : (
                <div className="space-y-8">
              {/* USER ACTIVITY SECTION */}
              <section className="bg-[#333333] rounded-lg p-6">
                <h2 className="text-white text-2xl font-bold mb-6">USER ACTIVITY</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <StatCard
                    label="Total Users"
                    value={userActivity?.totalUsers || 0}
                    color="blue"
                  />
                  <StatCard
                    label="Active (7 Days)"
                    value={userActivity?.activeUsersLast7Days || 0}
                    color="green"
                  />
                  <StatCard
                    label="Active (30 Days)"
                    value={userActivity?.activeUsersLast30Days || 0}
                    color="purple"
                  />
                </div>

                {/* Top Users Table */}
                <div className="overflow-x-auto">
                  <h3 className="text-white text-xl font-bold mb-4">Top Users</h3>
                  <table className="w-full text-white">
                    <thead className="bg-[#2a2a2a]">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-center">Total</th>
                        <th className="px-4 py-2 text-center">Cricket</th>
                        <th className="px-4 py-2 text-center">Golf</th>
                        <th className="px-4 py-2 text-center">Guests</th>
                        <th className="px-4 py-2 text-left">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userActivity?.topUsers.map((user, idx) => (
                        <tr key={idx} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            <div className="font-bold">{user.displayName}</div>
                            <div className="text-sm opacity-75">{user.email}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-[#4CAF50]">
                            {user.totalMatches}
                          </td>
                          <td className="px-4 py-3 text-center">{user.cricketMatches}</td>
                          <td className="px-4 py-3 text-center">{user.golfMatches}</td>
                          <td className="px-4 py-3 text-center">{user.guestsAdded}</td>
                          <td className="px-4 py-3 text-sm opacity-75">
                            {user.lastActivity !== 'Never'
                              ? new Date(user.lastActivity).toLocaleDateString()
                              : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* GAME ANALYTICS SECTION */}
              <section className="bg-[#333333] rounded-lg p-6">
                <h2 className="text-white text-2xl font-bold mb-6">GAME ANALYTICS</h2>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    label="Total Matches"
                    value={gameAnalytics?.totalMatches || 0}
                    color="blue"
                  />
                  <StatCard
                    label="Last 7 Days"
                    value={gameAnalytics?.matchesLast7Days || 0}
                    color="green"
                  />
                  <StatCard
                    label="Last 30 Days"
                    value={gameAnalytics?.matchesLast30Days || 0}
                    color="purple"
                  />
                  <StatCard
                    label="Avg Players/Game"
                    value={gameAnalytics?.averagePlayersPerGame || 0}
                    color="orange"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Cricket Modes */}
                  <div>
                    <h3 className="text-white text-xl font-bold mb-4">
                      Cricket Modes ({gameAnalytics?.cricketMatches || 0} total)
                    </h3>
                    <div className="space-y-2">
                      {gameAnalytics?.cricketModeBreakdown.map((mode, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-[#2a2a2a] px-4 py-2 rounded"
                        >
                          <span className="text-white font-bold uppercase">{mode.mode}</span>
                          <span className="text-[#4CAF50] font-bold">{mode.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Golf Modes */}
                  <div>
                    <h3 className="text-white text-xl font-bold mb-4">
                      Golf Modes ({gameAnalytics?.golfMatches || 0} total)
                    </h3>
                    <div className="space-y-2">
                      {gameAnalytics?.golfModeBreakdown.map((mode, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-[#2a2a2a] px-4 py-2 rounded"
                        >
                          <span className="text-white font-bold uppercase">{mode.mode}</span>
                          <span className="text-[#4CAF50] font-bold">{mode.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* GUEST PLAYER ANALYTICS SECTION */}
              <section className="bg-[#333333] rounded-lg p-6">
                <h2 className="text-white text-2xl font-bold mb-6">GUEST PLAYER INSIGHTS</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <StatCard
                    label="Total Guests"
                    value={guestAnalytics?.totalGuests || 0}
                    color="blue"
                  />
                  <StatCard
                    label="Active Guests"
                    value={guestAnalytics?.activeGuests || 0}
                    subtitle={`${Math.round(((guestAnalytics?.activeGuests || 0) / (guestAnalytics?.totalGuests || 1)) * 100)}% have played`}
                    color="green"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Top Guests */}
                  <div>
                    <h3 className="text-white text-xl font-bold mb-4">Most Active Guests</h3>
                    <div className="space-y-2">
                      {guestAnalytics?.topGuests.slice(0, 5).map((guest, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-[#2a2a2a] px-4 py-3 rounded"
                        >
                          <div>
                            <div className="text-white font-bold">{guest.name}</div>
                            <div className="text-sm opacity-75">Added by {guest.addedBy}</div>
                          </div>
                          <span className="text-[#4CAF50] font-bold">{guest.matchCount} games</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Users with Most Guests */}
                  <div>
                    <h3 className="text-white text-xl font-bold mb-4">Users with Most Guests</h3>
                    <div className="space-y-2">
                      {guestAnalytics?.usersWithMostGuests.slice(0, 5).map((user, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-[#2a2a2a] px-4 py-3 rounded"
                        >
                          <span className="text-white font-bold">{user.displayName}</span>
                          <span className="text-[#4CAF50] font-bold">{user.guestCount} guests</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
                </div>
              )}
            </>
          )}
        </main>
      </PageWrapper>
    </div>
  );
}

// Helper component for stat cards
function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-[#1a7a9d]',
    green: 'bg-[#2d5016]',
    purple: 'bg-[#6b1a8b]',
    orange: 'bg-[#d97706]',
  };

  return (
    <div className={`${colors[color]} rounded-lg p-6 text-center`}>
      <div className="text-white/75 text-sm font-bold mb-2">{label}</div>
      <div className="text-white text-4xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-white/60 text-xs">{subtitle}</div>}
    </div>
  );
}
